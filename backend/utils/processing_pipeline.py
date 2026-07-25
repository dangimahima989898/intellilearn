"""
Processing Pipeline for orchestrating the note chunking and embedding workflow.

Triggered as a background task when notes are uploaded or updated.
Handles: chunking → store chunks → embed → store embeddings → mark complete.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from database import SessionLocal
from models.content_chunks import ContentChunk
from models.uploaded_note import UploadedNote
from utils.embedding_service import EmbeddingService
from utils.semantic_chunker import SemanticChunker

logger = logging.getLogger(__name__)


class ProcessingPipeline:
    """Orchestrates the chunking → embedding pipeline as a background task."""

    TIMEOUT_SECONDS = 300
    MAX_RETRIES = 3

    def __init__(self, chunker: SemanticChunker, embedding_service: EmbeddingService):
        self.chunker = chunker
        self.embedding_service = embedding_service

    def _check_pgvector_extension(self, db: Session) -> bool:
        """Check if the pgvector extension is available in the database."""
        try:
            result = db.execute(
                text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            )
            return result.scalar() is not None
        except Exception as e:
            logger.error(f"Error checking pgvector extension: {e}")
            return False

    def _set_note_status(
        self,
        db: Session,
        note_id: UUID,
        status: str,
        error_detail: Optional[dict] = None,
    ) -> None:
        """Update the processing status on an UploadedNote."""
        note = db.query(UploadedNote).filter(UploadedNote.id == note_id).first()
        if note:
            note.processing_status = status
            if error_detail:
                note.processing_error = error_detail
            if status == "completed":
                note.processed_at = datetime.now(timezone.utc)
            db.commit()

    def _retry_step(self, step_name: str, func, *args, **kwargs):
        """
        Execute a function with retry logic (up to MAX_RETRIES with exponential backoff).

        Returns the result of the function on success, raises on final failure.
        """
        last_exception = None
        for attempt in range(self.MAX_RETRIES):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < self.MAX_RETRIES - 1:
                    wait_time = 2 ** attempt  # 1s, 2s, 4s
                    logger.warning(
                        f"Step '{step_name}' failed (attempt {attempt + 1}/{self.MAX_RETRIES}): {e}. "
                        f"Retrying in {wait_time}s..."
                    )
                    import time
                    time.sleep(wait_time)
                else:
                    logger.error(
                        f"Step '{step_name}' failed after {self.MAX_RETRIES} attempts: {e}"
                    )
        raise last_exception

    def _execute_pipeline(self, note_id: UUID, raw_text: str, subject_id: UUID) -> None:
        """
        Execute the full processing pipeline synchronously.

        Steps:
        1. Check pgvector extension
        2. Set status to "processing"
        3. Run semantic chunking
        4. Insert chunks into content_chunks
        5. Generate embeddings for all chunks
        6. Store embeddings on chunks, set chunk status to "completed"
        7. Set note status to "completed"
        """
        db = SessionLocal()
        try:
            # Step 0: Check pgvector extension availability
            if not self._check_pgvector_extension(db):
                error_detail = {
                    "step": "pgvector_check",
                    "error": "pgvector extension is not installed. Please install it before running the pipeline.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry_count": 0,
                }
                self._set_note_status(db, note_id, "failed", error_detail)
                return

            # Step 1: Set processing status
            self._set_note_status(db, note_id, "processing")

            # Step 2: Run semantic chunking
            try:
                chunk_results = self._retry_step(
                    "chunking", self.chunker.chunk, raw_text
                )
            except Exception as e:
                error_detail = {
                    "step": "chunking",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry_count": self.MAX_RETRIES,
                }
                self._set_note_status(db, note_id, "failed", error_detail)
                return

            # Step 3: Insert chunks into content_chunks
            try:
                db_chunks = self._retry_step(
                    "storage",
                    self._store_chunks,
                    db,
                    note_id,
                    subject_id,
                    chunk_results,
                )
            except Exception as e:
                error_detail = {
                    "step": "storage",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry_count": self.MAX_RETRIES,
                }
                self._set_note_status(db, note_id, "failed", error_detail)
                return

            # Step 4: Generate embeddings for all chunks
            chunk_texts = [cr.chunk_text for cr in chunk_results]
            try:
                embeddings = self._retry_step(
                    "embedding_generation",
                    self.embedding_service.generate_embeddings,
                    chunk_texts,
                )
            except Exception as e:
                error_detail = {
                    "step": "embedding_generation",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry_count": self.MAX_RETRIES,
                }
                self._set_note_status(db, note_id, "failed", error_detail)
                return

            # Step 5: Store embeddings on chunks
            try:
                self._retry_step(
                    "embedding_storage",
                    self._store_embeddings,
                    db,
                    db_chunks,
                    embeddings,
                )
            except Exception as e:
                error_detail = {
                    "step": "embedding_storage",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry_count": self.MAX_RETRIES,
                }
                self._set_note_status(db, note_id, "failed", error_detail)
                return

            # Step 6: Mark note as completed
            self._set_note_status(db, note_id, "completed")
            logger.info(
                f"Pipeline completed for note {note_id}: "
                f"{len(chunk_results)} chunks processed"
            )

        except Exception as e:
            # Catch-all for unexpected errors
            logger.error(f"Unexpected pipeline error for note {note_id}: {e}")
            try:
                error_detail = {
                    "step": "unknown",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry_count": 0,
                }
                self._set_note_status(db, note_id, "failed", error_detail)
            except Exception:
                pass
        finally:
            db.close()

    def _store_chunks(
        self,
        db: Session,
        note_id: UUID,
        subject_id: UUID,
        chunk_results: list,
    ) -> list:
        """Insert chunk results into the content_chunks table."""
        db_chunks = []
        for cr in chunk_results:
            chunk = ContentChunk(
                id=uuid.uuid4(),
                subject_id=subject_id,
                note_id=note_id,
                chunk_text=cr.chunk_text,
                topic_hint=cr.topic_hint,
                chunk_index=cr.chunk_index,
                processing_status="pending",
            )
            db.add(chunk)
            db_chunks.append(chunk)
        db.commit()
        return db_chunks

    def _store_embeddings(
        self,
        db: Session,
        db_chunks: list,
        embeddings: list,
    ) -> None:
        """Store generated embeddings on the corresponding chunks."""
        for chunk, embedding in zip(db_chunks, embeddings):
            if embedding is not None:
                chunk.embedding = embedding
                chunk.processing_status = "completed"
            else:
                chunk.processing_status = "failed"
        db.commit()

    def _delete_existing_chunks(self, db: Session, note_id: UUID) -> None:
        """Delete all existing chunks associated with a note."""
        db.query(ContentChunk).filter(ContentChunk.note_id == note_id).delete()
        db.commit()

    async def process_note(
        self, note_id: UUID, raw_text: str, subject_id: UUID
    ) -> None:
        """
        Full pipeline execution with 300-second timeout.

        Runs the synchronous pipeline in a thread executor wrapped
        with asyncio.wait_for() for timeout enforcement.
        """
        try:
            loop = asyncio.get_event_loop()
            await asyncio.wait_for(
                loop.run_in_executor(
                    None, self._execute_pipeline, note_id, raw_text, subject_id
                ),
                timeout=self.TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            logger.error(
                f"Pipeline timed out after {self.TIMEOUT_SECONDS}s for note {note_id}"
            )
            # Set failure status with timeout error
            db = SessionLocal()
            try:
                error_detail = {
                    "step": "timeout",
                    "error": f"Pipeline did not complete within {self.TIMEOUT_SECONDS} seconds",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry_count": 0,
                }
                self._set_note_status(db, note_id, "failed", error_detail)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Pipeline failed for note {note_id}: {e}")
            # Unexpected error at the async level
            db = SessionLocal()
            try:
                error_detail = {
                    "step": "unknown",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "retry_count": 0,
                }
                self._set_note_status(db, note_id, "failed", error_detail)
            finally:
                db.close()

    async def reprocess_note(
        self, note_id: UUID, new_raw_text: str, subject_id: UUID
    ) -> None:
        """
        Delete existing chunks for a note and re-run the full pipeline.

        Used when a note's raw_text is updated with new content.
        """
        # Delete existing chunks first
        db = SessionLocal()
        try:
            self._delete_existing_chunks(db, note_id)
        finally:
            db.close()

        # Re-run the pipeline with new text
        await self.process_note(note_id, new_raw_text, subject_id)

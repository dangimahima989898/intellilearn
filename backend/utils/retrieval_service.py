"""
Retrieval service for semantic search against the chunk store.

Performs cosine similarity search using pgvector to find the most
relevant content chunks for a given query.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from utils.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


@dataclass
class ChunkSearchResult:
    """A single chunk result from a semantic search."""

    chunk_text: str
    similarity_score: float  # rounded to 4 decimal places
    note_title: str
    unit: str
    topic_hint: str
    chunk_index: int


@dataclass
class SearchResult:
    """Aggregated search results from the retrieval service."""

    results: list[ChunkSearchResult] = field(default_factory=list)
    total: int = 0
    message: Optional[str] = None


class RetrievalService:
    """Performs cosine similarity search against the chunk store.

    Uses the EmbeddingService to generate query embeddings, then
    executes pgvector cosine similarity queries against content_chunks.
    """

    def __init__(self, embedding_service: EmbeddingService):
        """Initialize with an EmbeddingService instance.

        Args:
            embedding_service: Service used to generate query embeddings.
        """
        self._embedding_service = embedding_service

    def search(
        self,
        query: str,
        subject_id: Optional[UUID] = None,
        top_k: int = 5,
        similarity_threshold: float = 0.7,
        db: Session = None,
    ) -> SearchResult:
        """Perform semantic search against the chunk store.

        1. Validates query length (1-1000 chars)
        2. Generates query embedding via embed_query
        3. Executes pgvector cosine similarity query
        4. Filters by subject_id and similarity_threshold
        5. Returns ranked results with metadata

        Args:
            query: The search query text (1-1000 characters).
            subject_id: Optional UUID to filter results to a specific subject.
            top_k: Maximum number of results to return (default 5).
            similarity_threshold: Minimum similarity score (default 0.7).
            db: SQLAlchemy sync Session for database access.

        Returns:
            SearchResult with ranked ChunkSearchResult items.
        """
        # Validate query length
        if not query or len(query.strip()) == 0:
            return SearchResult(
                results=[],
                total=0,
                message="Query must be between 1 and 1000 characters.",
            )

        if len(query) > 1000:
            return SearchResult(
                results=[],
                total=0,
                message="Query must be between 1 and 1000 characters.",
            )

        # Generate query embedding
        try:
            query_embedding = self._embedding_service.embed_query(query.strip())
        except (ValueError, RuntimeError) as e:
            logger.error(f"Failed to generate query embedding: {e}")
            return SearchResult(
                results=[],
                total=0,
                message="Search could not be completed due to an embedding error.",
            )
        except Exception as e:
            logger.error(f"Unexpected error generating query embedding: {e}")
            return SearchResult(
                results=[],
                total=0,
                message="Search could not be completed due to an embedding error.",
            )

        # Build the SQL query with pgvector cosine similarity
        # Cosine distance operator <=> returns distance (0 = identical),
        # so similarity = 1 - distance
        query_vector_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

        # Base query joining content_chunks with uploaded_notes
        sql = """
            SELECT
                cc.chunk_text,
                cc.topic_hint,
                cc.chunk_index,
                un.title AS note_title,
                un.unit,
                1 - (cc.embedding <=> :query_vec::vector) AS similarity
            FROM content_chunks cc
            JOIN uploaded_notes un ON cc.note_id = un.id
            WHERE cc.embedding IS NOT NULL
              AND cc.processing_status = 'completed'
              AND (1 - (cc.embedding <=> :query_vec::vector)) >= :threshold
        """

        params = {
            "query_vec": query_vector_str,
            "threshold": similarity_threshold,
            "top_k": top_k,
        }

        # Filter by subject_id when provided
        if subject_id is not None:
            sql += " AND cc.subject_id = :subject_id"
            params["subject_id"] = str(subject_id)

        sql += " ORDER BY similarity DESC LIMIT :top_k"

        try:
            result = db.execute(text(sql), params)
            rows = result.fetchall()
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            return SearchResult(
                results=[],
                total=0,
                message="Search could not be completed due to a database error.",
            )

        if not rows:
            return SearchResult(
                results=[],
                total=0,
                message="No relevant content found for your query.",
            )

        # Build result list
        chunk_results = []
        for row in rows:
            chunk_results.append(
                ChunkSearchResult(
                    chunk_text=row.chunk_text,
                    similarity_score=round(float(row.similarity), 4),
                    note_title=row.note_title,
                    unit=row.unit or "",
                    topic_hint=row.topic_hint or "",
                    chunk_index=row.chunk_index or 0,
                )
            )

        return SearchResult(
            results=chunk_results,
            total=len(chunk_results),
        )

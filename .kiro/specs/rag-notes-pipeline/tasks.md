# Implementation Plan: RAG Notes Pipeline

## Overview

This implementation plan converts the RAG Notes Pipeline design into incremental coding tasks. The pipeline adds semantic search and context-aware AI responses to IntelliLearn by processing uploaded course notes through semantic chunking, generating vector embeddings via OpenAI's `text-embedding-3-small`, storing them using pgvector in PostgreSQL (Neon DB), and exposing retrieval endpoints for both standalone search and LLM-augmented chatbot responses.

## Tasks

- [x] 1. Database schema and configuration setup
  - [x] 1.1 Add pgvector dependency and extend Settings in `backend/config.py`
    - Add `sentence-transformers==3.0.1` and `numpy==1.26.4` to `backend/requirements.txt`
    - Add `embedding_model` (default: `all-MiniLM-L6-v2`) and `embedding_dimension` (default: `384`) fields to the `Settings` class
    - Add `@field_validator("embedding_dimension")` to validate range 1–4096
    - Add `EMBEDDING_MODEL` and `EMBEDDING_DIMENSION` to `.env.example`
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 1.2 Create Alembic migration to enable pgvector extension
    - Create migration file `backend/alembic/versions/xxxx_enable_pgvector_extension.py`
    - Execute `CREATE EXTENSION IF NOT EXISTS vector` in upgrade
    - Execute `DROP EXTENSION IF EXISTS vector` in downgrade
    - _Requirements: 1.1, 1.3_

  - [x] 1.3 Create Alembic migration to extend `content_chunks` table
    - Add `embedding` column of type `Vector(384)`, nullable
    - Add `note_id` column (UUID, FK to `uploaded_notes.id`, ON DELETE CASCADE), nullable, indexed
    - Add `processing_status` column (String(20), default "pending")
    - Create HNSW index on `embedding` column: `hnsw (embedding vector_cosine_ops)` with `m=16, ef_construction=64`
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 1.4 Create Alembic migration to extend `uploaded_notes` table
    - Add `processing_status` column (String(20), default "pending")
    - Add `processing_error` column (JSONB, nullable)
    - Add `processed_at` column (DateTime with timezone, nullable)
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 1.5 Update SQLAlchemy models for `ContentChunk` and `UploadedNote`
    - Update `backend/models/content_chunks.py`: add `embedding` (Vector(384)), `note_id` (UUID FK), `processing_status` columns, and `note` relationship
    - Update `backend/models/uploaded_note.py`: add `processing_status`, `processing_error` (JSONB), `processed_at` columns, and `chunks` relationship
    - Import `from pgvector.sqlalchemy import Vector`
    - _Requirements: 1.1, 1.2, 4.2, 4.3, 4.4_

- [x] 2. Implement Semantic Chunker module
  - [x] 2.1 Create `backend/utils/semantic_chunker.py` with `SemanticChunker` class
    - Define `ChunkResult` dataclass with `chunk_text`, `chunk_index`, `topic_hint`, `token_count`
    - Define `UnitSection` dataclass with `title`, `text`
    - Implement `__init__` with `min_tokens=200`, `max_tokens=800`, `overlap_tokens=50`
    - Implement `chunk(raw_text, note_title)` → `list[ChunkResult]`
    - Implement `_split_by_units(text)` detecting unit headers (Unit 1, Unit II, etc.)
    - Implement `_split_section_into_chunks(section)` with sentence-boundary splitting within token limits
    - Handle overlap of 50–100 tokens between consecutive chunks
    - Handle short text (≤200 tokens) as single chunk identity transformation
    - Handle single sentence >800 tokens as its own chunk
    - Assign `topic_hint` from nearest heading (max 200 chars), default to "General"
    - Assign zero-based sequential `chunk_index`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 2.2 Write property test: Chunk token count invariant
    - **Property 1: Chunk token count invariant**
    - **Validates: Requirements 2.1, 2.3**
    - Create `backend/tests/test_chunker_properties.py`
    - Use Hypothesis `@given` with text strategies generating >200 tokens
    - Assert each chunk has 200–800 tokens (except single-sentence oversized chunks)

  - [ ]* 2.3 Write property test: Sentence boundary termination
    - **Property 2: Sentence boundary termination**
    - **Validates: Requirements 2.2**
    - Assert chunk text ends at sentence boundary (., ?, !) except oversized chunks

  - [ ]* 2.4 Write property test: Consecutive chunk overlap
    - **Property 3: Consecutive chunk overlap**
    - **Validates: Requirements 2.4**
    - Assert trailing 50–100 tokens of chunk N appear as leading tokens of chunk N+1

  - [ ]* 2.5 Write property test: Unit boundary integrity
    - **Property 4: Unit boundary integrity**
    - **Validates: Requirements 2.5**
    - Assert no chunk spans two different unit sections

  - [ ]* 2.6 Write property test: Chunk metadata invariants
    - **Property 5: Chunk metadata invariants**
    - **Validates: Requirements 2.6, 2.8**
    - Assert `topic_hint` length 1–200, `chunk_index` is zero-based consecutive

  - [ ]* 2.7 Write property test: Short text single-chunk preservation
    - **Property 6: Short text single-chunk preservation**
    - **Validates: Requirements 2.9**
    - Assert text ≤200 tokens produces exactly one chunk equal to input

  - [ ]* 2.8 Write property test: Pipeline idempotency
    - **Property 9: Pipeline idempotency**
    - **Validates: Requirements 4.7**
    - Assert running chunker twice on same input produces identical results

- [x] 3. Implement Embedding Service
  - [x] 3.1 Create `backend/utils/embedding_service.py` with `EmbeddingService` class
    - Implement `__init__` loading local `sentence-transformers` model (all-MiniLM-L6-v2)
    - Implement `generate_embeddings(texts: list[str]) -> list[Optional[list[float]]]` using model.encode()
    - Process texts in batches (local model, no API rate limits)
    - No retry logic needed (local model, no network calls)
    - Handle chunks exceeding model's 256-token limit (truncate to fit)
    - Implement `embed_query(query: str) -> list[float]`
    - Implement `_normalize_vector(vector) -> list[float]` (L2 norm = 1.0)
    - Implement `is_available` property (always True since local model)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.1, 8.4, 8.5, 8.6_

  - [ ]* 3.2 Write property test: Embedding batch size constraint
    - **Property 7: Embedding batch size constraint**
    - **Validates: Requirements 3.2**
    - Create `backend/tests/test_embedding_properties.py`
    - Mock OpenAI API, assert ceil(N/100) calls for N chunks

  - [ ]* 3.3 Write property test: Vector normalization
    - **Property 8: Vector normalization**
    - **Validates: Requirements 3.6**
    - Assert L2 norm of every produced vector equals 1.0 ± 0.0001

- [x] 4. Implement Processing Pipeline orchestration
  - [x] 4.1 Create `backend/utils/processing_pipeline.py` with `ProcessingPipeline` class
    - Implement `__init__` accepting `SemanticChunker` and `EmbeddingService` instances
    - Implement `async process_note(note_id, raw_text)` with full pipeline:
      - Set `processing_status = "processing"` on UploadedNote
      - Run semantic chunking
      - Insert chunks into content_chunks with note_id and subject_id
      - Generate embeddings in batches
      - Store embeddings on chunks, set chunk status to "completed"
      - Set note `processing_status = "completed"`, set `processed_at`
    - Implement `async reprocess_note(note_id, new_raw_text)` — delete existing chunks then re-run
    - Implement 300-second timeout via `asyncio.wait_for()`
    - Implement retry logic (3 retries per step with exponential backoff)
    - On failure: set `processing_status = "failed"`, persist error detail JSONB `{step, error, timestamp}`
    - Check pgvector extension availability at pipeline start
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 1.3_

  - [x] 4.2 Integrate pipeline trigger into note upload flow
    - Modify `backend/routers/notes.py` upload endpoint to trigger `ProcessingPipeline.process_note()` as a FastAPI `BackgroundTasks` task when `raw_text` has at least 1 non-whitespace character
    - On note update (raw_text changed), trigger `reprocess_note()`
    - _Requirements: 4.1, 4.6_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Retrieval Service and RAG Search endpoint
  - [x] 6.1 Create `backend/utils/retrieval_service.py` with `RetrievalService` class
    - Implement `__init__` accepting `EmbeddingService` instance
    - Implement `async search(query, subject_id, top_k, similarity_threshold, offset, limit, db)` → `SearchResult`
    - Generate query embedding via `embed_query`
    - Execute pgvector cosine similarity query: `ORDER BY embedding <=> query_vector LIMIT top_k`
    - Filter by `subject_id` when provided
    - Filter by `similarity_threshold` (default 0.7)
    - Return `ChunkSearchResult` with chunk_text, similarity_score (4 decimals), note_title, unit, topic_hint, chunk_index
    - Return empty results with message when no matches
    - Validate query length (1–1000 chars)
    - Handle embedding failure after retries: return error response
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 6.2 Create `backend/routers/rag.py` with RAG search endpoint
    - Define `SearchRequest` schema (query, subject_id, top_k, similarity_threshold, offset, limit)
    - Define `ChunkResultResponse` and `SearchResponse` schemas
    - Implement `POST /rag/search` endpoint
    - Add JWT auth via `require_student` dependency
    - Enforce enrollment-based access: only return chunks from enrolled subjects
    - Return 403 if student requests non-enrolled subject
    - Target 2-second response time (leveraging HNSW index)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.3 Register RAG router in `backend/main.py`
    - Import `rag` router from `routers`
    - Add `app.include_router(rag_router.router)` with appropriate prefix/tags
    - _Requirements: 7.1_

  - [ ]* 6.4 Write property test: Retrieval result filtering
    - **Property 10: Retrieval result filtering**
    - **Validates: Requirements 5.3, 5.4**
    - Create `backend/tests/test_retrieval_properties.py`
    - Assert all results belong to specified subject and have score >= threshold

  - [ ]* 6.5 Write property test: Retrieval result ordering and cardinality
    - **Property 11: Retrieval result ordering and cardinality**
    - **Validates: Requirements 5.2**
    - Assert results count <= top_k and ordered by descending similarity

  - [ ]* 6.6 Write property test: Query length validation
    - **Property 12: Query length validation**
    - **Validates: Requirements 5.7**
    - Assert empty or >1000 char queries are rejected with validation error

- [x] 7. Implement RAG-Enhanced Chatbot Integration
  - [x] 7.1 Extend `backend/routers/chatbot.py` with RAG context injection
    - Import `RetrievalService` and `EmbeddingService`
    - In the `/chat` endpoint, call `RetrievalService.search()` with student message and subject context
    - Filter retrieved chunks: only inject those with similarity >= 0.75
    - Limit to max 5 chunks and max 3000 tokens of context
    - Inject chunks into system prompt as grounding context with citation instructions
    - Add 5-second timeout on retrieval call; fall back to general chatbot on timeout/error
    - Preserve all existing features: rate limiting, flagging, history, language detection, confidence, suggestions
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8_

  - [x] 7.2 Add citation support to chatbot response
    - Define `CitationItem` schema (note_title, unit)
    - Define `ChatResponseWithCitations` extending `ChatResponse` with optional `citations` list
    - Extract citations from retrieved chunks and include in response
    - Omit citations when falling back to general chatbot
    - _Requirements: 6.3, 6.4_

  - [ ]* 7.3 Write property test: RAG context injection constraints
    - **Property 13: RAG context injection constraints**
    - **Validates: Requirements 6.2, 6.7**
    - Create `backend/tests/test_rag_chatbot_properties.py`
    - Assert only chunks with score >= 0.75 injected, max 5 chunks, max 3000 tokens

  - [ ]* 7.4 Write property test: Enrollment-based access control
    - **Property 14: Enrollment-based access control**
    - **Validates: Requirements 7.3**
    - Assert results only contain chunks from enrolled subjects

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Integration tests and final wiring
  - [ ]* 9.1 Write integration tests for the processing pipeline
    - Create `backend/tests/test_pipeline_integration.py`
    - Test end-to-end: upload note → chunks created → embeddings stored
    - Test reprocess: update raw_text → old chunks deleted → new chunks created
    - Test timeout handling (mock slow embedding)
    - Test failure state transitions (pending → processing → failed with error detail)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 9.2 Write integration tests for search and chatbot RAG
    - Create `backend/tests/test_rag_integration.py`
    - Test search endpoint: authenticated request → correct results
    - Test enrollment filtering: non-enrolled subject → 403
    - Test chatbot RAG: message with subject → retrieval → cited response
    - Test fallback: retrieval unavailable → general chatbot (no citations)
    - Test cascade deletion: delete note → chunks removed
    - _Requirements: 5.1, 5.3, 6.1, 6.4, 6.5, 6.6, 7.3, 7.4_

  - [x] 9.3 Add `hypothesis==6.98.0` to test dependencies
    - Update `backend/requirements.txt` (or create `backend/requirements-dev.txt`) with `hypothesis==6.98.0`
    - Ensure test configuration in `pytest.ini` or `pyproject.toml` includes test paths
    - _Requirements: Testing infrastructure_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using Hypothesis
- Unit tests validate specific examples and edge cases
- The project uses Python with FastAPI, SQLAlchemy, PostgreSQL (Neon DB), and pgvector
- All new utility modules go in `backend/utils/`, new routers in `backend/routers/`
- Alembic migrations follow existing convention in `backend/alembic/versions/`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5"] },
    { "id": 3, "tasks": ["2.1", "3.1"] },
    { "id": 4, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "3.2", "3.3"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2", "6.3"] },
    { "id": 9, "tasks": ["6.4", "6.5", "6.6", "7.1"] },
    { "id": 10, "tasks": ["7.2"] },
    { "id": 11, "tasks": ["7.3", "7.4"] },
    { "id": 12, "tasks": ["9.1", "9.2", "9.3"] }
  ]
}
```

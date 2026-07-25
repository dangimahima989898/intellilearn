# Requirements Document

## Introduction

The RAG (Retrieval-Augmented Generation) Notes Pipeline adds semantic search and context-aware AI responses to IntelliLearn. Currently, the chatbot answers student questions using only its general knowledge and a hardcoded system prompt. This feature bridges the gap by generating vector embeddings from uploaded course notes, storing them for efficient retrieval, and injecting relevant note chunks as context into the LLM prompt — enabling students to ask questions about their actual course materials and receive accurate, cited answers.

## Glossary

- **Embedding_Service**: The backend service responsible for generating vector embeddings from text chunks using an embedding model API (OpenAI text-embedding-3-small or equivalent).
- **Chunk_Store**: The PostgreSQL table (extended `content_chunks`) that stores text chunks along with their vector embeddings using the pgvector extension.
- **Semantic_Chunker**: The module that splits extracted note text into semantically coherent chunks suitable for embedding, using sentence-boundary and topic-shift detection rather than fixed-size splitting.
- **Retrieval_Service**: The backend service that accepts a natural-language query, generates a query embedding, and performs a cosine similarity search against the Chunk_Store to return the top-k most relevant chunks.
- **RAG_Chatbot**: The enhanced chatbot endpoint that retrieves relevant chunks from the Retrieval_Service and injects them as grounding context into the LLM prompt before generating a response.
- **Embedding_Vector**: A fixed-dimension floating-point array (1536 dimensions for OpenAI text-embedding-3-small) representing the semantic meaning of a text chunk.
- **Cosine_Similarity**: A distance metric measuring the angular similarity between two Embedding_Vectors, ranging from -1 to 1, where 1 indicates identical semantic meaning.
- **Processing_Pipeline**: The end-to-end workflow triggered when a note is uploaded: text extraction → cleaning → semantic chunking → embedding generation → storage in Chunk_Store.
- **Citation**: A reference in the RAG_Chatbot response that identifies the source note (title, unit) from which a retrieved chunk originated.

## Requirements

### Requirement 1: Embedding Column and pgvector Setup

**User Story:** As a system administrator, I want the database schema to support vector storage, so that embeddings can be stored alongside content chunks without requiring an external vector database.

#### Acceptance Criteria

1. THE Chunk_Store SHALL include an `embedding` column of type `vector(1536)` using the pgvector PostgreSQL extension, where the column is nullable to allow chunks to exist before embeddings are generated.
2. THE Chunk_Store SHALL include a `note_id` column of type UUID referencing the `uploaded_notes` table with ON DELETE CASCADE to remove associated chunks when a note is deleted.
3. WHEN the Processing_Pipeline starts, IF the pgvector extension is not enabled on the database, THEN THE Processing_Pipeline SHALL raise an error indicating that the pgvector extension must be installed and SHALL NOT proceed with any embedding operations.
4. THE Chunk_Store SHALL include an HNSW vector index on the `embedding` column using cosine distance to enable similarity search across stored embeddings.
5. WHEN a chunk is inserted with an `embedding` value, THE Chunk_Store SHALL accept only vectors of exactly 1536 dimensions and reject any vector of a different dimension count.

### Requirement 2: Semantic Chunking of Notes

**User Story:** As a student, I want my uploaded notes to be split into meaningful segments, so that the AI can retrieve the most relevant section when I ask a question.

#### Acceptance Criteria

1. WHEN an UploadedNote has its `raw_text` field populated with more than 200 tokens, THE Semantic_Chunker SHALL split the text into chunks of 200 to 800 tokens each, where tokens are defined as whitespace-separated words.
2. WHILE splitting text into chunks, THE Semantic_Chunker SHALL end each chunk at the last sentence boundary (period, question mark, or exclamation mark followed by whitespace) that falls within the 200–800 token range.
3. IF a single sentence exceeds 800 tokens, THEN THE Semantic_Chunker SHALL place that sentence in its own chunk without further splitting.
4. THE Semantic_Chunker SHALL include an overlap of 50 to 100 tokens between consecutive chunks to preserve cross-boundary context.
5. WHEN the source text contains unit headers (e.g., "Unit 1", "Unit II", "Unit III", "Unit IV", "Unit V"), THE Semantic_Chunker SHALL use unit boundaries as primary split points before applying token-based splitting within each unit.
6. THE Semantic_Chunker SHALL assign a `topic_hint` of at most 200 characters to each chunk derived from the nearest preceding heading or unit title in the source text.
7. IF no heading or unit title precedes a chunk, THEN THE Semantic_Chunker SHALL assign the `topic_hint` value "General" to that chunk.
8. THE Semantic_Chunker SHALL preserve the `chunk_index` ordering as a zero-based sequential integer so that chunks can be reassembled in their original sequence.
9. IF an UploadedNote has its `raw_text` field populated with 200 tokens or fewer, THEN THE Semantic_Chunker SHALL store the entire text as a single chunk without splitting.

### Requirement 3: Embedding Generation

**User Story:** As a student, I want embeddings generated automatically when my notes are processed, so that I can search them semantically without extra steps.

#### Acceptance Criteria

1. WHEN the Semantic_Chunker produces a new set of chunks for a note, THE Embedding_Service SHALL generate a 384-dimensional Embedding_Vector for each chunk using the local `sentence-transformers` model (`all-MiniLM-L6-v2`).
2. THE Embedding_Service SHALL process chunks in batches of up to 100 to minimize API round-trips.
3. IF the OpenAI embedding API call fails for a batch, THEN THE Embedding_Service SHALL retry up to 3 times with exponential backoff starting at 1 second and doubling each attempt (1 s, 2 s, 4 s) before marking each chunk in the batch with a processing status of "failed".
4. IF a batch contains chunks that exceed the model's 8191-token input limit, THEN THE Embedding_Service SHALL mark those individual chunks with a processing status of "failed" and continue processing the remaining chunks in the batch.
5. WHEN an embedding is successfully generated, THE Embedding_Service SHALL store the Embedding_Vector in the Chunk_Store `embedding` column alongside the corresponding chunk and set the chunk's processing status to "completed".
6. THE Embedding_Service SHALL normalize all Embedding_Vectors to unit length (L2 norm equal to 1.0 within a tolerance of ±0.0001) before storage.
7. WHEN the Semantic_Chunker produces updated chunks for an existing note, THE Embedding_Service SHALL replace all previously stored Embedding_Vectors for that note with newly generated vectors for the updated chunks.

### Requirement 4: Processing Pipeline Orchestration

**User Story:** As a faculty member, I want the full pipeline (chunking → embedding) to run automatically when I upload notes, so that content is searchable without manual intervention.

#### Acceptance Criteria

1. WHEN an UploadedNote record is created with a `raw_text` field containing at least 1 non-whitespace character, THE Processing_Pipeline SHALL trigger the Semantic_Chunker followed by the Embedding_Service as a background task.
2. WHILE the Processing_Pipeline is executing, THE Processing_Pipeline SHALL set a `processing_status` field on the UploadedNote to `"processing"` before beginning the first pipeline step.
3. WHEN the Processing_Pipeline completes successfully, THE Processing_Pipeline SHALL set `processing_status` to `"completed"` and store the resulting chunks in the Chunk_Store linked to the originating UploadedNote.
4. IF any step of the Processing_Pipeline fails after a maximum of 3 retry attempts, THEN THE Processing_Pipeline SHALL set `processing_status` to `"failed"` and persist an error detail record containing the failed step name, the error description, and a timestamp.
5. IF the Processing_Pipeline does not complete within 300 seconds of being triggered, THEN THE Processing_Pipeline SHALL abort execution, set `processing_status` to `"failed"`, and persist an error detail record indicating a timeout.
6. WHEN a note's `raw_text` field is updated with new content (differing from the previously processed value), THE Processing_Pipeline SHALL delete all existing chunks associated with that UploadedNote and re-run the full pipeline from the chunking step.
7. THE Processing_Pipeline SHALL be idempotent — running the pipeline twice on the same unchanged `raw_text` SHALL produce an identical set of chunks (same count, same text content, same ordering) in the Chunk_Store.

### Requirement 5: Semantic Retrieval Endpoint

**User Story:** As a student, I want to search my course notes by meaning rather than exact keywords, so that I can find relevant content even when I phrase my question differently from the notes.

#### Acceptance Criteria

1. WHEN a student submits a query of 1 to 1000 characters to the Retrieval_Service, THE Retrieval_Service SHALL generate an Embedding_Vector for the query text using the same embedding model as the Processing_Pipeline.
2. THE Retrieval_Service SHALL perform a Cosine_Similarity search against the Chunk_Store and return the top-k most similar chunks, where k is configurable between 1 and 20 (default k=5).
3. THE Retrieval_Service SHALL accept an optional `subject_id` filter to restrict search results to chunks belonging to a specific subject.
4. THE Retrieval_Service SHALL accept an optional `similarity_threshold` parameter with a value between 0.0 and 1.0 (default 0.7) and exclude chunks with a Cosine_Similarity score below this threshold from results.
5. THE Retrieval_Service SHALL return each result with the chunk text, similarity score (rounded to 4 decimal places), source note title, topic_hint, and chunk_index.
6. WHEN no chunks meet the similarity threshold, THE Retrieval_Service SHALL return an empty result set with a message indicating no relevant content was found.
7. IF the query text is empty or exceeds 1000 characters, THEN THE Retrieval_Service SHALL reject the request with an error response indicating the query length constraint.
8. IF the Embedding_Service fails to generate an Embedding_Vector for the query after up to 3 retries, THEN THE Retrieval_Service SHALL return an error response indicating that the search could not be completed and preserve no partial results.

### Requirement 6: RAG-Enhanced Chatbot Integration

**User Story:** As a student, I want the AI tutor to answer questions using my actual course notes, so that I get accurate, curriculum-specific explanations with source references.

#### Acceptance Criteria

1. WHEN a student sends a message to the RAG_Chatbot with a subject context (the subject code identifying an enrolled subject), THE RAG_Chatbot SHALL call the Retrieval_Service to find the top 5 most relevant chunks for that subject.
2. WHEN relevant chunks are retrieved with a similarity score >= 0.75, THE RAG_Chatbot SHALL inject those chunk texts into the LLM system prompt as grounding context, limited to a maximum of 5 chunks.
3. WHEN the RAG_Chatbot constructs the LLM prompt with grounding context, THE RAG_Chatbot SHALL instruct the LLM to base its answer on the provided context and reference the source note title and unit for each piece of information used.
4. WHEN the RAG_Chatbot provides an answer grounded in retrieved chunks, THE RAG_Chatbot SHALL include a citations list in the response, where each citation contains the source note title and the unit name from which the referenced chunk originated.
5. IF no chunks meet the similarity threshold of 0.75 for the query, THEN THE RAG_Chatbot SHALL fall back to the existing general-knowledge chatbot behavior and omit the citations list from the response.
6. IF the Retrieval_Service is unavailable or returns an error within 5 seconds, THEN THE RAG_Chatbot SHALL fall back to the existing general-knowledge chatbot behavior without citations and without surfacing the error to the student.
7. THE RAG_Chatbot SHALL limit injected context to a maximum of 3000 tokens to stay within LLM context window limits.
8. THE RAG_Chatbot SHALL preserve all existing chatbot features: rate limiting (20 requests per hour), answer flagging, chat history persistence, language detection, confidence scoring, and suggested topic generation.

### Requirement 7: Retrieval API for Direct Semantic Search

**User Story:** As a student, I want a standalone search endpoint to find relevant note passages, so that I can browse matching content independently of the chatbot.

#### Acceptance Criteria

1. THE Retrieval_Service SHALL expose a REST endpoint (`POST /rag/search`) that accepts a JSON body with a required `query` string field, an optional `subject_id` UUID field, an optional `top_k` integer field (range 1–20, default 5), and optional `offset` and `limit` integer fields for pagination.
2. WHEN a student calls the search endpoint, THE Retrieval_Service SHALL return results within 2 seconds for a corpus of up to 10,000 chunks.
3. THE Retrieval_Service SHALL require authentication via the existing JWT-based `get_current_user` dependency and only return chunks from subjects the student is enrolled in.
4. IF a student requests chunks from a subject they are not enrolled in, THEN THE Retrieval_Service SHALL return a 403 Forbidden response.
5. THE Retrieval_Service SHALL return a JSON response containing a `results` array (each item with chunk_text, similarity_score, note_title, unit, topic_hint, chunk_index) and a `total` count of matching chunks above the similarity threshold.

### Requirement 8: Embedding Configuration and Provider Flexibility

**User Story:** As a system administrator, I want to configure the embedding model and parameters, so that I can switch providers or adjust dimensions without code changes.

#### Acceptance Criteria

1. THE Embedding_Service SHALL read the embedding model name from an environment variable (`EMBEDDING_MODEL`, default: `all-MiniLM-L6-v2`).
2. THE Embedding_Service SHALL read the embedding dimension from an environment variable (`EMBEDDING_DIMENSION`, default: `384`) and validate that the value is a positive integer between 1 and 4096.
3. IF the `EMBEDDING_DIMENSION` value is not a positive integer within the range 1 to 4096, THEN THE Embedding_Service SHALL fail to start and log an error message indicating the invalid dimension value.
4. THE Embedding_Service SHALL read the API key for the embedding provider from the existing `OPENAI_API_KEY` environment variable.
5. IF the `OPENAI_API_KEY` environment variable is missing or empty at startup, THEN THE Embedding_Service SHALL log a warning message indicating that embedding functionality is unavailable and disable all embedding operations until a valid key is configured.
6. WHEN the application starts, THE Embedding_Service SHALL use the configured `EMBEDDING_MODEL` and `EMBEDDING_DIMENSION` values for all new embedding operations without requiring code changes or redeployment.
7. WHEN the embedding model or dimension configuration changes between application restarts, THE Processing_Pipeline SHALL require a manual re-embedding of all existing chunks and SHALL NOT automatically re-embed previously stored chunks on startup.

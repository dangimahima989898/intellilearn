"""
Embedding service using sentence-transformers for local vector generation.

Uses the all-MiniLM-L6-v2 model (384 dimensions) loaded locally.
No API calls or network dependencies required.
"""

import logging
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer

from config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generates vector embeddings using a local sentence-transformers model.

    The model is loaded once and reused for all embedding operations.
    Uses a singleton pattern to avoid loading the model multiple times.
    """

    _instance: Optional["EmbeddingService"] = None
    _model: Optional[SentenceTransformer] = None

    def __new__(cls, model: Optional[str] = None, dimension: Optional[int] = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model: Optional[str] = None, dimension: Optional[int] = None):
        if self._initialized:
            return

        self._model_name = model or settings.embedding_model
        self._dimension = dimension or settings.embedding_dimension

        logger.info(
            f"Loading sentence-transformers model: {self._model_name} "
            f"(dimension={self._dimension})"
        )
        self._model = SentenceTransformer(self._model_name)
        # Set max sequence length to 256 tokens as per model spec
        self._model.max_seq_length = 256
        self._initialized = True
        logger.info(f"Model {self._model_name} loaded successfully")

    def generate_embeddings(self, texts: list[str]) -> list[Optional[list[float]]]:
        """Generate embeddings for a batch of texts.

        The model processes all texts locally in a single call.
        Texts exceeding the model's 256-token limit are automatically
        truncated by sentence-transformers.

        Args:
            texts: List of text strings to embed.

        Returns:
            List of embedding vectors (list[float]) for each text.
            Returns None for any text that fails to embed.
        """
        if not texts:
            return []

        results: list[Optional[list[float]]] = []

        try:
            # sentence-transformers handles batching internally
            # and truncates texts exceeding max_seq_length automatically
            embeddings = self._model.encode(
                texts,
                show_progress_bar=False,
                normalize_embeddings=False,  # We normalize manually for control
            )

            for embedding in embeddings:
                normalized = self._normalize_vector(embedding)
                results.append(normalized)

        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            # Return None for all texts in the failed batch
            results = [None] * len(texts)

        return results

    def embed_query(self, query: str) -> list[float]:
        """Generate an embedding for a single query string.

        Convenience method for search queries.

        Args:
            query: The query text to embed.

        Returns:
            Normalized embedding vector as list[float].

        Raises:
            ValueError: If the query is empty.
            RuntimeError: If embedding generation fails.
        """
        if not query or not query.strip():
            raise ValueError("Query text cannot be empty")

        embedding = self._model.encode(
            query,
            show_progress_bar=False,
            normalize_embeddings=False,
        )

        return self._normalize_vector(embedding)

    def _normalize_vector(self, vector) -> list[float]:
        """Normalize a vector to unit length (L2 norm = 1.0).

        Args:
            vector: Input vector (numpy array or list).

        Returns:
            Normalized vector as list[float] with L2 norm of 1.0.
        """
        vec = np.array(vector, dtype=np.float64)
        norm = np.linalg.norm(vec)

        if norm == 0:
            # Zero vector cannot be normalized; return as-is
            logger.warning("Attempted to normalize a zero vector")
            return vec.tolist()

        normalized = vec / norm
        return normalized.tolist()

    @property
    def is_available(self) -> bool:
        """Check if the embedding service is available.

        Always returns True since the model runs locally
        with no external dependencies.
        """
        return True

    @property
    def model_name(self) -> str:
        """Return the configured model name."""
        return self._model_name

    @property
    def dimension(self) -> int:
        """Return the configured embedding dimension."""
        return self._dimension

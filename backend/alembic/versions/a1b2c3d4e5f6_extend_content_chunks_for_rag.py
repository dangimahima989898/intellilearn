"""extend_content_chunks_for_rag

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-06-20 10:05:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add embedding, note_id, and processing_status columns to content_chunks.
    
    Creates an HNSW index on the embedding column for fast cosine similarity search.
    """
    # Add embedding column using raw SQL (Alembic doesn't natively support vector type)
    op.execute("ALTER TABLE content_chunks ADD COLUMN embedding vector(384)")

    # Add note_id column with FK to uploaded_notes
    op.add_column(
        "content_chunks",
        sa.Column(
            "note_id",
            UUID(as_uuid=True),
            sa.ForeignKey("uploaded_notes.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index("ix_content_chunks_note_id", "content_chunks", ["note_id"])

    # Add processing_status column
    op.add_column(
        "content_chunks",
        sa.Column("processing_status", sa.String(20), server_default="pending"),
    )

    # Create HNSW index on embedding column for cosine similarity search
    op.execute(
        """
        CREATE INDEX ix_content_chunks_embedding_hnsw
        ON content_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
        """
    )


def downgrade() -> None:
    """Remove the HNSW index and the three new columns."""
    # Drop the HNSW index
    op.execute("DROP INDEX IF EXISTS ix_content_chunks_embedding_hnsw")

    # Drop columns in reverse order
    op.drop_column("content_chunks", "processing_status")
    op.drop_index("ix_content_chunks_note_id", table_name="content_chunks")
    op.drop_column("content_chunks", "note_id")
    op.drop_column("content_chunks", "embedding")

"""extend_uploaded_notes_for_rag

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-20 11:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add RAG processing columns to uploaded_notes table."""
    op.add_column(
        'uploaded_notes',
        sa.Column('processing_status', sa.String(20), server_default='pending', nullable=False)
    )
    op.add_column(
        'uploaded_notes',
        sa.Column('processing_error', postgresql.JSONB, nullable=True)
    )
    op.add_column(
        'uploaded_notes',
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    """Remove RAG processing columns from uploaded_notes table."""
    op.drop_column('uploaded_notes', 'processed_at')
    op.drop_column('uploaded_notes', 'processing_error')
    op.drop_column('uploaded_notes', 'processing_status')

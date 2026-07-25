"""add archived_items and exam_schedules

Revision ID: e1c2a3b4c5d6
Revises: 540543bfcb79
Create Date: 2026-06-14 22:46:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1c2a3b4c5d6'
down_revision: Union[str, None] = '540543bfcb79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create archived_items table
    op.create_table(
        'archived_items',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('item_id', sa.UUID(), nullable=False),
        sa.Column('item_type', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('archived_by', sa.UUID(), nullable=True),
        sa.Column('archived_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('original_data', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['archived_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_archived_items_item_id', 'archived_items', ['item_id'], unique=False)
    op.create_index('ix_archived_items_item_type', 'archived_items', ['item_type'], unique=False)

    # Create exam_schedules table
    op.create_table(
        'exam_schedules',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('subject_id', sa.UUID(), nullable=False),
        sa.Column('semester_id', sa.UUID(), nullable=False),
        sa.Column('exam_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('room', sa.String(length=50), nullable=False),
        sa.Column('total_marks', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['semester_id'], ['semesters.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('exam_schedules')
    op.drop_index('ix_archived_items_item_type', table_name='archived_items')
    op.drop_index('ix_archived_items_item_id', table_name='archived_items')
    op.drop_table('archived_items')

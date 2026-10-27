"""Add original product photo and source references without replacing inventory."""
from alembic import op
import sqlalchemy as sa

revision = 'c42a109f8d13'
down_revision = 'b87509ab215d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('products', sa.Column('image_url', sa.String(500), nullable=True))
    op.add_column('products', sa.Column('source_url', sa.String(500), nullable=True))


def downgrade():
    op.drop_column('products', 'source_url')
    op.drop_column('products', 'image_url')

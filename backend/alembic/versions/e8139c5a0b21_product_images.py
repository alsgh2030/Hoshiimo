"""Persist image bytes and link existing/uploaded images to products."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import LONGBLOB

revision = 'e8139c5a0b21'
down_revision = 'c42a109f8d13'
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    if 'images' not in inspector.get_table_names():
        op.create_table('images',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('filename', sa.String(255), nullable=False),
            sa.Column('data', sa.LargeBinary().with_variant(LONGBLOB(), 'mysql'), nullable=False))
    columns = {c['name'] for c in sa.inspect(op.get_bind()).get_columns('images')}
    with op.batch_alter_table('images') as batch:
        if 'product_id' not in columns:
            batch.add_column(sa.Column('product_id', sa.Integer(), nullable=True))
            batch.create_foreign_key('fk_images_product_id_products', 'products', ['product_id'], ['id'], ondelete='SET NULL')
            batch.create_unique_constraint('uq_images_product_id', ['product_id'])
        if 'content_type' not in columns:
            batch.add_column(sa.Column('content_type', sa.String(100), nullable=True))


def downgrade():
    # Keep existing image bytes, including pre-migration uploads.
    with op.batch_alter_table('images') as batch:
        batch.drop_constraint('uq_images_product_id', type_='unique')
        batch.drop_constraint('fk_images_product_id_products', type_='foreignkey')
        batch.drop_column('product_id')
        batch.drop_column('content_type')

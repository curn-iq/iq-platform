"""Permite varios ejemplares visibles de un mismo componente."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "83c69df42a19"
down_revision = "517b4ce2f6a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "item_components", sa.Column("additional_placements", JSONB(), nullable=True)
    )
    op.create_check_constraint(
        "valid_additional_placements",
        "item_components",
        "additional_placements IS NULL OR "
        "(position_x_m IS NOT NULL AND jsonb_typeof(additional_placements) = 'array')",
    )


def downgrade() -> None:
    op.drop_constraint("valid_additional_placements", "item_components", type_="check")
    op.drop_column("item_components", "additional_placements")

"""Añade la posición métrica opcional de cada componente de la mesa."""

import sqlalchemy as sa
from alembic import op

revision = "517b4ce2f6a0"
down_revision = "3c1110e5e121"
branch_labels = None
depends_on = None
COLUMNS = ("position_x_m", "position_z_m", "yaw_deg")


def upgrade() -> None:
    for name in COLUMNS:
        op.add_column("item_components", sa.Column(name, sa.Float(), nullable=True))
    op.create_check_constraint(
        "valid_component_placement",
        "item_components",
        "num_nonnulls(position_x_m, position_z_m, yaw_deg) IN (0, 3) AND "
        "(yaw_deg IS NULL OR (instrument_id IS NOT NULL AND "
        "yaw_deg BETWEEN -180 AND 180 AND abs(position_x_m) < 10 AND "
        "abs(position_z_m) < 10))",
    )


def downgrade() -> None:
    op.drop_constraint("valid_component_placement", "item_components", type_="check")
    for name in reversed(COLUMNS):
        op.drop_column("item_components", name)

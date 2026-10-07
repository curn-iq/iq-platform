"""quitar autoaprobacion y agregar fuente

Revision ID: 80ca4b548995
Revises: ce52016a7bd1
Create Date: 2026-10-07 11:23:29.906657

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "80ca4b548995"
down_revision: str | Sequence[str] | None = "ce52016a7bd1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """El revisor publica lo suyo (decisión del 2026-10-06) y cada versión guarda su fuente."""
    op.drop_constraint(
        op.f("ck_TecnicaVersion_sin_autoaprobacion"), "TecnicaVersion", type_="check"
    )
    op.add_column("TecnicaVersion", sa.Column("fuente", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("TecnicaVersion", "fuente")
    op.create_check_constraint(
        op.f("ck_TecnicaVersion_sin_autoaprobacion"),
        "TecnicaVersion",
        "revisado_por <> creado_por",
    )

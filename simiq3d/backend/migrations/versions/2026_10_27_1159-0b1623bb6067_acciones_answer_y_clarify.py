"""acciones answer y clarify

Revision ID: 0b1623bb6067
Revises: 9fcb4543305b
Create Date: 2026-10-27 11:59:08.614183

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0b1623bb6067"
down_revision: str | Sequence[str] | None = "9fcb4543305b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


OLD = (
    "show_technique",
    "highlight_instrument",
    "describe_instrument",
    "show_clinical_data",
    "list_instruments",
    "no_answer",
)


def upgrade() -> None:
    """El chat responde también en texto sin cambiar la escena (answer) y pide
    precisar (clarify). Alembic no detecta valores nuevos de un enum: van a mano."""
    op.execute("ALTER TYPE chat_action ADD VALUE IF NOT EXISTS 'answer'")
    op.execute("ALTER TYPE chat_action ADD VALUE IF NOT EXISTS 'clarify'")


def downgrade() -> None:
    """PostgreSQL no borra valores de un enum: se recrea el tipo sin ellos, y lo
    que quedó registrado con ellos pasa a no_answer."""
    op.execute(
        "UPDATE chat_logs SET action = 'no_answer' WHERE action IN ('answer', 'clarify')"
    )
    op.drop_constraint("ck_chat_logs_field_only_for_clinical_data", "chat_logs")
    op.execute("ALTER TYPE chat_action RENAME TO chat_action_old")
    values = ", ".join(f"'{v}'" for v in OLD)
    op.execute(f"CREATE TYPE chat_action AS ENUM ({values})")
    op.execute(
        "ALTER TABLE chat_logs ALTER COLUMN action TYPE chat_action "
        "USING action::text::chat_action"
    )
    op.execute("DROP TYPE chat_action_old")
    op.create_check_constraint(
        "ck_chat_logs_field_only_for_clinical_data",
        "chat_logs",
        "(field IS NOT NULL) = (action = 'show_clinical_data')",
    )

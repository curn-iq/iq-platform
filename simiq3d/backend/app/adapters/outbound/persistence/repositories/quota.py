import hashlib
import hmac
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Una sola sentencia: sirve con varias instancias de Vercel a la vez, sin
# carreras. Si la ventana ya pasó, el contador vuelve a 1.
_TAKE = text(
    """
    INSERT INTO chat_quota (account_key, window_start, questions)
    VALUES (:key, now(), 1)
    ON CONFLICT (account_key) DO UPDATE SET
        questions = CASE
            WHEN chat_quota.window_start < now() - make_interval(secs => :window)
            THEN 1 ELSE chat_quota.questions + 1 END,
        window_start = CASE
            WHEN chat_quota.window_start < now() - make_interval(secs => :window)
            THEN now() ELSE chat_quota.window_start END
    RETURNING questions
    """
)
# Las filas de quien no pregunta hace un día se borran: no se guarda más de lo
# que el tope necesita.
_FORGET = text("DELETE FROM chat_quota WHERE window_start < now() - interval '1 day'")


class SQLAlchemyChatQuota:
    def __init__(
        self, session: AsyncSession, secret: str, max_questions: int, window: int
    ) -> None:
        self._session = session
        self._secret = secret.encode()
        self._max = max_questions
        self._window = window

    def _key(self, account_id: UUID) -> str:
        return hmac.new(self._secret, account_id.bytes, hashlib.sha256).hexdigest()

    async def take(self, account_id: UUID) -> bool:
        count = await self._session.scalar(
            _TAKE, {"key": self._key(account_id), "window": self._window}
        )
        await self._session.execute(_FORGET)
        await self._session.commit()
        return count <= self._max

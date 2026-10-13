from uuid import UUID

from fastapi import APIRouter, Request, Response
from pydantic import TypeAdapter

from app.adapters.inbound.api.cache import respond_with_cache
from app.adapters.inbound.api.dependencies import CurrentAccount, UserRepo
from app.adapters.inbound.api.schemas import AccountOut, RoleIn
from app.domain.errors import Conflict
from app.domain.users import Role, require_role

router = APIRouter(prefix="/users", tags=["Usuarios y roles"])

account_list = TypeAdapter(list[AccountOut])


@router.get("", response_model=list[AccountOut])
async def list_users(
    request: Request, users: UserRepo, account: CurrentAccount
) -> Response:
    """Todas las cuentas con su rol. Solo admin."""
    require_role(account.role, Role.admin)
    accounts = await users.list_all()
    body = account_list.dump_json([AccountOut.model_validate(c) for c in accounts])
    return respond_with_cache(request, body, max_age=0, private=True)


@router.patch("/{user_id}/role", response_model=AccountOut)
async def change_role(
    user_id: UUID, data: RoleIn, users: UserRepo, account: CurrentAccount
):
    """Asigna el rol de una cuenta. Solo admin, y no sobre su propia cuenta (así
    nunca se queda la plataforma sin admin por error)."""
    require_role(account.role, Role.admin)
    if user_id == account.id:
        raise Conflict("No puedes cambiar tu propio rol")
    return await users.change_role(user_id, data.role)

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Request, Response, status
from pydantic import TypeAdapter

from app.adapters.inbound.api.cache import respond_with_cache
from app.adapters.inbound.api.dependencies import CurrentAccount, VersionRepo
from app.adapters.inbound.api.schemas import (
    ContentIn,
    RejectionIn,
    VersionDetailOut,
    VersionSummaryOut,
)
from app.domain.errors import Conflict, Forbidden, NotFound
from app.domain.techniques import (
    IN_PROGRESS,
    VersionState,
    VersionSummary,
    validate_content,
    validate_publishing,
    validate_transition,
)
from app.domain.users import Account, Role, has_at_least, require_role

router = APIRouter(prefix="/versions", tags=["Versiones"])

version_list = TypeAdapter(list[VersionSummaryOut])


async def _get_version(versions: VersionRepo, version_id: UUID) -> VersionSummary:
    summary = await versions.get_summary(version_id)
    if summary is None:
        raise NotFound("La versión no existe")
    return summary


def _require_author(version: VersionSummary, account: Account) -> None:
    require_role(account.role, Role.contributor)
    if version.created_by != account.id:
        raise Forbidden("Solo quien creó la versión puede hacer esto")


@router.get("", response_model=list[VersionSummaryOut])
async def list_versions(
    request: Request,
    versions: VersionRepo,
    account: CurrentAccount,
    state: Annotated[list[VersionState] | None, Query()] = None,
    mine: bool = False,
) -> Response:
    """Versiones por estado (por defecto, las en curso), de la más reciente a la
    más vieja. Un colaborador solo ve las suyas; un revisor ve todas, o solo las
    suyas con `mine=true`."""
    require_role(account.role, Role.contributor)
    only_mine = mine or not has_at_least(account.role, Role.reviewer)
    found = await versions.list_all(
        state or IN_PROGRESS, created_by=account.id if only_mine else None
    )
    body = version_list.dump_json([VersionSummaryOut.model_validate(v) for v in found])
    return respond_with_cache(request, body, max_age=0, private=True)


@router.get("/{version_id}", response_model=VersionDetailOut)
async def get_version(
    request: Request, version_id: UUID, versions: VersionRepo, account: CurrentAccount
) -> Response:
    """Una versión con todo su contenido y sus rechazos. Un colaborador solo ve
    las suyas; un revisor ve cualquiera."""
    require_role(account.role, Role.contributor)
    detail = await versions.get(version_id)
    if detail is None:
        raise NotFound("La versión no existe")
    if not has_at_least(account.role, Role.reviewer):
        _require_author(detail.summary, account)
    body = VersionDetailOut.model_validate(detail).model_dump_json().encode()
    return respond_with_cache(request, body, max_age=0, private=True)


@router.put("/{version_id}", response_model=VersionDetailOut)
async def update_version(
    version_id: UUID,
    content: ContentIn,
    versions: VersionRepo,
    account: CurrentAccount,
):
    """Reemplaza todo el contenido de un borrador propio (el editor lo manda
    completo en cada guardado)."""
    _require_author(await _get_version(versions, version_id), account)
    new_ = content.to_domain()
    validate_content(new_)
    await versions.replace_content(version_id, new_)
    return await versions.get(version_id)


async def _change_state(
    versions: VersionRepo,
    version: VersionSummary,
    to_state: VersionState,
    reviewer: Account | None = None,
) -> None:
    validate_transition(version.state, to_state)
    await versions.change_state(
        version.id, version.state, to_state, reviewer.id if reviewer else None
    )


@router.post("/{version_id}/submit", status_code=status.HTTP_204_NO_CONTENT)
async def submit_for_review(
    version_id: UUID, versions: VersionRepo, account: CurrentAccount
) -> None:
    """Manda un borrador propio a revisión."""
    version = await _get_version(versions, version_id)
    _require_author(version, account)
    await _change_state(versions, version, VersionState.in_review)


@router.post("/{version_id}/publish", status_code=status.HTTP_204_NO_CONTENT)
async def publish_directly(
    version_id: UUID, versions: VersionRepo, account: CurrentAccount
) -> None:
    """Un revisor o un admin publica su propio borrador sin pasar por revisión.
    La versión publicada que hubiera pasa a reemplazada."""
    version = await _get_version(versions, version_id)
    _require_author(version, account)
    validate_publishing(account.role)
    if version.state != VersionState.draft:
        raise Conflict("Solo se publica directo un borrador")
    await _change_state(versions, version, VersionState.published, account)


@router.post("/{version_id}/approve", status_code=status.HTTP_204_NO_CONTENT)
async def approve(
    version_id: UUID, versions: VersionRepo, account: CurrentAccount
) -> None:
    """Un revisor o un admin aprueba una versión en revisión y queda publicada.
    Si otro revisor ya la decidió, responde 409."""
    validate_publishing(account.role)
    version = await _get_version(versions, version_id)
    if version.state != VersionState.in_review:
        raise Conflict("Solo se aprueba una versión en revisión")
    await _change_state(versions, version, VersionState.published, account)


@router.post("/{version_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject(
    version_id: UUID,
    data: RejectionIn,
    versions: VersionRepo,
    account: CurrentAccount,
) -> None:
    """Un revisor o un admin devuelve una versión en revisión a borrador, con el
    motivo. Si otro revisor ya la decidió, responde 409."""
    validate_publishing(account.role)
    version = await _get_version(versions, version_id)
    validate_transition(version.state, VersionState.draft)
    await versions.reject(version_id, account.id, data.reason)

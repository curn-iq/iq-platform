from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import TypeAdapter

from app.adapters.inbound.api.cache import respond_with_cache
from app.adapters.inbound.api.dependencies import (
    CurrentAccount,
    TechniqueRepo,
    VersionRepo,
    get_technique_repository,
)
from app.adapters.inbound.api.schemas import (
    TechniqueCreateIn,
    TechniqueInstrumentsOut,
    TechniquePublicOut,
    TechniqueSummaryOut,
    VersionDetailOut,
)
from app.domain.errors import Conflict, NotFound
from app.domain.techniques import TechniqueDetail, VersionState, validate_transition
from app.domain.users import Role, require_role
from app.ports.techniques import TechniqueRepository

router = APIRouter(prefix="/techniques", tags=["Técnicas"])

summary_list = TypeAdapter(list[TechniqueSummaryOut])


@router.get("", response_model=list[TechniqueSummaryOut])
async def list_techniques(
    request: Request,
    repository: Annotated[TechniqueRepository, Depends(get_technique_repository)],
) -> Response:
    """Tecnicas publicadas, ordenadas por nombre. Es publico: no pide cuenta."""
    techniques = await repository.list_published()
    body = summary_list.dump_json(
        [TechniqueSummaryOut.model_validate(t) for t in techniques]
    )
    return respond_with_cache(request, body, max_age=60)


async def _published(techniques: TechniqueRepo, technique_id: UUID) -> TechniqueDetail:
    detail = await techniques.get_published(technique_id)
    if detail is None:
        raise NotFound("La técnica no existe o no está publicada")
    return detail


@router.get("/{technique_id}", response_model=TechniquePublicOut)
async def get_technique(
    request: Request, technique_id: UUID, techniques: TechniqueRepo
) -> Response:
    """Datos clínicos de la versión publicada. Es público: no pide cuenta."""
    detail = await _published(techniques, technique_id)
    body = TechniquePublicOut.model_validate(detail).model_dump_json().encode()
    return respond_with_cache(request, body, max_age=60)


@router.get("/{technique_id}/instruments", response_model=TechniqueInstrumentsOut)
async def get_technique_instruments(
    request: Request,
    technique_id: UUID,
    techniques: TechniqueRepo,
    account: CurrentAccount,
) -> Response:
    """Objetos con su mesa y celdas, suturas, equipos y dispositivos. Pide cuenta."""
    detail = await _published(techniques, technique_id)
    body = TechniqueInstrumentsOut.model_validate(detail).model_dump_json().encode()
    return respond_with_cache(request, body, max_age=60, private=True)


@router.post(
    "",
    response_model=VersionDetailOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_technique(
    data: TechniqueCreateIn, versions: VersionRepo, account: CurrentAccount
):
    """Crea una técnica nueva con su versión 1 vacía, en borrador. Desde colaborador."""
    require_role(account.role, Role.contributor)
    version_id = await versions.create_technique(
        data.name, data.specialty_id, account.id
    )
    return await versions.get(version_id)


@router.post(
    "/{technique_id}/versions",
    response_model=VersionDetailOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_version(
    technique_id: UUID, versions: VersionRepo, account: CurrentAccount
):
    """Empieza a editar una técnica publicada: copia la versión publicada en una
    versión nueva en borrador. Desde colaborador."""
    require_role(account.role, Role.contributor)
    version_id = await versions.create_from_published(technique_id, account.id)
    return await versions.get(version_id)


@router.post("/{technique_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
async def archive_technique(
    technique_id: UUID, versions: VersionRepo, account: CurrentAccount
) -> None:
    """Retira la técnica: su versión publicada pasa a archivada. Desde revisor.

    No se puede mientras tenga una versión en curso (borrador o en revisión).
    """
    require_role(account.role, Role.reviewer)
    published = await versions.get_published_of(technique_id)
    if published is None:
        raise NotFound("La técnica no existe o no está publicada")
    if await versions.has_version_in_progress(technique_id):
        raise Conflict("La técnica tiene una versión en curso")
    validate_transition(published.state, VersionState.archived)
    await versions.change_state(
        published.id, VersionState.published, VersionState.archived
    )

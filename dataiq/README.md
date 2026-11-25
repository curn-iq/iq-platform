<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../design/brand/modules/dataiq-dark.svg">
    <img src="../design/brand/modules/dataiq.svg" alt="DataIQ" width="225">
  </picture>
</p>

El catálogo de técnicas quirúrgicas de IQ Platform: especialidades, técnicas,
instrumental normalizado, suturas, equipos y las mesas de Mayo y de reserva con
cada objeto en su lugar. Es la fuente única de los datos del ecosistema: SIVRI
y SIMIQ3D la consultan por su API.

## Qué hace

- **Consulta:** el catálogo y los datos clínicos de cada técnica son públicos;
  el instrumental y las mesas piden una cuenta gratuita.
- **Gestión con revisión:** un colaborador escribe una versión nueva de una
  técnica y un revisor la aprueba o la rechaza; solo la versión publicada llega
  a los estudiantes, a SIVRI y a SIMIQ3D.
- **Cuentas y sesiones de todo el ecosistema:** DataIQ registra las cuentas,
  asigna los roles (usuario, colaborador, revisor, admin) y emite las sesiones
  que validan los demás módulos.
- **Shell de navegación:** la app web de DataIQ es también la entrada a la
  plataforma (inicio, catálogo, cuenta y enlaces a SIMIQ3D y SIVRI).

## Partes

| Carpeta | Qué es |
|---|---|
| [`backend/`](backend/README.md) | La API (FastAPI): catálogo, versiones, cuentas y sesiones |
| [`frontend/`](frontend/README.md) | La app web (Angular): el shell y DataIQ |
| [`docs/`](docs/) | Esquema de la base, catálogo, frontend por dentro y checklists |

## Documentación

- Esquema de la base: [`docs/esquema.dbml`](docs/esquema.dbml) (formato DBML,
  se puede pegar en [dbdiagram.io](https://dbdiagram.io/d/69fe17cd54a51d93d3d377a9)).
- De dónde salen las mesas y cómo se publican: [`docs/catalogo.md`](docs/catalogo.md).
- El frontend por dentro: [`docs/frontend.md`](docs/frontend.md).
- Avance: [`docs/checklist-backend.md`](docs/checklist-backend.md) y
  [`docs/checklist-frontend.md`](docs/checklist-frontend.md).
- Roles y flujos de todo el ecosistema: [`../docs/flujos.md`](../docs/flujos.md).

## Licencia

[MIT](../LICENSE).

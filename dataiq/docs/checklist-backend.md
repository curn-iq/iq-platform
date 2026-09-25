# Checklist — Backend DataIQ

Avance del backend de DataIQ. Se marca cada pieza al terminarla.

Meta del Corte 2 (mediados de octubre, según la Planificación del Módulo 2):
base de datos, backend hexagonal, CRUD, autenticación y dataset cargado.

## Base del proyecto

- [x] Proyecto Python con `uv` (Python 3.14)
- [x] Dependencias base: FastAPI, SQLAlchemy async, asyncpg, Alembic, pydantic-settings
- [x] `.gitignore` en la raíz
- [x] Estructura hexagonal (`dominio/`, `puertos/`, `adaptadores/entrada|salida`)
- [x] Configuración con `pydantic-settings` + `.env.example`
- [x] PostgreSQL 17 local en contenedor (Podman)
- [x] Conexión async (`base_datos.py`) con `naming_convention`
- [x] Ruff (formato + lint)

## Modelos SQLAlchemy (según `esquema.dbml`)

- [x] Tablas simples: `Especialidad`, `Zona`, `CategoriaInstrumental`, `EquipoBiomedico`, `DispositivoMedico`
- [ ] `Sutura` (UNIQUE compuesto con `NULLS NOT DISTINCT`)
- [ ] `Usuario` (enum `rol_usuario`, campos de consentimiento)
- [ ] `Instrumental` (con `descripcion`, sin imagen), `InstrumentalAlias`, `Tecnica` (FK)
- [ ] `TecnicaVersion` (enum `estado_version`, CHECKs, índices únicos parciales)
- [ ] `ItemTecnica` (`zona_id`, CHECK `numero_con_mesa`), `ItemTecnicaComponente` (CHECK `num_nonnulls`)
- [ ] `PosicionMesa` (FK compuesta de 3 columnas)
- [ ] Tablas intermedias de `TecnicaVersion` (PK compuesta)

## Migraciones

- [ ] Configurar Alembic en modo async
- [ ] Primera migración y comparación contra `esquema.dbml`

## Pendiente (orden por definir)

- [ ] Dominio: entidades y reglas (transiciones de estado de versión)
- [ ] Puertos y repositorios
- [ ] Endpoints de lectura (con `Cache-Control`/`ETag`) y `/catalogo/completo`
- [ ] Autenticación: JWT asimétrico (RS256/EdDSA) + JWKS, Argon2id
- [ ] Completar el catálogo con los objetos de los arreglos de mesa (antes del seed)
- [ ] Script de carga inicial (seed): catálogo normalizado + técnicas
- [ ] Documentación Swagger de la API
- [ ] Tests
- [ ] Dockerfile, CI/CD (GitHub Actions → ghcr.io → Cloud Run), Neon

## Datos de la fuente que no se cargan por ahora

Criterio: se carga lo que está completo en los documentos fuente. Lo que no se
puede cargar sin suponer datos queda fuera de la carga inicial y anotado aquí.
Lista parcial: la revisión completa se hace mesa por mesa al transcribir las
posiciones.

| Técnica | Qué no cuadra en la fuente | Qué no se carga |
|---|---|---|
| Mastectomía, Cesárea, Ooforectomía con salpingectomía | La mesa de reserva usa letras (A, B, a, c, E) sin significado definido | Mesa de reserva |
| Hemicolectomía (las dos) | Mesa de Mayo: el número 4 lo reclaman dos objetos y el 9 no aparece en la grilla. La de Cirugía General tiene además una segunda mesa sin identificar | Arreglos |
| Colecistectomía | Mesa de reserva: 12 números en la grilla y 11 objetos en la leyenda | Mesa de reserva |
| Prostatectomía laparoscópica | Mesa de reserva: 14 números en la grilla y 13 objetos en la leyenda | Mesa de reserva |
| Ureterolitotomía endoscópica, Prostatectomía, Histerectomía vaginal, Colporrafia anterior y posterior, Reemplazo total de cadera, Reemplazo total de rodilla | El arreglo no indica si es mesa de Mayo o de reserva | Arreglo |
| Histerectomía laparoscópica | Un arreglo sin mesa identificada y otro "Mayo tiempo abdominal" (por tiempo quirúrgico) | Arreglos |
| Nefrectomía laparoscópica | No tiene arreglo de mesa | Posiciones (se carga el listado) |

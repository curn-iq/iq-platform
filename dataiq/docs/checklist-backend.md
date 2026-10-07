# Checklist — Backend DataIQ

Avance del backend de DataIQ. Se marca cada pieza al terminarla.

Meta del Corte 2 (12 de octubre, según la Planificación del Módulo 2):
base de datos, backend hexagonal, CRUD, autenticación y dataset cargado.

## Base del proyecto

- [x] Proyecto Python con `uv` (Python 3.14)
- [x] Dependencias base: FastAPI, SQLAlchemy async, asyncpg, Alembic, pydantic-settings
- [x] `.gitignore` en la raíz
- [x] Estructura hexagonal (`dominio/`, `puertos/`, `adaptadores/entrada|salida`)
- [x] Configuración con `pydantic-settings` + `.env.example`
- [x] PostgreSQL local en contenedor (Podman)
- [x] Conexión async (`base_datos.py`) con `naming_convention`
- [x] Ruff (formato + lint)
- [x] Pasar el contenedor local a PostgreSQL 18 (lo exige `uuidv7()`)
- [x] Ids UUIDv7 en los modelos ya escritos

## Modelos SQLAlchemy (según `esquema.dbml`)

- [x] Tablas simples: `Especialidad`, `Zona`, `CategoriaInstrumental`, `EquipoBiomedico`, `DispositivoMedico`
- [x] `Sutura` (UNIQUE compuesto con `NULLS NOT DISTINCT`)
- [x] `Usuario` (enum `rol_usuario`, campos de consentimiento)
- [x] `Instrumental` (con `descripcion`, sin imagen), `InstrumentalAlias`, `Tecnica` (FK)
- [x] `TecnicaVersion` (enum `estado_version`, CHECKs, índices únicos parciales)
- [x] `ItemTecnica` (`zona_id`, CHECK `numero_con_mesa`), `ItemTecnicaComponente` (CHECK `num_nonnulls`)
- [x] `PosicionMesa` (FK compuesta de 3 columnas)
- [x] Tablas intermedias de `TecnicaVersion` (PK compuesta)

## Migraciones

- [x] Configurar Alembic en modo async
- [x] Primera migración y comparación contra `esquema.dbml`

## Siguientes piezas (en este orden)

Cada pieza lleva sus tests al hacerla; no hay una etapa de tests al final.

1. [x] Dominio: reglas del versionado (transiciones de estado; solo un revisor o un admin publica)
2. [x] Puertos y repositorios
3. [ ] Endpoints de lectura (con `Cache-Control`/`ETag`) y `/catalogo/completo`
4. [ ] Endpoints de escritura:
   - Técnicas: crear borrador, editar el borrador, enviar a revisión, aprobar
     y rechazar
   - [x] Tabla `RechazoVersion`: al rechazar se guarda quién, por qué y cuándo
     (el motivo es obligatorio) y la versión vuelve a borrador
   - Aprobar y rechazar solo si la versión sigue `en_revision`
     (`UPDATE ... WHERE estado = 'en_revision'`); si no cambió ninguna fila,
     otro revisor ya la decidió: responder 409
   - Instrumental: crear y editar, sin borrar, solo admin o revisor (editarlo
     cambia las técnicas publicadas que lo usan sin pasar por revisión)
5. [ ] Autenticación: JWT asimétrico (RS256/EdDSA) + JWKS, Argon2id
6. [x] Datos: completar el catálogo con los objetos de los arreglos de mesa y
   transcribir las posiciones a fila/columna (en paralelo con 1–5, empezando
   por la mesa de Mayo de Tiroidectomía)
7. [x] Script de carga inicial (seed): catálogo normalizado + técnicas
8. [ ] Revisar y completar la documentación Swagger
9. [ ] Dockerfile, CI/CD (GitHub Actions → ghcr.io → Cloud Run), Neon (Corte 3)

## Datos de la fuente que no se cargan por ahora

Criterio: se carga lo que está completo en los documentos fuente. Lo que no se
puede cargar sin suponer datos queda fuera de la carga inicial y anotado aquí.
Criterios para los arreglos sin nombre:

- Un arreglo sin nombre, en una técnica que no tiene mesa de reserva, se toma
  como mesa de Mayo.
- Si el dibujo trae un recuadro chico dentro de uno grande (Histerectomía
  vaginal, Colporrafia, Reemplazo total de cadera y de rodilla), el chico es
  la mesa de Mayo y el resto la de reserva. Así lo indica el contenido: el
  recuadro chico tiene el instrumental de las mesas de Mayo que IQ sí nombra
  (por ejemplo, la de Cesárea y la de Ooforectomía), y el resto tiene lo de sus
  mesas de reserva (compresa con sutura y portaagujas, pinza Foerster,
  riñonera, instrumental sobrante).
- Si la técnica ya tiene una mesa de Mayo con nombre, el otro arreglo sin
  nombre es la de reserva (Histerectomía laparoscópica).

| Técnica | Qué no cuadra en la fuente | Qué no se carga |
|---|---|---|
| Mastectomía | Mesa de Mayo, número 8: "Mb 4 h.b 2º" no dice qué hoja de bisturí es | Ese objeto |
| Mastectomía, Cesárea, Ooforectomía con salpingectomía | La mesa de reserva usa letras (A, B, a, c, E) sin significado definido | Mesa de reserva |
| Hemicolectomía (las dos) | Mesa de Mayo: el número 4 lo reclaman dos objetos y el 9 no aparece en la grilla. La de Cirugía General tiene además una segunda mesa sin identificar, a la que le falta el 7 | Arreglos |
| Colecistectomía | Mesa de reserva: 12 números en la grilla y 11 objetos en la leyenda | Mesa de reserva |
| Prostatectomía laparoscópica | Mesa de reserva: la leyenda tiene 13 objetos; la grilla llega hasta el 14 y le falta el 8 | Mesa de reserva |
| Histerectomía laparoscópica | "Mayo tiempo abdominal": 10 números en la grilla y 9 objetos en la leyenda | Mesa de Mayo |
| Nefrectomía laparoscópica | No tiene arreglo de mesa | Posiciones (se carga el listado) |
| Cistolitotomía endoscópica | Mesa de reserva: el número 3 dice "elementos" sin decir cuáles y el número 4 no dice qué evacuador | Esos dos objetos |

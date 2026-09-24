# DataIQ

Plataforma y dataset estructurado de técnicas quirúrgicas: catálogo de
instrumental normalizado, especialidades, técnicas y posiciones de mesa.
Es la fuente única de verdad del ecosistema: SIVRI y SIMIQ3D consumen su API.

## Stack

- Backend: Python + FastAPI
- Base de datos: PostgreSQL
- Autenticación: JWT + Argon2id
- Arquitectura: hexagonal (dominio / puertos / adaptadores)
- Frontend: por definir (se decide con los mockups)

## Esquema de datos

[`docs/esquema.dbml`](docs/esquema.dbml) — formato DBML, se puede pegar
directamente en [dbdiagram.io](https://dbdiagram.io/d/69fe17cd54a51d93d3d377a9).

## Estructura

```
dataiq/
├── backend/
├── frontend/
└── docs/
```

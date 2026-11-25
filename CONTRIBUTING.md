# Cómo contribuir

Cómo se trabaja en el repositorio de IQ Platform. Qué es el proyecto y cómo se
corre: [`README.md`](README.md).

## Ramas y pull requests

- `main` es producción: todo entra por un pull request a `main`, con el CI en
  verde. No hay rama `dev`.
- Una rama corta por tema (`feat/sivri-umbral-por-instrumento`,
  `docs/checklists-al-dia`); un PR es una funcionalidad terminada y puede
  tener varios commits.
- **El título del PR es lo que aparece en el release**: que diga qué cambia,
  en español (p. ej. «feat(dataiq): editor de mesas con arrastrar y soltar»,
  no «cambios»). La descripción lleva el detalle: qué cambia, por qué y cómo
  se comprobó.
- Cada cambio se documenta en su único lugar, en el mismo PR del código (tabla
  «Dónde vive cada cosa» de [`CLAUDE.md`](CLAUDE.md)); los demás documentos
  enlazan, no copian.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/es/) en español, con
el módulo como alcance: `feat(dataiq): …`, `fix(sivri): …`,
`docs(simiq3d): …`. Cada commit compila y pasa las pruebas por sí solo.

## Idioma

En el código, la base de datos, la API y el frontend, los nombres van en
inglés. Los comentarios, los mensajes de error, la interfaz, las URL y la
documentación, en español.

## Pruebas y estilo

Las pruebas de los backends necesitan su PostgreSQL local corriendo
(`podman start dataiq-db`, `simiq3d-db` o `sivri-db`).

| Dónde | Pruebas | Estilo |
|---|---|---|
| `dataiq/backend` | `uv run pytest` | `uv run ruff format . && uv run ruff check .` |
| `simiq3d/backend`, `sivri/backend` | `uv run pytest` | `uv run ruff check . && uv run ruff format --check .` |
| `dataiq/frontend`, `simiq3d/frontend`, `sivri/frontend` | `npm test` | `npm run build` (con los presupuestos de `angular.json`) |

Tras cambiar una ruta o un esquema del backend de DataIQ, regenerar los tipos
del frontend con `npm run api:types` en `dataiq/frontend`: el CI falla si no
coinciden.

## Diseño

Las pantallas se diseñan en el
[Figma del proyecto](https://www.figma.com/design/jHEduZTQNBs4CCJEWB8u5v/) y el
sistema de diseño está en [`design/README.md`](design/README.md). Quién manda
en qué: [`.claude/rules/design.md`](.claude/rules/design.md).

## Releases

1. **Una vez por semana** se publica un release con lo que entró desde el
   anterior (si no entró nada, no se publica), y otro al cerrar cada corte.
   Lo publica una sola persona: Releases → *Draft a new release* → *Choose a
   tag*: el siguiente nombre (`corte-3.2`, `corte-3.3`…; al cerrar el corte,
   `corte-3`) sobre `main` → *Generate release notes* → una línea de resumen
   arriba → *Publish release*.
2. Para enterarse sin que nadie avise: en el repositorio, *Watch* → *Custom* →
   *Releases* → *Apply*. Cada release llega por correo.

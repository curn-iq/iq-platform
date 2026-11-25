---
paths:
  - "design/**"
  - "shared/design/**"
  - "**/src/styles/**"
---

# Método de diseño

Aplica a todo el diseño visual del ecosistema: el shell, las pantallas de
DataIQ y las de cada módulo.

## Dónde se diseña

**Las pantallas se diseñan en el
[Figma del proyecto](https://www.figma.com/design/jHEduZTQNBs4CCJEWB8u5v/)**,
donde Juan Caraballo hizo los mockups de SIVRI y de la página «Nosotros» con
mejor resultado que los mockups en código. En el repositorio no se hacen
mockups y no se diseña directamente en la app: el frontend implementa lo que ya
está aprobado en Figma.

Los mockups anteriores, hechos en HTML, siguen publicados en el
[Artifact de los mockups](https://claude.ai/artifact/C6U12G8i7EMtfREt8YnTiK)
como registro; no se actualizan.

## Quién manda en qué

Para que Figma y el repositorio no se
contradigan:

| Qué | Dónde manda |
|---|---|
| Cómo se ve cada pantalla: composición, contenido y estados | Figma |
| El sistema: tokens, tipografía, componentes y reglas | [`design/README.md`](../../design/README.md) |
| Los valores de los tokens | [`design/tokens.yaml`](../../design/tokens.yaml); en el código, `shared/design/tokens.css`, que coincide con él |

- **Si un diseño de Figma trae algo que el sistema no tiene** (un color, una
  medida, un componente), primero se agrega a `design/README.md` (y a
  `design/tokens.yaml` y `tokens.css` si es un token) y después se programa. Si contradice una regla
  del sistema, se resuelve con quien diseñó antes de programar; no se copia
  el valor de Figma directo al código.
- **Toda decisión visual nueva se anota en `design/README.md`** en la misma
  sesión en que se toma; no se repite en otros archivos.

## Reglas

- **Antes de tocar una pantalla**, leer «Producto» en el
  [README](../../README.md#para-quién) (a quién sirve, principios), su diseño en
  Figma y `design/README.md` (el mundo visual y «La web pública»).
- **El mundo es uno solo**: colores, cuadrícula de 24 px, tipografía y
  componentes salen de `design/README.md`.
- **Datos reales**: técnicas, instrumental y mesas salen del dataset de
  DataIQ (regla 1 de `CLAUDE.md`). Lo que la fuente no trae se marca (p. ej.
  «sin arreglo disponible»), nunca se rellena.
- **Voz impersonal y en español** («Ver técnica», «Crear cuenta gratis»).
- Pensado para computador y celular por igual.
- **La marca** (imagotipo, favicon y logos de los módulos) vive en
  `design/brand/`; las copias que sirve DataIQ, en `dataiq/frontend/public/marca/`.

## Al implementar en Angular

Skills del proyecto para el frontend (`.claude/skills/`, versionadas en
`skills-lock.json`), cada una con su alcance:

| Skill | Para qué |
|---|---|
| `angular-developer` (oficial de Angular) | El código de Angular: signals, formularios, rutas, accesibilidad, pruebas; corre `ng build` al terminar |
| `frontend-design` (Anthropic, plugin) | Mantener la identidad visual al llevar el diseño de Figma al código |
| `responsive-design` (wshobson) | Mobile-first, puntos de quiebre por contenido, container queries, tipografía fluida, objetivos táctiles de 44 px |
| `web-design-guidelines` (Vercel) | Revisar lo hecho contra más de 100 reglas de accesibilidad, rendimiento y UX; trae las reglas de GitHub en cada revisión |
| `threejs` (claudekit-skills) | El visor 3D: escena, cámara, GLTF, interacción táctil y rendimiento |

Ninguna manda sobre el proyecto: si una sugiere otra cosa (Tailwind, shadcn,
colores fuera de los tokens), gana `design/README.md`. Las apps son Angular con SCSS y
`shared/design/tokens.css`.

## Verificar

Capturas de la pantalla implementada en escritorio (1310 px) y celular
(390 px), con el navegador sin ventana lanzado como pide la regla 7 de
`CLAUDE.md`, y comparadas con su diseño en Figma. Una pantalla con WebGL
(SIMIQ3D) se captura por DevTools con `--use-angle=swiftshader
--enable-unsafe-swiftshader`. Las capturas no se versionan.

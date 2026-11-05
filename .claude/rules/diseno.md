---
paths:
  - "diseno/**"
  - "PRODUCT.md"
  - "DESIGN.md"
  - ".impeccable/**"
---

# Método de diseño (mockups)

Aplica a todo el trabajo de diseño visual del ecosistema: el shell, las
pantallas de DataIQ y las de cada módulo (SIMIQ3D desde el 2026-10-20). Donde
una pantalla muestra otro módulo sin ser suya, lo hace con vistas ilustrativas
marcadas como tales.

## Antes de tocar una pantalla

1. Leer `PRODUCT.md` (a quién sirve, qué promete, principios) y `DESIGN.md`
   (el mundo visual: tokens, tipografía, componentes, reglas).
2. Si la pantalla ya tiene brief, leerlo: `.impeccable/surfaces/<archivo>.md`.
   Ahí está el contrato de dirección (tesis, primera pantalla, forma).
3. Trabajar con la skill `impeccable` (plugin de impeccable.style). Una
   pantalla nueva pasa por su flujo de trabajo nuevo y queda con su propio
   brief; una corrección sobre algo existente respeta lo que ya dice
   `DESIGN.md`.

## Reglas

- **Un archivo por pantalla**: `diseno/mockups/<pantalla>.html`, HTML y CSS
  autocontenidos. Fuentes solo de Google Fonts; nada de otras dependencias,
  salvo Three.js (versión fija, desde cdn.jsdelivr.net) en las escenas 3D de
  SIMIQ3D (decidido por Mauricio el 2026-10-20).
- **El mundo es uno solo**: colores, cuadrícula de 24 px, tipografía y
  componentes salen de `DESIGN.md`. No crear tokens nuevos sin anotarlos ahí.
- **Toda decisión visual nueva se anota en `DESIGN.md`**, en la misma sesión
  en que se toma. Es la única fuente del diseño; no repetirla en otros
  archivos.
- **Datos reales**: técnicas, instrumental y mesas salen del dataset de
  DataIQ (regla 1 de `CLAUDE.md`). Lo que la fuente no trae se marca (p. ej.
  «sin arreglo disponible»), nunca se rellena.
- **Voz impersonal y en español** («Ver técnica», «Crear cuenta gratis»).
- Pensado para computador y celular por igual.

## Excepción provisional: el rediseño del frontend de SIMIQ3D

Decidido por Mauricio el 2026-11-05, solo para este rediseño y sin repetirse:
el frontend de SIMIQ3D (`simiq3d/frontend`) se rediseña **directamente en la
app de Angular, sin mockup previo**. No se aplican a ese rediseño las reglas
de «Un archivo por pantalla» ni de «Publicar» (el Artifact). Siguen valiendo
las demás: el mundo es uno solo (`DESIGN.md`), toda decisión visual nueva se
anota en `DESIGN.md` en la misma sesión (y antes de programarla, para que haya
qué comparar), los datos son reales y la voz es impersonal y en español. El
resultado se verifica con capturas de escritorio y celular como en «Verificar».

Skills del proyecto para el frontend (`.claude/skills/`, versionadas en
`skills-lock.json`), cada una con su alcance:

| Skill | Para qué |
|---|---|
| `angular-developer` (oficial de Angular) | El código de Angular: signals, formularios, rutas, accesibilidad, pruebas; corre `ng build` al terminar |
| `frontend-design` (Anthropic, plugin) | La identidad visual: plan visual justificado antes de implementar |
| `responsive-design` (wshobson) | Mobile-first, puntos de quiebre por contenido, container queries, tipografía fluida, objetivos táctiles de 44 px |
| `web-design-guidelines` (Vercel) | Revisar lo hecho contra más de 100 reglas de accesibilidad, rendimiento y UX; trae las reglas de GitHub en cada revisión |
| `threejs` (claudekit-skills) | El visor 3D: escena, cámara, GLTF, interacción táctil y rendimiento |

Ninguna manda sobre el proyecto: si una sugiere otra cosa (Tailwind, shadcn,
colores fuera de los tokens), gana `DESIGN.md`. La app es Angular con SCSS y
`shared/design/tokens.css`.

## Verificar

Capturas de escritorio (1310 px) y celular (390 px) con Brave sin interfaz:

```sh
brave-browser --headless=new --no-sandbox --hide-scrollbars \
  --window-size=1310,6200 --virtual-time-budget=4000 \
  --screenshot=.impeccable/review/desktop.png "file://$PWD/diseno/mockups/<pantalla>.html"
```

(Igual con `--window-size=390,9400` para `mobile.png`.) Una pantalla con
WebGL (SIMIQ3D) no termina con `--screenshot`: se captura por DevTools,
lanzando el navegador como pide la regla 7 de `CLAUDE.md`, con
`--use-angle=swiftshader --enable-unsafe-swiftshader`. Las capturas viven en
`.impeccable/review/`, que no se versiona. Máximo dos rondas de revisión
propias; después, el revisor final de impeccable y su veredicto.

## Publicar

Todos los mockups viven en un solo Artifact de Claude:
https://claude.ai/artifact/C6U12G8i7EMtfREt8YnTiK. Cada cambio se republica en
ese mismo enlace, y las pantallas nuevas se agregan como páginas dentro de él;
nunca se crea un Artifact nuevo por versión ni por pantalla.

---
paths:
  - "diseno/**"
  - "PRODUCT.md"
  - "DESIGN.md"
  - ".impeccable/**"
---

# Método de diseño (mockups)

Aplica a todo el trabajo de diseño visual del ecosistema: el shell y las
pantallas de DataIQ (SIMIQ3D y SIVRI solo aparecen como módulos, con vistas
ilustrativas marcadas como tales).

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
  autocontenidos. Fuentes solo de Google Fonts; nada de otras dependencias.
- **El mundo es uno solo**: colores, cuadrícula de 24 px, tipografía y
  componentes salen de `DESIGN.md`. No crear tokens nuevos sin anotarlos ahí.
- **Toda decisión visual nueva se anota en `DESIGN.md`**, en la misma sesión
  en que se toma. Es la única fuente del diseño; no repetirla en otros
  archivos.
- **Datos reales**: técnicas, instrumental y mesas salen del dataset de
  DataIQ (regla 1 de `CLAUDE.md`). Lo que la fuente no trae se marca (p. ej.
  «sin mesa»), nunca se rellena.
- **Voz impersonal y en español** («Ver técnica», «Crear cuenta gratis»).
- Pensado para computador y celular por igual.

## Verificar

Capturas de escritorio (1310 px) y celular (390 px) con Brave sin interfaz:

```sh
brave-browser --headless=new --no-sandbox --hide-scrollbars \
  --window-size=1310,6200 --virtual-time-budget=4000 \
  --screenshot=.impeccable/review/desktop.png "file://$PWD/diseno/mockups/<pantalla>.html"
```

(Igual con `--window-size=390,9400` para `mobile.png`.) Las capturas viven en
`.impeccable/review/`, que no se versiona. Máximo dos rondas de revisión
propias; después, el revisor final de impeccable y su veredicto.

## Publicar

Todos los mockups viven en un solo Artifact de Claude:
https://claude.ai/artifact/C6U12G8i7EMtfREt8YnTiK. Cada cambio se republica en
ese mismo enlace, y las pantallas nuevas se agregan como páginas dentro de él;
nunca se crea un Artifact nuevo por versión ni por pantalla.

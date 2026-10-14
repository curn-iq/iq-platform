# Arquitectura de IQ Platform

Diagramas del ecosistema, con el [modelo C4](https://c4model.com/): cada uno
es de un solo tipo y se entiende sin leer el texto. Son SVG en
[`diagramas/`](diagramas/): se editan como texto, se actualizan en el mismo PR
que cambia lo que muestran y se pueden pegar tal cual como figuras en el
Formato 115.

## Contenedores

![Diagrama de contenedores de IQ Platform](diagramas/contenedores.svg)

Qué piezas tiene el sistema y cómo se comunican, sin importar dónde corren:

- El **frontend web** (Angular) reúne el shell y la gestión de técnicas; lee y
  escribe por la **API de DataIQ** con la cookie de sesión.
- La **API de DataIQ** es la única que toca la base de DataIQ y la única que
  emite tokens. SIVRI y SIMIQ3D le piden el catálogo por HTTPS; nunca entran a
  su base.
- El **frontend de SIVRI** pide a DataIQ un token corto y con él envía 2 o 3
  cuadros por segundo de la cámara al **backend de SIVRI**, que reconoce el
  instrumental y valida la mesa.

## Despliegue

![Diagrama de despliegue de IQ Platform](diagramas/despliegue.svg)

Dónde corre cada pieza en producción:

- **Vercel** (plan Hobby) tiene un proyecto por pieza que se despliega aparte:
  el del shell y DataIQ sirve el frontend web, el de SIVRI su frontend (ambos
  como archivos estáticos) y `dataiq-backend` la API como funciones de Python
  en la región `cle1`. El navegador llega a la API por un rewrite del mismo
  dominio (`/api/dataiq/*`), así que la cookie de sesión viaja sin CORS.
- **Neon** guarda una base por módulo (PostgreSQL 18, Ohio), cada una en su
  propio proyecto.
- **SIVRI** corre en un portátil o PC del laboratorio durante las sesiones.
  Tailscale Funnel le da una dirección HTTPS fija y le reenvía lo que manda el
  celular; el portátil pide el catálogo a DataIQ una vez por sesión.

El código llega a producción por GitHub Actions: en cada push a `main`
despliega la API en Vercel y publica la imagen del backend en ghcr.io, que
sirve para correrlo fuera de Vercel (por ejemplo, en el portátil).

El porqué de cada elección y lo que se descartó está en `CLAUDE.md`
(«Infraestructura de despliegue»).

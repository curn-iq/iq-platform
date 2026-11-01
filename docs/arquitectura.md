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
- El **frontend de SIMIQ3D** (Angular y Three.js) envía la pregunta del chat a
  su **backend**. El backend pide el catálogo a DataIQ y deja que el **modelo
  de lenguaje** lo consulte (técnicas, instrumentos, comparar mesas) y redacte
  la respuesta; antes de enviarla verifica que cada nombre, número y ubicación
  esté en lo consultado, y guarda el registro de la conversación en su base.
  Con la respuesta, el frontend lee la mesa directo de la **API de DataIQ** y
  arma la escena.

## Despliegue

![Diagrama de despliegue de IQ Platform](diagramas/despliegue.svg)

Dónde corre cada pieza en producción y cómo llega ahí:

- **Vercel** (plan Hobby) tiene un proyecto por pieza que se despliega aparte:
  el del shell y DataIQ sirve el frontend web, el de SIVRI su frontend, el de
  SIMIQ3D su frontend y su backend, y `dataiq-backend` la API como funciones
  de Python en la región `cle1`. El navegador llega a la API por un rewrite
  del mismo dominio (`/api/dataiq/*`), así que la cookie de sesión viaja sin
  CORS. Los frontends de SIMIQ3D y SIVRI también se abren por ese dominio,
  con rewrites del proyecto del shell (`/simiq3d/*` y `/sivri/*`) hacia el
  de cada módulo, para que lleguen con la misma cookie.
- **Neon** guarda una base por módulo (PostgreSQL 18, Ohio), cada una en su
  propio proyecto.
- **El backend de SIVRI** corre en el **Servidor PC1**, un PC del laboratorio,
  durante las sesiones. Tailscale Funnel le da una dirección HTTPS fija y le
  reenvía lo que manda el celular; el servidor pide el catálogo a DataIQ una
  vez por sesión.
- **El modelo de lenguaje de SIMIQ3D** corre con Ollama en el **Servidor
  PC2**, un PC de escritorio con GPU, detrás de Tailscale Funnel y de un
  filtro con clave. Si el Servidor PC2 se apaga, solo deja de funcionar el
  chat.
- **GitHub Actions** lleva el código a producción: en cada push a `main`
  despliega en Vercel. También publica la imagen del backend de DataIQ en
  ghcr.io, que producción no usa (Vercel construye desde el código): sirve
  para correrlo fuera de Vercel, por ejemplo en Cloud Run si la institución
  lo financia ([`despues-del-mvp.md`](despues-del-mvp.md)).

## Por qué así

Decidido por Mauricio el 2026-10-14: solo servicios gratuitos que no exigen
tarjeta de crédito, porque el equipo no dispone de recursos para prepagar un
servicio en la nube. Límites verificados en la documentación oficial de cada
proveedor en octubre de 2026.

| Pieza | Servicio | Por qué y con qué límites |
|---|---|---|
| Backends de DataIQ y SIMIQ3D | Vercel Hobby, funciones de Python (región `cle1`, junto a Neon) | Cupo mensual de la cuenta: 4 horas de CPU activa (la espera por la base de datos no cuenta), 1 millón de invocaciones y 100 GB de transferencia. Escala a cero; el arranque en frío tarda segundos. Con `DATABASE_POOL=false`, cada función abre y cierra su conexión para no acumular conexiones en Neon. Hobby es solo para uso no comercial (un proyecto de grado cumple) y de una sola persona: los proyectos están en la cuenta de Mauricio |
| Frontends | Vercel Hobby (100 GB de transferencia al mes, que comparten los rewrites hacia las APIs) | Hobby no conecta un proyecto a un repositorio de una organización de GitHub: se despliega con el CLI de Vercel desde GitHub Actions, con el secreto `VERCEL_TOKEN` |
| Bases de datos | Neon Free, un proyecto por módulo (región `aws-us-east-2`, Ohio: no hay región en Sudamérica) | 0,5 GB de almacenamiento, 100 CU-hora y 5 GB de transferencia al mes por proyecto, con scale-to-zero. Al pasar el plan no se cobra: el cómputo se suspende hasta el ciclo siguiente, y por encima de 0,5 GB fallan las escrituras |
| Backend de SIVRI | Servidor PC1: un PC del laboratorio con Tailscale Funnel (dirección HTTPS fija `*.ts.net`, plan gratuito) | SIVRI se usa en sesiones de laboratorio, y ningún servicio gratuito sin tarjeta ofrece CPU sostenida para YOLO. Detalle: [`sivri/docs/checklist.md`](../sivri/docs/checklist.md) |
| Modelo de lenguaje de SIMIQ3D | Servidor PC2: un PC de escritorio con GPU, con Ollama y Tailscale Funnel, detrás de un filtro con clave | Si el Servidor PC2 se apaga, solo deja de funcionar el chat. Detalle: [`simiq3d/servidor-pc2/README.md`](../simiq3d/servidor-pc2/README.md) |
| Imagen del backend de DataIQ | GitHub Container Registry (ghcr.io), pública | Vercel no la usa; sirve para correr el backend fuera de Vercel |
| CI/CD | GitHub Actions | En cada PR, estilo y pruebas; en cada push a `main`, despliegue a Vercel e imagen a ghcr.io. No hay rama `dev`: `main` es producción y nada entra sin PR y CI. Las previews por PR, con una rama `dev` de la base en Neon, se agregan cuando haya usuarios que proteger |

Se descartaron:

- **Google Cloud Run:** en Colombia, crear la cuenta de facturación exige un
  prepago de COP 100.000. Queda como opción si la institución lo financia
  ([`despues-del-mvp.md`](despues-del-mvp.md)).
- **Azure for Students:** regiones restringidas por suscripción.
- **Render y similares:** 512 MB y 0,1 CPU, se suspenden por inactividad y
  pueden exigir tarjeta.
- **Hugging Face Spaces:** su cómputo gratuito no sirve para SIVRI.
- **El crédito de GCP de USD 300 por 90 días:** vence.
- **Oracle Cloud y Koyeb:** exigen tarjeta.

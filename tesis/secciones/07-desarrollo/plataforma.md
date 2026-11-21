# Desarrollo: plataforma común

## Qué lleva

- La arquitectura del ecosistema: los tres módulos, cada uno con su backend y
  su base, y cómo se comunican.
- La sesión única (DataIQ emite el token; los demás lo validan).
- El shell de navegación compartido.
- La infraestructura de despliegue y su porqué.
- La seguridad de la autenticación.

## Fuentes en el repositorio

- [`docs/arquitectura.md`](../../../docs/arquitectura.md), incluida la sección
  «Límite de intentos de autenticación».
- [`docs/flujos.md`](../../../docs/flujos.md).
- [`DESIGN.md`](../../../DESIGN.md), «Barra compartida».

## Texto

### Arquitectura del ecosistema

El ecosistema tiene tres módulos independientes, DataIQ, SIMIQ3D y SIVRI,
cada uno con su backend y su base de datos. Ningún módulo lee la base de
otro: SIMIQ3D y SIVRI consultan el catálogo de DataIQ por HTTPS
(`/catalog/full`), lo guardan en memoria durante la sesión y no conservan una
copia permanente. Así DataIQ es la única fuente de verdad del catálogo de
técnicas, instrumental y mesas.

### Sesión única

DataIQ es el único emisor de los tokens de sesión (JWT firmados con EdDSA,
válidos dos horas); SIMIQ3D y SIVRI los validan con la clave pública de
`/.well-known/jwks.json`. En el navegador el token viaja en una cookie
`HttpOnly`, que JavaScript no puede leer, y no en el almacenamiento local. El
frontend llama a cada API por su mismo origen (rewrites de Vercel), y toda
escritura exige el encabezado `X-IQ-Client`, como protección contra
falsificación de peticiones. SIVRI, que corre en otro dominio, recibe en cambio
un token corto de cinco minutos que el frontend pide a DataIQ.

### Infraestructura de despliegue

La infraestructura es gratuita y no exige tarjeta de crédito (decidido por el
equipo el 2026-10-14, después de que Google Cloud exigiera un pago anticipado
desde Colombia). Los backends de DataIQ y SIMIQ3D y los dos frontends corren
en Vercel (plan Hobby); cada módulo tiene su base PostgreSQL 18 en Neon. El
backend de SIVRI corre en el Servidor PC1 y el modelo de lenguaje del chat de
SIMIQ3D en el Servidor PC2, un PC con GPU; ambos se publican con Tailscale
Funnel, y el del Servidor PC2 detrás de un filtro con clave. GitHub Actions
corre el estilo y las pruebas en cada PR y despliega en cada integración a la
rama principal.

### Seguridad de la autenticación

El MVP cumple el nivel 1 de OWASP ASVS 5.0 en autenticación con un límite de
intentos en el firewall de Vercel: 100 peticiones por IP cada diez minutos en
el ingreso, el registro y la emisión de tokens (requisitos 6.1.1 y 6.3.1). El
registro informa si un correo ya tiene cuenta (requisito 6.3.8, nivel 3); es
un riesgo aceptado en el MVP, que se cierra después con la verificación del
correo.

Mauricio Lugo desarrolló la infraestructura, la sesión y la seguridad, con
asistencia de Claude Code.

"""Sesión del navegador: DataIQ deja el JWT en una cookie que JavaScript no
puede leer, y el proxy de Vercel la trae también a /api/simiq3d (mismo origen).

SIMIQ3D no crea ni borra la cookie: solo la lee. Los clientes que no son
navegador mandan el token en Authorization: Bearer.
"""

from fastapi import HTTPException, Request, status

from app.config import config

# Contra CSRF, igual que en DataIQ: otro sitio no puede mandar este encabezado
# sin pedir permiso de CORS, y CORS se lo niega.
CSRF_HEADER = "X-IQ-Client"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def cookie_name() -> str:
    # __Host- exige Secure: sin https (p. ej. Safari en http://localhost) el
    # navegador rechaza la cookie, así que el prefijo se quita.
    if config.session_cookie_secure:
        return config.session_cookie_name
    return config.session_cookie_name.removeprefix("__Host-")


def require_csrf_header(request: Request) -> None:
    if CSRF_HEADER not in request.headers:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Falta el encabezado {CSRF_HEADER} (protección contra CSRF)",
        )


def session_token(request: Request) -> str | None:
    """El token de la cookie, si la hay. En escrituras exige el encabezado CSRF:
    el navegador manda la cookie solo, incluso cuando la petición la arma otro
    sitio."""
    token = request.cookies.get(cookie_name())
    if token is not None and request.method not in SAFE_METHODS:
        require_csrf_header(request)
    return token

"""Sesión del navegador: el JWT viaja en una cookie que JavaScript no puede leer.

El frontend y las APIs comparten origen (el proxy de Vercel), así que la cookie
es propia, no de terceros. HttpOnly: un XSS no puede robarla. SameSite=Strict:
otro sitio no la manda. Sin Domain y con Path=/: llega a todas las rutas del
mismo host, también a /api/sivri y /api/simiq3d, y un subdominio no la puede
pisar. Los clientes que no son navegador siguen usando Authorization: Bearer.
"""

from fastapi import HTTPException, Request, Response, status

from app.config import config

# Contra CSRF: otro sitio no puede mandar este encabezado sin pedir permiso de
# CORS, y CORS se lo niega. A diferencia del XSRF-TOKEN de Angular, sirve
# también cuando la API está en otro subdominio.
CSRF_HEADER = "X-IQ-Client"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def cookie_name() -> str:
    # __Host- exige Secure: sin https (p. ej. Safari en http://localhost) el
    # navegador rechaza la cookie, así que el prefijo se quita.
    if config.session_cookie_secure:
        return config.session_cookie_name
    return config.session_cookie_name.removeprefix("__Host-")


def _attributes() -> dict:
    return {
        "key": cookie_name(),
        "path": "/",
        "secure": config.session_cookie_secure,
        "httponly": True,
        "samesite": "strict",
    }


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        value=token, max_age=config.jwt_expiration_hours * 3600, **_attributes()
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(**_attributes())


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

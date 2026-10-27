import hashlib

from fastapi import Request, Response


def respond_with_cache(
    request: Request, body: bytes, max_age: int, private: bool = False
) -> Response:
    """Responde con ETag y Cache-Control; si el cliente ya tiene esta versión, 304.

    El ETag es el hash del cuerpo: cambia solo si cambia lo que se devuelve.
    Lo que pide cuenta va como privado: solo lo guarda el navegador de esa
    persona, nunca un caché compartido.
    """
    etag = f'"{hashlib.sha256(body).hexdigest()[:32]}"'
    scope = "private" if private else "public"
    headers = {"ETag": etag, "Cache-Control": f"{scope}, max-age={max_age}"}
    if private:
        # La cuenta llega por el token o por la cookie de sesión
        headers["Vary"] = "Authorization, Cookie"
    client_etags = request.headers.get("if-none-match", "")
    if etag in [e.strip() for e in client_etags.split(",")]:
        return Response(status_code=304, headers=headers)
    return Response(body, media_type="application/json", headers=headers)

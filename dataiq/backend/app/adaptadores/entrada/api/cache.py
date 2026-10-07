import hashlib

from fastapi import Request, Response


def responder_con_cache(request: Request, cuerpo: bytes, max_age: int) -> Response:
    """Responde con ETag y Cache-Control; si el cliente ya tiene esta versión, 304.

    El ETag es el hash del cuerpo: cambia solo si cambia lo que se devuelve.
    """
    etag = f'"{hashlib.sha256(cuerpo).hexdigest()[:32]}"'
    cabeceras = {"ETag": etag, "Cache-Control": f"public, max-age={max_age}"}
    etags_del_cliente = request.headers.get("if-none-match", "")
    if etag in [e.strip() for e in etags_del_cliente.split(",")]:
        return Response(status_code=304, headers=cabeceras)
    return Response(cuerpo, media_type="application/json", headers=cabeceras)

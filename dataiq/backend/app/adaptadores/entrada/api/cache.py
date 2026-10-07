import hashlib

from fastapi import Request, Response


def responder_con_cache(
    request: Request, cuerpo: bytes, max_age: int, privado: bool = False
) -> Response:
    """Responde con ETag y Cache-Control; si el cliente ya tiene esta versión, 304.

    El ETag es el hash del cuerpo: cambia solo si cambia lo que se devuelve.
    Lo que depende de la cuenta va como privado: solo lo guarda el navegador
    de esa persona, nunca un caché compartido.
    """
    etag = f'"{hashlib.sha256(cuerpo).hexdigest()[:32]}"'
    alcance = "private" if privado else "public"
    cabeceras = {"ETag": etag, "Cache-Control": f"{alcance}, max-age={max_age}"}
    if privado:
        cabeceras["Vary"] = "Authorization"
    etags_del_cliente = request.headers.get("if-none-match", "")
    if etag in [e.strip() for e in etags_del_cliente.split(",")]:
        return Response(status_code=304, headers=cabeceras)
    return Response(cuerpo, media_type="application/json", headers=cabeceras)

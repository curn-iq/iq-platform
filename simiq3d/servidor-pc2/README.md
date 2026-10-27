# Servidor PC2

El PC de escritorio con GPU (AMD RX 6600 XT de 8 GB) donde corre el modelo de
lenguaje del chat de SIMIQ3D. Por qué un PC propio y no un servicio en la nube:
[`../README.md`](../README.md), «Chat».

```
Backend de SIMIQ3D (Vercel) ──HTTPS + clave──▶ Tailscale Funnel ──▶ filtro.py ──▶ Ollama
                                               (*.ts.net)          (127.0.0.1:11435)  (127.0.0.1:11434)
```

Solo el filtro queda publicado. Ollama no tiene autenticación, así que escucha
únicamente en `127.0.0.1`. El filtro exige la clave que solo conoce el backend y
reenvía a Ollama solo `POST /v1/chat/completions`, con el modelo configurado y
un tamaño máximo. Atiende pocas preguntas a la vez (`FILTRO_SIMULTANEAS`, por
defecto 2): si llega otra, responde `429` al momento y el backend contesta con
sus plantillas, en vez de que la pregunta haga fila en la GPU. Si el PC se apaga, solo deja de funcionar el chat: el visor y
las técnicas siguen.

## Montarlo

1. **Ollama con la GPU**, como servicio (el instalador de
   [ollama.com](https://ollama.com) lo deja así), y el modelo:

   ```sh
   ollama pull qwen3-vl:8b-instruct
   ollama ps      # al preguntar algo, PROCESSOR debe decir 100% GPU
   ```

2. **La clave del filtro**, en un archivo que solo lee el dueño. La misma va
   en `LLM_API_KEY` del proyecto de Vercel del backend:

   ```sh
   mkdir -p ~/.config/simiq3d
   echo "FILTRO_CLAVE=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')" > ~/.config/simiq3d/filtro.env
   chmod 600 ~/.config/simiq3d/filtro.env
   ```

3. **El filtro como servicio**, que arranca solo y sigue aunque no haya sesión
   abierta (revisar en `simiq3d-filtro.service` la ruta de `uv` y la del repo):

   ```sh
   mkdir -p ~/.config/systemd/user
   cp simiq3d-filtro.service ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now simiq3d-filtro
   loginctl enable-linger "$USER"
   curl http://127.0.0.1:11435/salud      # {"ok":true}
   ```

4. **Tailscale Funnel**, que le da al filtro una dirección HTTPS fija
   (`https://<equipo>.<tailnet>.ts.net`) sin abrir puertos del router. En
   Fedora:

   ```sh
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo systemctl enable --now tailscaled
   sudo tailscale up
   sudo tailscale set --operator="$USER"
   tailscale funnel --bg 11435
   tailscale funnel status                # la dirección pública
   ```

   La primera vez, `tailscale funnel` da un enlace para activar HTTPS y Funnel
   en la consola de Tailscale.

5. **Que no se suspenda.** El PC tiene que estar prendido durante las
   sesiones de uso:

   ```sh
   sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
   ```

6. **Conectarlo al backend:** en el proyecto `simiq3d-backend` de Vercel,
   `LLM_URL` con la dirección de Funnel y `LLM_API_KEY` con la clave del paso 2
   (ver [`../backend/README.md`](../backend/README.md), «Producción»).

Para comprobar desde fuera: `curl https://<equipo>.<tailnet>.ts.net/salud`.

## Pruebas del filtro

```sh
uv run --script test_filtro.py
```

Comprueban que sin la clave no pase nada, que solo se acepte el modelo
configurado, que no se publiquen las demás rutas de Ollama, que se rechacen
las peticiones demasiado grandes y que, lleno, responda `429` sin hacer fila.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../design/brand/modules/sivri-server-pc1-dark.svg">
    <img src="../../design/brand/modules/sivri-server-pc1.svg" alt="SIVRI, Servidor PC1" width="278">
  </picture>
</p>

El PC de escritorio donde corre el backend de SIVRI con el detector. Se publica
con Tailscale Funnel en una dirección HTTPS fija, porque el detector necesita un
equipo propio y Vercel no pasa WebSockets:

```
Celular ──HTTPS / WSS + token──▶ Tailscale Funnel ──▶ SIVRI (127.0.0.1:8002) ──▶ DataIQ
                                 (*.ts.net:8443)       + PostgreSQL local
```

## Stack

- Unidades de usuario de systemd (esta carpeta): la base de SIVRI en un
  contenedor de PostgreSQL 18, el backend de SIVRI y un DataIQ local.
- Tailscale Funnel, en el servicio de sistema `tailscaled`, que reenvía el puerto
  8443 a SIVRI.
- Los pesos del detector en `sivri/backend/models/sivri.pt`.

## Correrlo

Con el backend ya instalado como dice
[`../backend/README.md`](../backend/README.md#correrlo) (base, mapeo de clases y
pesos), desde la raíz del repositorio:

```sh
install -d ~/.config/systemd/user
install -m 644 sivri/servidor-pc1/*.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now iq-dataiq-pc1.service iq-sivri-pc1.service
loginctl enable-linger "$USER"   # que arranque sin abrir sesión
```

Cada servicio inicia su contenedor de PostgreSQL y espera a que responda.

**Para el piloto**, SIVRI usa el DataIQ de producción: un archivo local
`~/.config/systemd/user/iq-sivri-pc1.service.d/produccion.conf`, fuera del
repositorio, define `DATAIQ_URL=https://dataiq-backend.vercel.app`, y el `.env`
del backend incluye el origen del shell en `CORS_ORIGINS`.

## Pruebas

```sh
systemctl --user status iq-sivri-pc1
journalctl --user -u iq-sivri-pc1
curl https://<nombre>.ts.net:8443/health
```

Las mediciones hechas en este servidor están en
[`../docs/diagnosticos.md`](../docs/diagnosticos.md#vista-previa-en-el-servidor-pc1).

## Más documentación

- Qué es SIVRI: [`../README.md`](../README.md).
- El backend que corre aquí: [`../backend/README.md`](../backend/README.md).
- Arquitectura e infraestructura: [`docs/arquitectura.md`](../../docs/arquitectura.md).

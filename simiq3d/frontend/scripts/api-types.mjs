// Genera los tipos de las dos APIs que usa SIMIQ3D a partir de su OpenAPI:
// src/app/data/api/dataiq.d.ts (catálogo, sesión) y simiq3d.d.ts (chat, modelos).
// No hace falta que los backends estén corriendo: el documento sale de
// app.openapi() de FastAPI, el mismo que sirve /openapi.json. Los tipos se
// versionan, para que el build no necesite los backends.
//
// Requiere uv (el que usan los backends). Si un backend cambia una ruta o un
// esquema, correr `npm run api:types` y subir el archivo en el mismo PR. Es el
// mismo script del frontend de DataIQ, para dos backends.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generator = join(frontend, 'node_modules', 'openapi-typescript', 'bin', 'cli.js');
const apis = [
  { name: 'dataiq', backend: resolve(frontend, '..', '..', 'dataiq', 'backend') },
  { name: 'simiq3d', backend: resolve(frontend, '..', 'backend') },
];

// Los backends exigen estas variables para cargar su configuración, pero el
// documento OpenAPI no las usa ni abre ninguna conexión: basta con valores de
// relleno. Si ya existen en el entorno, se respetan.
const env = {
  DATABASE_URL: 'postgresql+asyncpg://openapi:openapi@localhost:5432/openapi',
  JWT_PRIVATE_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  ...process.env,
};

function run(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', env, ...options });
  if (result.error?.code === 'ENOENT') {
    console.error(
      `No se encontró «${command}». Hace falta instalarlo (ver simiq3d/backend/README.md).`,
    );
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const temp = mkdtempSync(join(tmpdir(), 'simiq3d-openapi-'));
try {
  const script = [
    'import json, sys',
    'from app.main import app',
    'open(sys.argv[1], "w", encoding="utf-8").write(json.dumps(app.openapi()))',
  ].join('; ');
  for (const { name, backend } of apis) {
    const spec = join(temp, `${name}.json`);
    const output = join(frontend, 'src', 'app', 'data', 'api', `${name}.d.ts`);
    run('uv', ['run', '--directory', backend, 'python', '-c', script, spec]);
    run(process.execPath, [generator, spec, '--output', output]);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

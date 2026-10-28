// Genera los tipos de la API (src/app/data/api/schema.d.ts) a partir del
// OpenAPI del backend de DataIQ. No hace falta que el backend esté corriendo:
// el documento sale de app.openapi() de FastAPI, el mismo que sirve /openapi.json.
// Los tipos generados se versionan, para que el build no necesite el backend.
//
// Requiere uv (el que usa el backend). Si el backend cambia una ruta o un
// esquema, correr `npm run api:types` y subir el archivo en el mismo PR.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(frontend, '..', 'backend');
const output = join(frontend, 'src', 'app', 'data', 'api', 'schema.d.ts');
const generator = join(frontend, 'node_modules', 'openapi-typescript', 'bin', 'cli.js');

// El backend exige estas variables para cargar su configuración, pero el
// documento OpenAPI no las usa ni abre ninguna conexión: basta con valores de
// relleno. Si ya existen en el entorno, se respetan; los del .env del backend
// no, porque pydantic-settings prefiere el entorno (da igual para el documento).
const env = {
  DATABASE_URL: 'postgresql+asyncpg://openapi:openapi@localhost:5432/openapi',
  JWT_PRIVATE_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  ...process.env,
};

function run(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', env, ...options });
  if (result.error?.code === 'ENOENT') {
    console.error(`No se encontró «${command}». Hace falta instalarlo (ver dataiq/README.md).`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const temp = mkdtempSync(join(tmpdir(), 'dataiq-openapi-'));
const spec = join(temp, 'openapi.json');
try {
  const script = [
    'import json, sys',
    'from app.main import app',
    'open(sys.argv[1], "w", encoding="utf-8").write(json.dumps(app.openapi()))',
  ].join('; ');
  run('uv', ['run', '--directory', backend, 'python', '-c', script, spec]);
  run(process.execPath, [generator, spec, '--output', output]);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

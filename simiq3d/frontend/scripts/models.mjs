// Comprime los modelos 3D de simiq3d/models/glb/ hacia public/models/, que es lo
// que se publica (no se versiona). Corre solo antes de `npm start` y de
// `npm run build`; a mano, `npm run models`.
//
// gltfpack (meshopt) los deja en un tercio de su peso. Con -kn conserva los
// nodos con nombre, como `blade_mount`, de donde el visor cuelga la hoja de
// bisturí (simiq3d/models/README.md, «Mango y hoja»). Solo vuelve a comprimir
// un modelo si su GLB cambió.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(frontend, '..', 'models', 'glb');
const output = join(frontend, 'public', 'models');
const gltfpack = join(frontend, 'node_modules', 'gltfpack', 'cli.js');
// Presupuesto de cada modelo (simiq3d/frontend/README.md, «Decisiones»)
const MAX_BYTES = 150 * 1024;

mkdirSync(output, { recursive: true });
const models = readdirSync(source).filter((name) => name.endsWith('.glb'));

// Lo que ya no está en la fuente tampoco se publica
for (const name of readdirSync(output)) {
  if (!models.includes(name)) rmSync(join(output, name));
}

let packed = 0;
for (const name of models) {
  const input = join(source, name);
  const target = join(output, name);
  if (existsSync(target) && statSync(target).mtimeMs >= statSync(input).mtimeMs) continue;
  const result = spawnSync(process.execPath, [gltfpack, '-i', input, '-o', target, '-cc', '-kn'], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (result.status !== 0) {
    console.error(`No se pudo comprimir ${name}.`);
    process.exit(result.status ?? 1);
  }
  packed += 1;
}

const sizes = models.map((name) => ({ name, bytes: statSync(join(output, name)).size }));
const total = sizes.reduce((sum, { bytes }) => sum + bytes, 0);
console.log(
  `Modelos 3D: ${models.length} en public/models/ (${packed} comprimidos ahora), ` +
    `${(total / 1024).toFixed(0)} KB en total.`,
);
const heavy = sizes.filter(({ bytes }) => bytes > MAX_BYTES);
if (heavy.length > 0) {
  for (const { name, bytes } of heavy) {
    console.error(`${basename(name)} pesa ${(bytes / 1024).toFixed(0)} KB: el máximo es 150 KB.`);
  }
  process.exit(1);
}

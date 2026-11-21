// Comprime los modelos 3D de simiq3d/models/glb/ hacia public/models/, que es lo
// que se publica (no se versiona). Corre solo antes de `npm start` y de
// `npm run build`; a mano, `npm run models`.
//
// gltfpack (meshopt) los deja en un tercio de su peso. Con -kn conserva los
// nodos con nombre, como `blade_mount`, de donde el visor cuelga la hoja de
// bisturí (simiq3d/models/README.md, «Mango y hoja»). Solo vuelve a comprimir
// un modelo si su GLB cambió.
//
// Cada modelo se publica también con una huella de su contenido en el nombre
// (`kocher_forceps.ff785f3f26.glb`) y `manifest.json` dice cuál corresponde a cada
// uno. El visor pide el de la huella: si el modelo cambia, cambia su nombre y el
// navegador no puede seguir usando la copia vieja de su caché
// (simiq3d/frontend/README.md, «Modelos 3D»).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
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

// Lo que ya no está en la fuente tampoco se publica (las copias con huella se
// rehacen al final)
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

const manifest = {};
for (const name of models) {
  const bytes = readFileSync(join(output, name));
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  const hashed = name.replace(/\.glb$/, `.${hash}.glb`);
  writeFileSync(join(output, hashed), bytes);
  manifest[name] = hashed;
}
writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

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

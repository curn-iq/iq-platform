import type { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Los modelos 3D de `public/models/` (comprimidos con meshopt por `npm run
 * models`). Cada GLB se descarga una sola vez y se reutiliza: la misma Kelly en
 * dos técnicas es el mismo archivo, y cada copia comparte su geometría.
 *
 * Se pide la copia con la huella de su contenido en el nombre, según
 * `manifest.json`: así un modelo actualizado nunca sale de la caché vieja del
 * navegador. Sin el índice, se pide el nombre de siempre.
 */
export class ModelLibrary {
  private readonly loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  private readonly templates = new Map<string, Promise<Group>>();
  private manifest?: Promise<Record<string, string>>;

  /** `base` es relativa a la de la app (`/simiq3d/`), p. ej. `models/`. */
  constructor(private readonly base: string) {}

  /** Una copia del modelo, lista para ponerla en la escena. */
  async instance(file: string): Promise<Group> {
    let template = this.templates.get(file);
    if (template === undefined) {
      template = this.url(file)
        .then((url) => this.loader.loadAsync(url))
        .then((gltf) => gltf.scene);
      // Si falla, la próxima vez se vuelve a intentar
      template.catch(() => this.templates.delete(file));
      this.templates.set(file, template);
    }
    return (await template).clone(true);
  }

  /** La dirección del modelo con la huella de su contenido, si el índice la trae. */
  private async url(file: string): Promise<string> {
    this.manifest ??= fetch(`${this.base}manifest.json`, { cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}));
    const hashed = (await this.manifest)[file];
    return `${this.base}${hashed ?? file}`;
  }

  /** Libera la geometría de todos los modelos descargados. */
  async dispose(): Promise<void> {
    const loaded = await Promise.allSettled(this.templates.values());
    this.templates.clear();
    for (const result of loaded) {
      if (result.status !== 'fulfilled') continue;
      result.value.traverse((node) => {
        if ('geometry' in node) (node as { geometry: { dispose(): void } }).geometry.dispose();
      });
    }
  }
}

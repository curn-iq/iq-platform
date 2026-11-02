import type { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Los modelos 3D de `public/models/` (comprimidos con meshopt por `npm run
 * models`). Cada GLB se descarga una sola vez y se reutiliza: la misma Kelly en
 * dos técnicas es el mismo archivo, y cada copia comparte su geometría.
 */
export class ModelLibrary {
  private readonly loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  private readonly templates = new Map<string, Promise<Group>>();

  /** `base` es relativa a la de la app (`/simiq3d/`), p. ej. `models/`. */
  constructor(private readonly base: string) {}

  /** Una copia del modelo, lista para ponerla en la escena. */
  async instance(file: string): Promise<Group> {
    let template = this.templates.get(file);
    if (template === undefined) {
      template = this.loader.loadAsync(`${this.base}${file}`).then((gltf) => gltf.scene);
      // Si falla, la próxima vez se vuelve a intentar
      template.catch(() => this.templates.delete(file));
      this.templates.set(file, template);
    }
    return (await template).clone(true);
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

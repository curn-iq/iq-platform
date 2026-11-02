import {
  ACESFilmicToneMapping,
  Box3,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  RepeatWrapping,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { arrange } from '../domain/arrangement';
import { MAYO_TABLE_SIZE } from '../domain/mayo-table';
import type { PlacedItem } from '../domain/placement';
import { ModelLibrary } from './model-library';

/**
 * La mesa de Mayo en Three.js. Es lo único de la app que sabe que existe
 * Three.js; se descarga aparte, al abrir la mesa. Materiales, luz y cámara: ver
 * «Escena 3D de SIMIQ3D (material)» en `DESIGN.md`.
 *
 * Solo dibuja cuando algo cambia (girar, cargar, señalar, cambiar de tamaño), no
 * 60 veces por segundo: ahorra batería en el celular.
 */

export interface SceneOptions {
  /** Con movimiento reducido, la cámara salta en vez de viajar. */
  reducedMotion: boolean;
  /** Se tocó una pieza (su `itemId`), o la mesa vacía (`null`). */
  onPick: (itemId: string | null) => void;
  /** Después de cada cuadro: dónde queda en pantalla la pieza señalada, en píxeles del lienzo. */
  onRender?: (badge: { x: number; y: number } | null) => void;
  /** Se empezó a girar o acercar con el dedo o el mouse. */
  onInteract?: () => void;
}

/** Desde dónde se mira la mesa: en perspectiva, o desde arriba como el diagrama. */
export type SceneView = '3d' | 'top';

/** Espacio que tapan los paneles de la interfaz, en píxeles: la mesa se encuadra en el resto. */
export interface FreeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const TABLE_HEIGHT = 0.92;
// La cara de arriba de la funda: ahí se apoyan los instrumentos
const SURFACE_Y = 0.0026;
// Cuánto sube la pieza señalada y cuánto se apagan las demás
const LIFT = 0.014;
const DIMMED = 0.38;
// Separación entre instrumentos independientes de un mismo objeto
const SIDE_GAP = 0.004;
const NUMBER_PX = 20;
const TRAVEL_MS = 900;
const ZOOM_MS = 350;
// Un toque que se mueve más que esto es un giro, no un toque
const TAP_PX = 6;

/** Una propiedad CSS del sistema visual (`shared/design/tokens.css`) como color de Three.js. */
function token(name: string, fallback: string): Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new Color(value || fallback);
}

/** La tela de la funda: su color con un grano de ±11 de luminancia por píxel. */
function clothTexture(color: Color): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = `#${color.getHexString()}`;
  context.fillRect(0, 0, 256, 256);
  const image = context.getImageData(0, 0, 256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    image.data[i] += noise;
    image.data[i + 1] += noise;
    image.data[i + 2] += noise;
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** La sombra de contacto, dibujada: un degradado radial a transparente. */
function shadowTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(10,27,34,.42)');
  gradient.addColorStop(1, 'rgba(10,27,34,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

/** El número del diagrama de IQ en un círculo blanco, como textura. */
function numberTexture(value: number, ink: Color): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'rgba(255,255,255,.94)';
  context.beginPath();
  context.arc(48, 48, 44, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = `#${ink.getHexString()}`;
  context.font = "700 46px 'Host Grotesk', Arial, sans-serif";
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(value), 48, 51);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Una pieza en la escena: el objeto armado, sus materiales propios y su número. */
interface ScenePiece {
  item: PlacedItem;
  group: Group;
  /** Lo que ocupa la pieza armada, medido con el grupo en el origen. */
  bounds: Box3;
  materials: MeshStandardMaterial[];
  shadow: Mesh;
  number: Sprite | null;
}

export class MayoScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(34, 1, 0.01, 20);
  private readonly controls: OrbitControls;
  private readonly library = new ModelLibrary('models/');
  private readonly piecesGroup = new Group();
  private readonly numbersGroup = new Group();
  private readonly shadow = shadowTexture();
  private readonly shadowGeometry = new PlaneGeometry(1, 1);
  private readonly numbers = new Map<number, Texture>();
  private readonly accent = token('--color-accent', '#1b5f86');
  private readonly ink = token('--color-text', '#0a1b22');
  private readonly observer: ResizeObserver;
  private readonly disposables: { dispose(): void }[] = [];
  private pieces: ScenePiece[] = [];
  private selected: ScenePiece | null = null;
  private free: FreeArea = { top: 0, right: 0, bottom: 0, left: 0 };
  private view: SceneView = '3d';
  private frameRequested = false;
  private travel: {
    start: number;
    from: Vector3;
    to: Vector3;
    targetFrom: Vector3;
    targetTo: Vector3;
    duration: number;
  } | null = null;
  private loading = 0;
  private pointerDown: [number, number] | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: SceneOptions,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    const pmrem = new PMREMGenerator(this.renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = environment;
    this.disposables.push(environment, this.shadow, this.shadowGeometry);

    this.scene.add(new HemisphereLight(0xf4f8fc, 0xb4c3cd, 0.45));
    const sun = new DirectionalLight(0xffffff, 0.95);
    sun.position.set(0.4, 1.2, 0.6);
    this.scene.add(sun);

    this.buildTable();
    this.scene.add(this.piecesGroup, this.numbersGroup);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.minDistance = 0.22;
    this.controls.maxDistance = 2.2;
    // Sin bajar del borde de la mesa
    this.controls.maxPolarAngle = 1.32;
    this.controls.addEventListener('change', this.requestFrame);
    this.controls.addEventListener('start', this.onControlsStart);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    this.frame(false);
  }

  /** Pone en la mesa los objetos de una técnica, en lugar de los que había. */
  async setTable(items: readonly PlacedItem[]): Promise<void> {
    const loading = ++this.loading;
    const built = await Promise.all(items.map((item) => this.buildPiece(item)));
    if (loading !== this.loading) {
      // Llegó otra técnica mientras se armaba esta
      built.forEach((piece) => this.disposePiece(piece));
      return;
    }
    this.clearTable();
    this.pieces = built;
    // Cada pieza parte del centro de su celda y se corre lo justo para quedar
    // dentro de la mesa y no tapar a otra (`domain/arrangement.ts`)
    const centers = built.map((piece) => piece.bounds.getCenter(new Vector3()));
    const sizes = built.map((piece) => piece.bounds.getSize(new Vector3()));
    const points = arrange(
      built.map((piece, i) => ({
        x: piece.item.x + centers[i].x,
        z: piece.item.z + centers[i].z,
        halfLength: sizes[i].x / 2,
        halfWidth: sizes[i].z / 2,
      })),
    );
    built.forEach((piece, i) => {
      piece.group.position.set(points[i].x - centers[i].x, 0, points[i].z - centers[i].z);
      this.piecesGroup.add(piece.group);
      if (piece.number) {
        // Junto a la pieza, del lado de los anillos (−X)
        piece.number.position.set(points[i].x - sizes[i].x / 2 - 0.012, 0.006, points[i].z);
        this.numbersGroup.add(piece.number);
      }
    });
    this.scaleNumbers();
    this.selected = null;
    this.paint();
    this.frame(false);
  }

  /**
   * Señala una pieza (o ninguna): sube y se tiñe, y las demás se apagan. Con
   * `travel`, la cámara se acerca un poco hacia ella sin perder la mesa entera.
   */
  highlight(itemId: string | null, travel: boolean): void {
    this.selected = this.pieces.find((piece) => piece.item.itemId === itemId) ?? null;
    this.paint();
    if (this.selected && travel) {
      const [position, target] = this.framing();
      const { x, z } = this.selected.group.position;
      const toward = new Vector3(x * 0.1, 0, z * 0.14);
      this.moveCamera(position.add(toward), target.add(toward));
    }
    this.requestFrame();
  }

  /** Lo que tapan los paneles; la próxima vez que se encuadre, la mesa va en el resto. */
  setFreeArea(free: FreeArea): void {
    this.free = free;
    this.frame(true);
  }

  /** Mirar en perspectiva o desde arriba; encuadra la mesa entera. */
  setView(view: SceneView): void {
    this.view = view;
    this.frame(true);
  }

  /** Acerca (`1`) o aleja (`-1`) la cámara, sin pasar los límites. */
  zoom(direction: 1 | -1): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const length = MathUtils.clamp(
      offset.length() * (direction > 0 ? 0.8 : 1.25),
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    const target = this.controls.target.clone();
    this.moveCamera(target.clone().add(offset.setLength(length)), target, ZOOM_MS);
  }

  /** Vuelve a encuadrar la mesa entera. */
  frame(animated = true): void {
    const [position, target] = this.framing();
    if (animated) {
      this.moveCamera(position, target);
    } else {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.requestFrame();
    }
  }

  dispose(): void {
    this.loading++;
    this.observer.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.controls.removeEventListener('change', this.requestFrame);
    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.dispose();
    this.clearTable();
    this.numbers.forEach((texture) => texture.dispose());
    this.disposables.forEach((item) => item.dispose());
    void this.library.dispose();
    this.renderer.dispose();
  }

  // ---------- La mesa ----------

  private buildTable(): void {
    const { width, depth } = MAYO_TABLE_SIZE;
    const steel = new MeshStandardMaterial({ color: 0xb9c3c7, metalness: 0.85, roughness: 0.35 });
    const cloth = new MeshStandardMaterial({
      map: clothTexture(token('--color-cover', '#1d7564')),
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: 0.35,
    });
    const edge = new MeshStandardMaterial({
      color: token('--color-cover-edge', '#0e463c'),
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: 0.3,
    });
    const floor = new MeshBasicMaterial({ map: this.shadow, transparent: true, depthWrite: false });
    const add = (mesh: Mesh, x: number, y: number, z: number, rotationY = 0) => {
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotationY;
      this.scene.add(mesh);
      this.disposables.push(mesh.geometry);
    };

    // La bandeja y la funda encima
    add(new Mesh(new BoxGeometry(width + 0.02, 0.012, depth + 0.02), steel), 0, -0.008, 0);
    add(new Mesh(new BoxGeometry(width + 0.03, 0.004, depth + 0.03), cloth), 0, 0, 0);
    // La funda cae 6 cm por los cuatro costados
    const fall = 0.06;
    const side = (length: number, x: number, z: number, rotationY: number) =>
      add(new Mesh(new BoxGeometry(length, fall, 0.003), edge), x, -fall / 2, z, rotationY);
    side(width + 0.03, 0, (depth + 0.03) / 2, 0);
    side(width + 0.03, 0, -(depth + 0.03) / 2, 0);
    side(depth + 0.03, (width + 0.03) / 2, 0, Math.PI / 2);
    side(depth + 0.03, -(width + 0.03) / 2, 0, Math.PI / 2);
    // El pie de la mesa de Mayo: poste y base, en una esquina
    const footX = -width / 2 + 0.06;
    const footZ = -depth / 2 + 0.08;
    add(
      new Mesh(new CylinderGeometry(0.013, 0.013, TABLE_HEIGHT - 0.1, 24), steel),
      footX,
      -TABLE_HEIGHT / 2 - 0.06,
      footZ,
    );
    // La base corre bajo la bandeja, desde el poste hacia el centro, como en la mesa real
    add(
      new Mesh(new BoxGeometry(0.5, 0.02, 0.07), steel),
      footX + 0.2,
      -TABLE_HEIGHT + 0.01,
      footZ,
    );
    // Sombra de contacto en el piso
    const shadow = new Mesh(new PlaneGeometry(1.6, 1.2), floor);
    shadow.rotation.x = -Math.PI / 2;
    add(shadow, 0, -TABLE_HEIGHT, 0);

    this.disposables.push(steel, cloth, cloth.map!, edge, floor);
  }

  // ---------- Las piezas ----------

  /** Arma la pieza en el origen; `setTable` la pone en su lugar. */
  private async buildPiece(item: PlacedItem): Promise<ScenePiece> {
    const group = new Group();
    group.userData['itemId'] = item.itemId;
    // Materiales propios de la pieza: así se apaga o se tiñe sola
    const steel = new MeshStandardMaterial({
      color: 0xb4bec3,
      metalness: 1,
      roughness: 0.22,
      envMapIntensity: 1.35,
      transparent: true,
    });
    const blade = new MeshStandardMaterial({
      color: 0xdde4e6,
      metalness: 1,
      roughness: 0.18,
      envMapIntensity: 1.35,
      transparent: true,
    });

    const models = await Promise.all(item.models.map((model) => this.library.instance(model.file)));
    models.forEach((model, i) => {
      const material = /^scalpel_blade_/.test(item.models[i].file) ? blade : steel;
      model.traverse((node) => {
        if (node instanceof Mesh) node.material = material;
      });
    });

    // Las hojas se cuelgan del `blade_mount` de su mango, sin moverlas ni girarlas
    const loose: Object3D[] = [];
    item.models.forEach((model, i) => {
      const mount =
        model.mountOn === null ? undefined : models[model.mountOn].getObjectByName('blade_mount');
      if (mount) mount.add(models[i]);
      else loose.push(models[i]);
    });
    // Los instrumentos independientes, uno al lado del otro a lo ancho
    const depths = loose.map((model) => new Box3().setFromObject(model).getSize(new Vector3()).z);
    const total = depths.reduce((sum, d) => sum + d, 0) + SIDE_GAP * (loose.length - 1);
    let z = -total / 2;
    loose.forEach((model, i) => {
      model.position.set(0, SURFACE_Y, z + depths[i] / 2);
      z += depths[i] + SIDE_GAP;
      group.add(model);
    });

    const bounds = new Box3().setFromObject(group);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const shadow = new Mesh(
      this.shadowGeometry,
      new MeshBasicMaterial({
        map: this.shadow,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    shadow.scale.set(size.x * 1.15, Math.max(0.03, size.z * 1.4), 1);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(center.x, SURFACE_Y - 0.0001, center.z);
    group.add(shadow);

    // El número no sube con la pieza: va aparte, y `setTable` lo pone junto a ella
    let number: Sprite | null = null;
    if (item.legendNumber !== null) {
      number = new Sprite(
        new SpriteMaterial({
          map: this.numberTexture(item.legendNumber),
          transparent: true,
          depthTest: false,
          depthWrite: false,
          sizeAttenuation: false,
        }),
      );
      number.renderOrder = 5;
    }
    return { item, group, bounds, materials: [steel, blade], shadow, number };
  }

  private numberTexture(value: number): Texture {
    let texture = this.numbers.get(value);
    if (texture === undefined) {
      texture = numberTexture(value, this.ink);
      this.numbers.set(value, texture);
    }
    return texture;
  }

  /** La pieza señalada se tiñe; las demás se apagan, nunca sus números. */
  private paint(): void {
    for (const piece of this.pieces) {
      const isSelected = piece === this.selected;
      const dimmed = this.selected !== null && !isSelected;
      for (const material of piece.materials) {
        material.opacity = dimmed ? DIMMED : 1;
        material.emissive.copy(isSelected ? this.accent : new Color(0x000000));
        material.emissiveIntensity = isSelected ? 0.22 : 0;
      }
    }
  }

  private clearTable(): void {
    this.pieces.forEach((piece) => this.disposePiece(piece));
    this.pieces = [];
    this.selected = null;
    this.renderer.renderLists.dispose();
  }

  /** Libera lo propio de la pieza; la geometría de los modelos queda en la biblioteca. */
  private disposePiece(piece: ScenePiece): void {
    piece.group.removeFromParent();
    piece.number?.removeFromParent();
    piece.materials.forEach((material) => material.dispose());
    (piece.shadow.material as MeshBasicMaterial).dispose();
    piece.number?.material.dispose();
  }

  // ---------- Cámara y cuadros ----------

  /** Dónde va la cámara para ver la mesa entera en el espacio libre, y hacia dónde mira. */
  private framing(): [Vector3, Vector3] {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const usefulW = Math.max(0.3, (width - this.free.left - this.free.right) / width);
    const usefulH = Math.max(0.3, (height - this.free.top - this.free.bottom) / height);
    const portrait = width < height;
    const vertical = MathUtils.degToRad(this.camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * this.camera.aspect);
    const toFitWidth =
      (MAYO_TABLE_SIZE.width + (portrait ? 0.22 : 0.06)) / 2 / (Math.tan(horizontal / 2) * usefulW);
    const toFitDepth = (MAYO_TABLE_SIZE.depth + 0.06) / 2 / (Math.tan(vertical / 2) * usefulH);
    const top = this.view === 'top';
    const distance = Math.max(toFitWidth, toFitDepth) * (top ? 1.12 : 1.32);
    // Corre la mesa al centro del espacio libre
    const seenW = 2 * distance * Math.tan(horizontal / 2);
    const seenH = 2 * distance * Math.tan(vertical / 2);
    const dx = ((this.free.right - this.free.left) / 2 / width) * seenW;
    const dz = ((this.free.top - this.free.bottom) / 2 / height) * seenH;
    const target = new Vector3(dx, 0, top || portrait ? -dz : -dz * 0.6);
    // Desde arriba, como el diagrama; en celular, más desde arriba que en escritorio,
    // para que la mesa llene más alto de pantalla
    const direction = (
      top
        ? new Vector3(0, 1, 0.0001)
        : portrait
          ? new Vector3(0, 0.9, 0.45)
          : new Vector3(0, 0.68, 0.73)
    ).normalize();
    return [target.clone().add(direction.multiplyScalar(distance)), target];
  }

  private moveCamera(position: Vector3, target: Vector3, duration = TRAVEL_MS): void {
    if (this.options.reducedMotion) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
    } else {
      this.travel = {
        start: performance.now(),
        from: this.camera.position.clone(),
        to: position,
        targetFrom: this.controls.target.clone(),
        targetTo: target,
        duration,
      };
    }
    this.requestFrame();
  }

  private readonly requestFrame = (): void => {
    if (this.frameRequested) return;
    this.frameRequested = true;
    requestAnimationFrame(this.render);
  };

  private readonly render = (time: number): void => {
    this.frameRequested = false;
    let moving = false;
    if (this.travel) {
      const progress = Math.min(1, (time - this.travel.start) / this.travel.duration);
      // Curva de salida de cuarta potencia
      const eased = 1 - Math.pow(1 - progress, 4);
      this.camera.position.lerpVectors(this.travel.from, this.travel.to, eased);
      this.controls.target.lerpVectors(this.travel.targetFrom, this.travel.targetTo, eased);
      if (progress >= 1) this.travel = null;
      else moving = true;
    }
    // La pieza señalada sube; las demás vuelven a la mesa
    for (const piece of this.pieces) {
      const goal = piece === this.selected ? LIFT : 0;
      const y = piece.group.position.y;
      piece.group.position.y = this.options.reducedMotion ? goal : y + (goal - y) * 0.22;
      if (Math.abs(goal - piece.group.position.y) > 0.0002) moving = true;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.options.onRender?.(this.badgePosition());
    if (moving) this.requestFrame();
  };

  /** Dónde va la insignia del número: sobre la pieza señalada, en píxeles del lienzo. */
  private badgePosition(): { x: number; y: number } | null {
    if (!this.selected) return null;
    const point = this.selected.group.getWorldPosition(new Vector3());
    point.y += 0.03;
    point.project(this.camera);
    return {
      x: (point.x * 0.5 + 0.5) * this.canvas.clientWidth,
      y: (-point.y * 0.5 + 0.5) * this.canvas.clientHeight,
    };
  }

  private readonly onControlsStart = (): void => this.options.onInteract?.();

  private resize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.scaleNumbers();
    // Al girar el celular o cambiar el ancho, la mesa entera vuelve a caber
    if (this.selected === null) this.frame(false);
    else this.requestFrame();
  }

  /** Los números miden 20 px en pantalla a cualquier distancia o ancho. */
  private scaleNumbers(): void {
    const height = Math.max(1, this.canvas.clientHeight);
    const scale = (NUMBER_PX * 2 * Math.tan(MathUtils.degToRad(this.camera.fov) / 2)) / height;
    for (const piece of this.pieces) piece.number?.scale.set(scale, scale, 1);
  }

  // ---------- Tocar una pieza ----------

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerDown = [event.clientX, event.clientY];
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > TAP_PX) return;
    const rect = this.canvas.getBoundingClientRect();
    const pointer = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new Raycaster();
    raycaster.setFromCamera(pointer, this.camera);
    const hit = raycaster
      .intersectObjects(this.piecesGroup.children, true)
      .find((intersection) => !this.isShadow(intersection.object));
    let node: Object3D | null = hit?.object ?? null;
    while (node && node.userData['itemId'] === undefined) node = node.parent;
    this.options.onPick((node?.userData['itemId'] as string | undefined) ?? null);
  };

  private isShadow(object: Object3D): boolean {
    return this.pieces.some((piece) => piece.shadow === object);
  }
}

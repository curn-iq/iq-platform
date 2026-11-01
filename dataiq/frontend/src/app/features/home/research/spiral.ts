/**
 * La espiral de «Lo que dice la investigación» (ver «Layout» en `DESIGN.md`): un pulso
 * de luz sube en espiral, cada vuelta más rápido, y al cerrar cada vuelta se suma un
 * logro. Aquí está la geometría y el tiempo, sin el DOM: el componente solo la pinta.
 * Las coordenadas son las del dibujo (900 × 640).
 */

type Point = readonly [x: number, y: number];

const LAP = 2 * Math.PI;
export const LAPS = 3;
const TOTAL = LAP * LAPS;
const CENTER_X = 360;
const BASE_Y = 540;
/** Lo que sube la espiral en cada vuelta. */
const STEP = 130;
/** Cuánto se aplasta la vuelta para verla en perspectiva. */
const TILT = 0.26;

// Línea de tiempo de un ciclo, en milisegundos
const ENTRY = 500;
const TRAVEL = 4600;
const RISE = 700;
/** Desde aquí el dibujo se apaga, antes de volver a empezar. */
export const FADE_AT = 8300;
export const CYCLE = 9000;
/** El pulso acelera de forma exponencial: cada vuelta tarda menos que la anterior. */
const ACCELERATION = 0.00035;
const INITIAL_SPEED = (TOTAL * ACCELERATION) / (Math.exp(ACCELERATION * TRAVEL) - 1);

/** El momento en que el recorrido termina y el haz ya subió: el dibujo quieto, completo. */
export const COMPLETE_AT = ENTRY + TRAVEL + RISE;

/** Los logros: uno por vuelta, y el último junto al haz. */
export const ACHIEVEMENTS: readonly string[] = [
  'Instrumental reconocido',
  'Posiciones memorizadas',
  'Mesa completa, sin errores',
  'Un paso adelante',
];

function radius(theta: number): number {
  return 130 + (28 * theta) / LAP;
}

function point(theta: number): Point {
  const r = radius(theta);
  return [
    CENTER_X - r * Math.cos(theta),
    BASE_Y - (STEP * theta) / LAP + r * TILT * Math.sin(theta),
  ];
}

const fixed = (value: number): string => value.toFixed(1);

/**
 * Los tramos de la espiral entre dos ángulos, solo los de adelante o solo los de atrás
 * (para dar profundidad se dibujan por separado, con los anillos de los niveles entre
 * ellos).
 */
export function segment(from: number, to: number, front: boolean): string {
  let d = '';
  let inside = false;
  let previous: Point | null = null;
  const steps = Math.max(2, Math.ceil((to - from) / 0.05));
  for (let i = 0; i <= steps; i++) {
    const theta = from + ((to - from) * i) / steps;
    const p = point(theta);
    if (Math.sin(theta) >= 0 === front) {
      if (!inside) d += previous ? `M${fixed(previous[0])} ${fixed(previous[1])}L` : 'M';
      else d += 'L';
      d += `${fixed(p[0])} ${fixed(p[1])}`;
      inside = true;
    } else inside = false;
    previous = p;
  }
  return d;
}

// ---------- Lo que no cambia ----------

export interface Station {
  x: number;
  y: number;
  theta: number;
}

export interface Level {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface Achievement {
  text: string;
  /** Esquina de arriba a la izquierda del logro. */
  x: number;
  y: number;
  /** Ancho de la píldora, según su texto. */
  width: number;
  final: boolean;
}

/** Lo que mide cada letra del texto de un logro (17 px, 600), para dimensionar su píldora. */
const ACHIEVEMENT_CHAR = 9.2;

const top = point(TOTAL);

/** El haz que sale de la cima hacia arriba. */
export const BEAM_LENGTH = top[1] + 120;

export const GEOMETRY = {
  guideBack: segment(0, TOTAL, false),
  guideFront: segment(0, TOTAL, true),
  // Tres puntos por vuelta que se encienden al paso del pulso
  stations: Array.from({ length: LAPS }, (_, lap) =>
    [Math.PI / 9, Math.PI / 2, (8 * Math.PI) / 9].map((angle): Station => {
      const theta = lap * LAP + angle;
      const [x, y] = point(theta);
      return { x, y, theta };
    }),
  ).flat(),
  // El anillo de cada nivel, que destella al cerrar la vuelta
  levels: Array.from({ length: LAPS }, (_, lap): Level => {
    const r = radius((lap + 1) * LAP);
    return { cx: CENTER_X, cy: BASE_Y - STEP * (lap + 1), rx: r, ry: r * TILT };
  }),
  achievements: ACHIEVEMENTS.map((text, index): Achievement => {
    const final = index === LAPS;
    const x = final ? top[0] + 22 : CENTER_X + radius((index + 0.5) * LAP) + 18;
    const y = final ? top[1] - 96 : BASE_Y - STEP * (index + 0.5);
    return { text, x, y: y - 22, width: text.length * ACHIEVEMENT_CHAR + 62, final };
  }),
  beam: `M${fixed(top[0])} ${fixed(top[1])} V-120`,
  top,
} as const;

// ---------- Un cuadro ----------

export interface SpiralFrame {
  /** Lo que va recorrido de la espiral, en radianes. */
  theta: number;
  /** Lo mismo, de 0 a 1. */
  progress: number;
  /** La luz que deja el pulso, por detrás y por delante de los niveles. */
  lightBack: string;
  lightFront: string;
  tail: string;
  pulse: { x: number; y: number; radius: number; visible: boolean };
  /** Lo que falta del haz por trazar. */
  beamOffset: number;
  ambient: number;
  /** Qué estaciones ya pasó el pulso. */
  lit: boolean[];
  /** Cuántas vueltas lleva cerradas. */
  lap: number;
  /** Qué logros ya aparecieron. */
  achieved: boolean[];
  complete: boolean;
  /** El dibujo se apaga para volver a empezar. */
  fading: boolean;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** El cuadro de la animación `t` milisegundos después de empezar el ciclo. */
export function spiralFrame(t: number): SpiralFrame {
  const theta =
    t < ENTRY
      ? 0
      : Math.min(
          TOTAL,
          (INITIAL_SPEED / ACCELERATION) * (Math.exp(ACCELERATION * (t - ENTRY)) - 1),
        );
  const rise = clamp01((t - ENTRY - TRAVEL) / RISE);
  const [px, py] = point(theta);
  const tailFrom = Math.max(0, theta - 0.9);
  const [tx, ty] = point(tailFrom);
  const lap = Math.min(LAPS, Math.floor(theta / LAP + 1e-9));
  return {
    theta,
    progress: theta / TOTAL,
    lightBack: theta > 0 ? segment(0, theta, false) : '',
    lightFront: theta > 0 ? segment(0, theta, true) : '',
    tail:
      theta > 0 && rise < 1
        ? `M${fixed(tx)} ${fixed(ty)}${segment(tailFrom, theta, true).replace(/^M[^L]*/, '')}`
        : '',
    pulse: {
      x: px,
      y: py - rise * rise * (BEAM_LENGTH + 30),
      radius: Math.sin(theta) < 0 && theta < TOTAL ? 3.5 : 5,
      visible: rise < 1,
    },
    beamOffset: BEAM_LENGTH * (1 - rise),
    ambient: 0.45 + (0.55 * theta) / TOTAL,
    lit: GEOMETRY.stations.map((station) => theta >= station.theta),
    lap,
    achieved: ACHIEVEMENTS.map((_, index) => (index < LAPS ? lap > index : rise >= 1)),
    complete: theta >= TOTAL,
    fading: t > FADE_AT,
  };
}

// ---------- Motas de luz ----------

export interface Mote {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  /** Cuánto sube por milisegundo. */
  speed: number;
  phase: number;
  base: number;
}

/** Motas de luz que suben despacio alrededor de la espiral; el azar es siempre el mismo. */
export function createMotes(count = 34): Mote[] {
  let seed = 5;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, () => {
    const radiusValue = 0.8 + random() * 1.8;
    return {
      x: 120 + random() * 520,
      y: random() * 640,
      radius: radiusValue,
      speed: 0.012 + random() * 0.03,
      phase: random() * 6.3,
      base: 0.25 + random() * 0.55,
      opacity: 0,
    };
  });
}

/** Avanza las motas `dt` milisegundos; con `boost` (0 a 1) suben más rápido. */
export function stepMotes(motes: readonly Mote[], dt: number, boost: number): Mote[] {
  return motes.map((mote) => {
    let y = mote.y - mote.speed * dt * (1 + boost * 2.5);
    if (y < -10) y += 660;
    const phase = mote.phase + dt * 0.0012;
    const height = 1 - Math.abs(y - 340) / 360;
    return {
      ...mote,
      y,
      phase,
      x: mote.x,
      opacity: Math.max(0, mote.base * height),
    };
  });
}

/** Dónde se dibuja una mota: se mece de lado a lado alrededor de su sitio. */
export function motePosition(mote: Mote): Point {
  return [mote.x + Math.sin(mote.phase) * 6, mote.y];
}

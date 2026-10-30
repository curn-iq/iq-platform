/**
 * Los dibujos del instrumental y de los objetos planos, tomados del mockup de
 * la técnica (`diseno/mockups/tecnica.html`) como datos: la plantilla los pinta
 * como SVG, sin `innerHTML` (ver «Seguridad» en el README).
 *
 * Cada pieza de acero está en coordenadas locales: vertical, con la punta en
 * `y = 0` y los anillos o el mango hacia `y = 100`. Cada objeto plano está
 * centrado en el origen. El diagrama los coloca y los escala (`piece-layout.ts`).
 */

/** El material de cada parte; `diagram.scss` lo pinta con los tokens del acero y de lo plano. */
export type PartStyle =
  | 'steel'
  | 'blade'
  | 'box'
  | 'groove'
  | 'tip'
  | 'cloth'
  | 'fold'
  | 'weave'
  | 'tray-rim'
  | 'tray-floor'
  | 'rubber'
  | 'rubber-glint'
  | 'thread';

interface PartBase {
  style: PartStyle;
  transform?: string;
}

export type Part =
  | (PartBase & { shape: 'path'; d: string; evenodd?: boolean })
  | (PartBase & {
      shape: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      rx: number;
    })
  | (PartBase & { shape: 'circle'; cx: number; cy: number; r: number });

export interface Drawing {
  /** `steel` es instrumental; `flat` es tela, bandeja o caucho: va plano y sin brillo. */
  kind: 'steel' | 'flat';
  parts: Part[];
}

/** Los dibujos del instrumental en acero. */
export type SteelKey =
  | 'scalpel'
  | 'metzenbaum'
  | 'mayo'
  | 'dissecting'
  | 'farabeuf'
  | 'senn'
  | 'allis'
  | 'lahey'
  | 'rochester'
  | 'mosquito'
  | 'kelly'
  | 'cystic'
  | 'towelClamp'
  | 'energy'
  | 'needleHolder'
  | 'frazier';

/** Los dibujos de lo plano: tela, bandeja y caucho. */
export type FlatKey = 'drapePack' | 'sponges' | 'tray' | 'suctionTubing' | 'threadedSponge';

export type DrawingKey = SteelKey | FlatKey;

/** Redondea para que los números de las rutas no arrastren decimales de coma flotante. */
const round = (value: number): number => Math.round(value * 1000) / 1000;

const path = (style: PartStyle, d: string, extra: Partial<PartBase> = {}): Part => ({
  shape: 'path',
  style,
  d,
  ...extra,
});

const rect = (
  style: PartStyle,
  x: number,
  y: number,
  width: number,
  height: number,
  rx: number,
  extra: Partial<PartBase> = {},
): Part => ({ shape: 'rect', style, x, y, width, height, rx, ...extra });

/** Un anillo de mango, con el hueco (relleno par-impar), centrado en `cx` sobre `y = 92`. */
function ring(cx: number): Part {
  return {
    shape: 'path',
    style: 'steel',
    evenodd: true,
    d:
      `M${round(cx - 7)} 92a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z ` +
      `M${round(cx - 4.3)} 92a4.3 4.3 0 1 0 8.6 0a4.3 4.3 0 1 0 -8.6 0Z`,
  };
}

/** Los dos anillos con sus brazos y la caja del cierre; `ratchet` suma la cremallera. */
function handles(boxY: number, ratchet: boolean): Part[] {
  const parts = [
    ring(-7.6),
    ring(7.6),
    path('steel', `M-10.8 87.4 L-2.9 ${boxY + 8} L-0.7 ${boxY + 8} L-4.6 86.1 Z`),
    path('steel', `M10.8 87.4 L2.9 ${boxY + 8} L0.7 ${boxY + 8} L4.6 86.1 Z`),
  ];
  if (ratchet) parts.push(path('box', 'M-5.6 79.5 l2.6 -1.6 v3.2z M5.6 79.5 l-2.6 -1.6 v3.2z'));
  parts.push(rect('box', -3.4, boxY, 6.8, 8.6, 1.4));
  return parts;
}

/** Las estrías del agarre: una raya corta cada 3,2 unidades. */
function grooves(from: number, to: number, x: number, width: number): Part[] {
  const parts: Part[] = [];
  for (let y = from; y < to; y += 3.2)
    parts.push(path('groove', `M${x} ${y.toFixed(1)} h${width}`));
  return parts;
}

/** Una tijera: `joint` es dónde cierran las hojas, `tip` dónde están las puntas y `half` su ancho. */
function scissors(joint: number, tip: number, half: number): Part[] {
  const w = half;
  const body =
    `M${round(-w)} ${joint} C${round(-w * 1.1)} ${joint - 16} ${round(-w * 0.8)} ${tip + 8} ` +
    `${round(w * 0.25)} ${tip + 1.5} Q${round(w * 0.7)} ${tip} ${round(w * 0.95)} ${tip + 2.2} ` +
    `C${round(w * 1.05)} ${tip + 10} ${round(w * 1.15)} ${joint - 16} ${w} ${joint} Z`;
  return [
    ...handles(joint, false),
    path('steel', body),
    path('groove', `M0 ${joint} C0 ${joint - 16} .3 ${tip + 9} 1.2 ${tip + 2.2}`),
  ];
}

type SteelDrawing = Drawing & { kind: 'steel' };
type FlatDrawing = Drawing & { kind: 'flat' };

const steel = (parts: Part[]): SteelDrawing => ({ kind: 'steel', parts });
const flat = (parts: Part[]): FlatDrawing => ({ kind: 'flat', parts });

/** Cada clave dice si es acero o plano: un dibujo de acero no puede quedar como plano, ni al revés. */
export const DRAWINGS: Record<SteelKey, SteelDrawing> & Record<FlatKey, FlatDrawing> = {
  scalpel: steel([
    rect('steel', -3.6, 32, 7.2, 68, 1.8),
    ...grooves(64, 94, -2.5, 5),
    path('blade', 'M-2.3 33 L-2.3 15 C-2.3 7 1.6 1.5 3.6 4.8 C5 8 3.4 18 2.3 33 Z'),
  ]),
  metzenbaum: steel(scissors(52, 16, 2.6)),
  mayo: steel(scissors(46, 6, 3.6)),
  dissecting: steel([
    {
      shape: 'path',
      style: 'steel',
      evenodd: true,
      d:
        'M-1.3 0 L-5.4 66 Q-6 97 0 100 Q6 97 5.4 66 L1.3 0 Z ' +
        'M-0.35 7 L-3.2 66 Q-3.4 90 0 92 Q3.4 90 3.2 66 L0.35 7 Z',
    },
    ...grooves(40, 64, -4.6, 1.6),
    ...grooves(40, 64, 3, 1.6),
  ]),
  farabeuf: steel([
    path('steel', 'M-13 4 H2.4 V96 H-15 V91 H-2.4 V9 H-13 Z'),
    path('groove', 'M-0.6 22 V78'),
  ]),
  senn: steel([
    rect('steel', -1.9, 16, 3.8, 68, 1.2),
    ...grooves(40, 62, -1.3, 2.6),
    rect('steel', -5.4, 13.5, 10.8, 3.2, 1),
    path('tip', 'M-4.2 14 V4.5 Q-4.2 2 -2.2 3.4 M0 14 V3.5 Q0 1 2 2.4 M4.2 14 V4.5 Q4.2 2 6.2 3.4'),
    rect('steel', -6.8, 83.5, 13.6, 6, 1.5),
  ]),
  allis: steel([
    ...handles(44, true),
    path('steel', 'M-1.9 44 L-1.3 11 L-4.3 6.5 L-4.3 2 L4.3 2 L4.3 6.5 L1.3 11 L1.9 44 Z'),
    path('groove', 'M-3.8 3.3 h7.6'),
  ]),
  lahey: steel([
    ...handles(44, true),
    path(
      'steel',
      'M-2.1 44 L-1.5 9 L-3.8 3.2 L-2.6 2 L-0.5 6.2 L0.5 6.2 L2.6 2 L3.8 3.2 L1.5 9 L2.1 44 Z',
    ),
  ]),
  rochester: steel([
    ...handles(44, true),
    path('steel', 'M-2.8 44 L-1.7 6 Q0 2 1.7 6 L2.8 44 Z'),
    ...grooves(10, 42, -1.5, 3),
  ]),
  mosquito: steel([
    ...handles(46, true),
    path('steel', 'M-2.3 46 C-2.3 32 -1.2 20 2.6 9.5 Q4.2 8 3.9 10.6 C1.8 20 1.9 32 2.3 46 Z'),
    path('groove', 'M0 46 C0 32 .6 20 3 10'),
  ]),
  kelly: steel([
    ...handles(44, true),
    path('steel', 'M-2.4 44 L-1.4 8 Q0 4 1.4 8 L2.4 44 Z'),
    ...grooves(10, 40, -1.2, 2.4),
  ]),
  cystic: steel([
    ...handles(46, true),
    path('steel', 'M-2.4 46 C-2.4 30 -1 18 4 8 Q6 6 5.4 9.2 C1.8 18 1.6 30 2.4 46 Z'),
  ]),
  towelClamp: steel([
    ...handles(50, true),
    path(
      'steel',
      'M-2.6 50 C-3.6 34 -7.4 21 -3.4 9 Q-0.6 2 3.4 3.6 Q0 6.4 -0.8 12.4 C-2.2 23 -0.8 35 0 50 Z',
    ),
    path(
      'steel',
      'M2.6 50 C3.6 34 7.4 21 3.4 9 Q0.6 2 -3.4 3.6 Q0 6.4 0.8 12.4 C2.2 23 0.8 35 0 50 Z',
    ),
  ]),
  energy: steel([...scissors(50, 12, 2.4), rect('box', -1.2, 96, 2.4, 9, 1)]),
  needleHolder: steel([
    ...handles(56, true),
    path('steel', 'M-3 56 L-2.4 14 Q0 9 2.4 14 L3 56 Z'),
    ...grooves(16, 30, -1.6, 3.2),
  ]),
  frazier: steel([
    rect('steel', -3.4, 70, 6.8, 30, 1.6),
    { shape: 'circle', style: 'box', cx: 0, cy: 78, r: 1.6 },
    path('steel', 'M-1.4 70 L-1.4 22 L-6.2 5 L-4 4 L1.4 20 L1.4 70 Z'),
  ]),
  drapePack: flat([
    rect('cloth', -34, -26, 68, 52, 4),
    rect('cloth', -30, -30, 60, 48, 4),
    path('fold', 'M-30 -14 H30 M-30 2 H30 M0 -30 V18'),
  ]),
  sponges: flat([
    rect('cloth', -30, -24, 50, 42, 3, { transform: 'rotate(-8)' }),
    path('fold', 'M-26 -6 H16', { transform: 'rotate(-8)' }),
    rect('cloth', -12, -14, 40, 36, 2, { transform: 'rotate(6)' }),
    path(
      'weave',
      'M-6 -14 V22 M2 -14 V22 M10 -14 V22 M18 -14 V22 M-12 -6 H28 M-12 2 H28 M-12 10 H28',
      {
        transform: 'rotate(6)',
      },
    ),
  ]),
  tray: flat([rect('tray-rim', -38, -28, 76, 56, 8), rect('tray-floor', -31, -21, 62, 42, 5)]),
  suctionTubing: flat([
    path('rubber', 'M-30 26 C-46 -8 -6 -36 14 -18 C34 0 6 28 -10 10 C-22 -4 8 -20 30 -30'),
    path('rubber-glint', 'M-30 26 C-46 -8 -6 -36 14 -18 C34 0 6 28 -10 10 C-22 -4 8 -20 30 -30'),
  ]),
  threadedSponge: flat([
    rect('cloth', -34, -30, 68, 60, 4),
    path('fold', 'M-34 0 H34'),
    path('thread', 'M14 -20 c10 4 10 16 0 20 c-8 3 -14 -2 -10 -8'),
  ]),
};

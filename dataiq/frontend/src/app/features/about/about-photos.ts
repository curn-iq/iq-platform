import type { ImageLoader } from '@angular/common';

/** Una foto de `public/nosotros/`: `name` es el prefijo de sus archivos `<name>-<ancho>.webp`. */
export interface AboutPhoto {
  readonly name: string;
  /** Qué muestra, para quien no la ve. */
  readonly alt: string;
  /** El tamaño del archivo más grande, para que el navegador reserve el lugar. */
  readonly width: number;
  readonly height: number;
  /** El encuadre en escritorio, si no es el centrado (`object-position`). */
  readonly desktopPosition?: string;
}

/**
 * Las cuatro fotos del carrusel, en su orden (Resuelto 67 de `dataiq/docs/checklist-frontend.md`):
 * la del equipo primero y tres del laboratorio. Los textos alternativos son los pies que el Figma
 * pone a cada una.
 */
export const CAROUSEL_PHOTOS: readonly AboutPhoto[] = [
  {
    name: 'carrusel-1',
    alt: 'Parte del equipo en el laboratorio.',
    width: 2400,
    height: 1800,
    // En escritorio el Figma encuadra la foto un poco más arriba que el centro, para ver las cabezas
    desktopPosition: '50% 16%',
  },
  {
    name: 'carrusel-2',
    alt: 'El laboratorio de Instrumentación Quirúrgica.',
    width: 2400,
    height: 1367,
  },
  {
    name: 'carrusel-3',
    alt: 'Quirófano de simulación: la mesa de Mayo sobre el campo.',
    width: 2400,
    height: 1367,
  },
  {
    name: 'carrusel-4',
    alt: 'Mesa de Mayo vestida, lista para el instrumental.',
    width: 2400,
    height: 1367,
  },
];

/** Los anchos de cada foto del carrusel en `public/nosotros/`, para el `srcset`. */
export const CAROUSEL_SRCSET = '800w, 1500w, 2400w';

/**
 * El cargador de `NgOptimizedImage` para las fotos de «Nosotros»: arma `/nosotros/<nombre>-<ancho>.webp`.
 * `defaultWidth` es el ancho del `src` (el que usa un navegador sin `srcset`) y tiene que existir.
 */
export function aboutImageLoader(defaultWidth: number): ImageLoader {
  return ({ src, width }) => `/nosotros/${src}-${width ?? defaultWidth}.webp`;
}

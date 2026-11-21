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

/** Un programa de «Los dos programas»: su nombre, su foto y dos párrafos (los textos del Figma). */
export interface AboutProgram {
  readonly id: string;
  readonly name: string;
  readonly photo: AboutPhoto;
  readonly paragraphs: readonly string[];
}

/**
 * Instrumentación Quirúrgica y después Ingeniería de Sistemas (Resuelto 68). Las fotos son de Pexels,
 * ilustrativas y sin relación con el equipo (Resuelto 71): son decorativas para un lector de pantalla y
 * llevan la marca «foto ilustrativa · Pexels».
 */
export const PROGRAMS: readonly AboutProgram[] = [
  {
    id: 'instrumentacion',
    name: 'Instrumentación Quirúrgica',
    photo: { name: 'programa-instrumentacion', alt: '', width: 1423, height: 1067 },
    paragraphs: [
      'Equipo encargado de suministrar la información de la plataforma: las técnicas quirúrgicas, el instrumental de cada una y su lugar en la mesa de Mayo y en la de reserva. También revisa y corrige el contenido antes de que llegue a los estudiantes.',
      'Además, arma las mesas reales en el laboratorio y toma las fotos y los videos del instrumental con los que se entrena la cámara de SIVRI.',
    ],
  },
  {
    id: 'sistemas',
    name: 'Ingeniería de Sistemas',
    photo: { name: 'programa-sistemas', alt: '', width: 1423, height: 1067 },
    paragraphs: [
      'Equipo encargado de digitalizar la información de las técnicas en el catálogo de DataIQ, de entrenar el modelo YOLO que reconoce el instrumental en SIVRI y de configurar la infraestructura en la nube donde corre la plataforma.',
      'También construye la mesa en 3D de SIMIQ3D, el chat que responde con los datos del catálogo y el etiquetado de las fotos que enseñan a la cámara a reconocer cada pieza.',
    ],
  },
];

/** Los anchos de cada foto de los programas en `public/nosotros/`, para el `srcset`. */
export const PROGRAM_SRCSET = '750w, 1423w';

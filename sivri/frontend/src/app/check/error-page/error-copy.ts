import type { ErrorKind } from '../../domain/flow';
import { TECHNIQUES_URL } from '../../links';

/** Qué hace el botón de una página de estado. */
export type ErrorAction = 'restart' | 'review' | 'login';

export interface ErrorCopy {
  /** La palabra pequeña sobre el titular. */
  readonly eyebrow: string;
  readonly title: string;
  readonly text: string;
  readonly primary: { readonly label: string; readonly action: ErrorAction };
  /** Un enlace con flecha bajo el botón. */
  readonly link?: { readonly label: string; readonly href: string };
}

/**
 * Lo que dice cada estado de error: páginas de texto con titular, párrafo y una acción, sin
 * pictogramas (`DESIGN.md`, «SIVRI: celular y computador (mockups)»). Los tres primeros son los
 * de los mockups (sin conexión, cámara bloqueada y técnica fuera del alcance).
 */
export const ERROR_COPY: Record<ErrorKind, ErrorCopy> = {
  'no-connection': {
    eyebrow: 'Sin conexión',
    title: 'No hay conexión con SIVRI.',
    text: 'El servidor que reconoce las piezas no responde. Revisa la conexión del celular y vuelve a intentarlo.',
    primary: { label: 'Intentar de nuevo', action: 'restart' },
  },
  'camera-blocked': {
    eyebrow: 'Cámara',
    title: 'La cámara está bloqueada.',
    text: 'SIVRI necesita la cámara para ver la mesa. Toca el candado junto a la dirección, permite la cámara y vuelve aquí.',
    primary: { label: 'Ya la permití', action: 'restart' },
  },
  'no-camera': {
    eyebrow: 'Cámara',
    title: 'No se encontró una cámara.',
    text: 'SIVRI necesita ver la mesa con la cámara. Revisa que ninguna otra aplicación la esté usando, o abre esta dirección en el navegador de un celular.',
    primary: { label: 'Intentar de nuevo', action: 'restart' },
  },
  'session-ended': {
    eyebrow: 'Sesión',
    title: 'Tu sesión terminó.',
    text: 'Ingresa de nuevo para seguir revisando la mesa.',
    primary: { label: 'Ingresar', action: 'login' },
  },
  'unsupported-technique': {
    eyebrow: 'Técnica',
    title: 'Esta mesa todavía no se puede revisar.',
    text: 'Por ahora SIVRI reconoce las mesas de Mayo de Colecistectomía, Eventrorrafia, Hemicolectomía derecha, Mastectomía y Tiroidectomía.',
    primary: { label: 'Revisar de nuevo', action: 'restart' },
    link: { label: 'Ver las técnicas en DataIQ', href: TECHNIQUES_URL },
  },
  'not-recognized': {
    eyebrow: 'Mesa',
    title: 'No se reconoce la técnica.',
    text: 'SIVRI ve la mesa, pero no se parece a ninguna de las cinco técnicas. Revisa que los instrumentos estén armados como lo publicó el programa de IQ.',
    primary: { label: 'Revisar de nuevo', action: 'review' },
    link: { label: 'Ver las mesas en DataIQ', href: TECHNIQUES_URL },
  },
};

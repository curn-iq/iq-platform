/** Los cuatro menús de la barra. */
export type NavMenuId = 'tools' | 'specialties' | 'why' | 'help';

/**
 * A dónde lleva una opción: una ruta de esta app (`route`, con su fragmento o
 * sus parámetros) o una página que es de otra app (`href`), que se abre con
 * navegación completa (Resuelto 17 de `dataiq/docs/checklist-frontend.md`).
 */
export interface NavTarget {
  readonly route?: string;
  readonly fragment?: string;
  readonly queryParams?: Readonly<Record<string, string>>;
  readonly href?: string;
}

export interface NavOption {
  readonly label: string;
  readonly hint: string;
  readonly target: NavTarget;
  /** Solo en Herramientas: lo que muestra la vista previa al señalar la opción. */
  readonly tool?: NavTool;
}

export type ToolPictogramName = 'data' | '3d' | 'camera';

export interface NavTool {
  readonly pictogram: ToolPictogramName;
  readonly capabilities: readonly string[];
}

/** Lo que muestra la vista previa (la columna de la derecha) del desplegable. */
export type NavPreview =
  | { readonly kind: 'tools' }
  | { readonly kind: 'specialties' }
  | { readonly kind: 'phrase'; readonly start: string; readonly accent: string }
  | { readonly kind: 'questions'; readonly title: string; readonly items: readonly string[] };

export interface NavMenu {
  readonly id: NavMenuId;
  /** El texto del botón de la barra y el nombre (titular) de su desplegable. */
  readonly label: string;
  readonly line: string;
  /** Enlace con flecha bajo la línea, si el desplegable lo tiene. */
  readonly headerLink?: { readonly label: string; readonly target: NavTarget };
  /** Las opciones; las de Especialidades salen de la API. */
  readonly options?: readonly NavOption[];
  readonly preview: NavPreview;
  /** Un segundo clic sobre el botón, con el desplegable abierto, lleva aquí. */
  readonly destination?: string;
}

/** Al catálogo de técnicas, o de una especialidad. */
export const CATALOG_ROUTE = '/tecnicas';

// Los textos son los de `diseno/mockups/inicio.html`. En el MVP «¿Por qué IQ
// Platform?» no lleva «Quiénes somos» (Resuelto 26 de la checklist): no tiene
// texto. Las opciones que llevan al inicio van a su sección (`#camino`…).
export const NAV_MENUS: readonly NavMenu[] = [
  {
    id: 'tools',
    label: 'Herramientas',
    line: 'Tres formas de recorrer cada técnica.',
    options: [
      {
        label: 'DataIQ',
        hint: 'Cada técnica, con su instrumental y su mesa',
        target: { route: CATALOG_ROUTE },
        tool: {
          pictogram: 'data',
          capabilities: [
            'Buscar por nombre o especialidad',
            'Mesa de Mayo y de reserva, pieza por pieza',
            'Datos clínicos, suturas y equipos',
          ],
        },
      },
      {
        label: 'SIMIQ3D',
        hint: 'La mesa en 3D, a una pregunta de distancia',
        target: { href: '/simiq3d/' },
        tool: {
          pictogram: '3d',
          capabilities: [
            'Pedir cualquier técnica conversando',
            'Girar y recorrer la mesa',
            'Tocar una pieza para ver qué es',
          ],
        },
      },
      {
        label: 'SIVRI',
        hint: 'La cámara revisa la mesa armada',
        target: { href: '/sivri/' },
        tool: {
          pictogram: 'camera',
          capabilities: [
            'Reconoce el instrumental en tiempo real',
            'Lo compara con la técnica elegida',
            'Señala qué hay que mover',
          ],
        },
      },
    ],
    preview: { kind: 'tools' },
  },
  {
    id: 'specialties',
    label: 'Especialidades',
    line: 'Cada técnica, con su instrumental y su mesa.',
    headerLink: { label: 'Ver todas las técnicas', target: { route: CATALOG_ROUTE } },
    preview: { kind: 'specialties' },
    destination: CATALOG_ROUTE,
  },
  {
    id: 'why',
    label: '¿Por qué IQ Platform?',
    line: 'Qué hay detrás de cada herramienta.',
    options: [
      {
        label: 'Cómo funciona',
        hint: 'Las tres herramientas, juntas',
        target: { route: '/', fragment: 'camino' },
      },
      {
        label: 'La investigación',
        hint: 'Por qué practicar así',
        target: { route: '/', fragment: 'investigacion' },
      },
    ],
    preview: { kind: 'phrase', start: 'Con respuesta inmediata, ', accent: 'se aprende antes.' },
  },
  {
    id: 'help',
    label: 'Ayuda',
    line: 'Respuestas cortas para empezar.',
    options: [
      {
        label: 'Preguntas frecuentes',
        hint: 'Cuenta, técnicas y herramientas',
        target: { route: '/', fragment: 'preguntas' },
      },
      {
        label: 'Guía para estudiantes',
        hint: 'Por dónde empezar',
        target: { route: '/', fragment: 'quien' },
      },
      {
        label: 'Para docentes',
        hint: 'Acompañar la práctica',
        target: { route: '/', fragment: 'quien' },
      },
    ],
    preview: {
      kind: 'questions',
      title: 'Lo más preguntado',
      items: [
        '¿Cuánto cuesta?',
        '¿Sirve si estudio en otra universidad?',
        '¿Por cuál herramienta empiezo?',
      ],
    },
  },
];

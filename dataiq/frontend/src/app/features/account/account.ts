import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { safeReturnUrl } from '../../core/session/login-path';
import { TechniquesRepository } from '../../data/techniques.repository';
import {
  AccountMode,
  accountModeOf,
  ACCOUNT_SEGMENTS,
  greeting,
  techniqueIdOfReturnUrl,
} from '../../domain/account-entry';
import { mediaQuery, REDUCED_MOTION_QUERY } from '../../shared/media-query';
import { Button } from '../../shared/ui/button/button';
import { TabItem, Tabs } from '../../shared/ui/tabs/tabs';
import { TextField } from '../../shared/ui/text-field/text-field';
import { LockedTechnique } from './locked-technique';
import { LoginIllustration } from './login-illustration';
import { RegisterIllustration } from './register-illustration';

/** Cuánto dura el cambio de lado de las mitades (FLIP), según «Ingresar / Crear cuenta (página)» de `DESIGN.md`. */
const SWAP_MS = 700;

/** Las pestañas: enlaces a cada pantalla, que conservan `?volver=`. */
const TABS: readonly TabItem[] = [
  {
    key: 'login',
    label: 'Ingresar',
    link: ['/cuenta', ACCOUNT_SEGMENTS.login],
    queryParamsHandling: 'preserve',
  },
  {
    key: 'register',
    label: 'Crear cuenta',
    link: ['/cuenta', ACCOUNT_SEGMENTS.register],
    queryParamsHandling: 'preserve',
  },
];

const TITLES: Record<AccountMode, string> = {
  login: 'Ingresar a IQ Platform',
  register: 'Crear una cuenta gratis',
};

/** Dónde estaban las dos mitades la última vez que se pintaron. */
interface Layout {
  readonly inverted: boolean;
  readonly asideLeft: number;
  readonly paneLeft: number;
}

/**
 * Ingresar y Crear cuenta en una sola pantalla (`/cuenta/ingresar`, `/cuenta/crear`,
 * `cuenta.html`): la puerta del shell. A la izquierda, la técnica que se quería abrir
 * (`?volver=/tecnicas/:id/…`) con su contenido bloqueado, o, si se entró directo, un saludo
 * según la hora con su ilustración; a la derecha, las pestañas y el formulario. Sin
 * «Continuar con Google» ni «¿Olvidaste tu contraseña?» en el MVP (Resuelto 20).
 *
 * Con el ingreso directo, al pasar a Crear cuenta las mitades cambian de lado (FLIP). Con
 * una técnica no, para que no se mueva lo que la persona quería abrir.
 *
 * Los formularios aún no envían: el registro y el ingreso llegan en sus propias casillas
 * de la fase 5 (`dataiq/docs/checklist-frontend.md`).
 */
@Component({
  selector: 'app-account',
  imports: [
    Button,
    FormField,
    LockedTechnique,
    LoginIllustration,
    RegisterIllustration,
    Tabs,
    TextField,
  ],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:resize)': 'remember()' },
})
export class AccountEntry {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly tabs = TABS;
  protected readonly mode = computed<AccountMode>(
    () => accountModeOf(this.params().get('modo')) ?? 'login',
  );
  protected readonly title = computed(() => TITLES[this.mode()]);

  /** La técnica a la que se iba, si `?volver=` es la ruta de una; un id imposible ni se pide. */
  private readonly techniqueId = computed(() =>
    techniqueIdOfReturnUrl(safeReturnUrl(this.query().get('volver'))),
  );
  private readonly technique = inject(TechniquesRepository).get(() => this.techniqueId());

  /** Los datos de la técnica, cuando llegan. */
  protected readonly loadedTechnique = computed(() =>
    this.technique.hasValue() ? this.technique.value() : undefined,
  );

  /**
   * La mitad izquierda muestra la técnica mientras llega y cuando llegó. Si no existe o la API
   * falla, no hay qué mostrar y vuelve a ser el saludo: no se queda en blanco.
   */
  protected readonly hasTechnique = computed(
    () => this.techniqueId() !== undefined && this.technique.error() === undefined,
  );

  /** Las mitades cambian de lado solo en el ingreso directo, al crear la cuenta. */
  protected readonly inverted = computed(() => this.mode() === 'register' && !this.hasTechnique());

  private readonly hour = new Date().getHours();
  protected readonly greeting = computed(() => greeting(this.mode(), this.hour));

  protected readonly loginForm = form(signal({ email: '', password: '' }));
  protected readonly registerForm = form(signal({ name: '', email: '', password: '' }));

  private readonly aside = viewChild.required<ElementRef<HTMLElement>>('aside');
  private readonly pane = viewChild.required<ElementRef<HTMLElement>>('pane');
  private readonly reduced = mediaQuery(REDUCED_MOTION_QUERY);
  private layout: Layout | undefined;

  constructor() {
    // FLIP: cuando las mitades cambian de lado, cada una parte de donde estaba y se desliza al
    // sitio nuevo. Se compara con dónde estaban la última vez que se pintaron.
    afterRenderEffect(() => {
      const inverted = this.inverted();
      const reduced = this.reduced();
      const before = this.layout;
      const now = this.measure(inverted);
      this.layout = now;
      if (!before || before.inverted === inverted || reduced) return;
      this.slide(this.aside().nativeElement, before.asideLeft - now.asideLeft);
      this.slide(this.pane().nativeElement, before.paneLeft - now.paneLeft);
    });
  }

  /** Al cambiar el tamaño de la ventana las mitades cambian de sitio sin que nada se anime. */
  protected remember(): void {
    this.layout = this.measure(this.inverted());
  }

  /** Mientras los formularios no envían, solo evitan que el navegador recargue con los datos en la URL. */
  protected onSubmit(event: Event): void {
    event.preventDefault();
  }

  private measure(inverted: boolean): Layout {
    return {
      inverted,
      asideLeft: this.aside().nativeElement.getBoundingClientRect().left,
      paneLeft: this.pane().nativeElement.getBoundingClientRect().left,
    };
  }

  private slide(element: HTMLElement, distance: number): void {
    if (Math.abs(distance) <= 1 || typeof element.animate !== 'function') return;
    element.animate([{ transform: `translateX(${distance}px)` }, { transform: 'none' }], {
      duration: SWAP_MS,
      easing: 'cubic-bezier(.16, 1, .3, 1)',
    });
  }
}

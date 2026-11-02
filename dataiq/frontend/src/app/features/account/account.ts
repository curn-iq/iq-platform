import { HttpErrorResponse } from '@angular/common/http';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { describeApiError } from '../../core/http/error-message';
import { NoticeService } from '../../core/notice/notice.service';
import { returnTarget, safeReturnUrl } from '../../core/session/login-path';
import { SessionService } from '../../core/session/session.service';
import { AuthRepository } from '../../data/auth.repository';
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
import { CheckboxField } from '../../shared/ui/checkbox-field/checkbox-field';
import { TabItem, Tabs } from '../../shared/ui/tabs/tabs';
import { TextField } from '../../shared/ui/text-field/text-field';
import { emptyLogin, loginSchema } from './login-form';
import { LockedTechnique } from './locked-technique';
import { LoginIllustration } from './login-illustration';
import { RegisterIllustration } from './register-illustration';
import { emptyRegistration, registrationSchema } from './registration-form';

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

/**
 * Lo que dice el aviso cuando no se pudo crear la cuenta por un correo repetido, o por algo que
 * no tiene un texto propio. Es **neutro a propósito**: la API responde 409 con «Ya hay una cuenta
 * con ese correo», y repetirlo (o marcar el campo del correo) le diría a quien prueba correos cuáles
 * tienen cuenta. Es una mitigación visual temporal; el 409 sigue en el backend (ver «Hallazgos de
 * seguridad pendientes» en `dataiq/docs/checklist-backend.md`). Decidido por Juan el 2026-11-01.
 */
const REGISTRATION_FAILED =
  'No se pudo completar el registro. Verificar los datos e intentar de nuevo.';

/** La cuenta ya existe y lo que falló fue ingresar: que no se registre otra vez. */
const SIGN_IN_AFTER_REGISTRATION_FAILED =
  'La cuenta se creó, pero no se pudo ingresar. Intentar de nuevo con ese correo y esa contraseña.';

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
 * **Crear cuenta** valida al enviar (un mensaje bajo cada campo, sin enviar nada si algo falla),
 * manda el registro con la aceptación del aviso de privacidad (`accepts_policy`), ingresa sola con
 * las mismas credenciales (la API crea la cuenta pero no inicia sesión) y va a `?volver=` o al
 * catálogo. **Ingresar** valida igual, manda `POST /auth/login` y va al mismo sitio; con una
 * contraseña incorrecta dice lo que responde la API («Correo o contraseña incorrectos», que no
 * delata si el correo existe), deja el correo, vacía la contraseña y le da el foco. Cada intento
 * quita los errores del anterior.
 *
 * Quien tiene sesión no se queda aquí: `guestGuard` no espera a `GET /auth/me`, así que si la
 * respuesta llega con la pantalla abierta, se hace lo mismo que él.
 */
@Component({
  selector: 'app-account',
  imports: [
    Button,
    CheckboxField,
    FormField,
    LockedTechnique,
    LoginIllustration,
    RegisterIllustration,
    RouterLink,
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
  private readonly router = inject(Router);
  private readonly notices = inject(NoticeService);
  private readonly auth = inject(AuthRepository);
  private readonly session = inject(SessionService);
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

  /**
   * Las mitades cambian de lado solo en el ingreso directo, al crear la cuenta. Sale de la URL y
   * no de si la técnica cargó: si no, la respuesta de la API las movería con la persona escribiendo.
   */
  protected readonly inverted = computed(
    () => this.mode() === 'register' && this.techniqueId() === undefined,
  );

  private readonly hour = new Date().getHours();
  protected readonly greeting = computed(() => greeting(this.mode(), this.hour));

  protected readonly loginForm = form(signal(emptyLogin()), loginSchema);
  protected readonly registerForm = form(signal(emptyRegistration()), registrationSchema);

  private readonly aside = viewChild.required<ElementRef<HTMLElement>>('aside');
  private readonly pane = viewChild.required<ElementRef<HTMLElement>>('pane');
  private readonly reduced = mediaQuery(REDUCED_MOTION_QUERY);
  private layout: Layout | undefined;
  private slides: Animation[] = [];
  private leaving = false;

  constructor() {
    effect(() => {
      if (this.session.isLoggedIn()) untracked(() => void this.continueAfterSignIn());
    });

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

  /** Ingresar: valida, y si todo está bien ingresa y va a donde se iba. Un segundo envío espera. */
  protected async onLogin(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loginForm().submitting()) return;
    await submit(this.loginForm, {
      action: () => this.signIn(),
      onInvalid: () => this.loginForm().errorSummary()[0]?.fieldTree?.().focusBoundControl(),
    });
  }

  private async signIn(): Promise<void> {
    this.notices.dismissErrors();
    const { email, password } = this.loginForm().value();
    try {
      await firstValueFrom(this.session.login({ email: email.trim(), password }));
    } catch (error) {
      // Solo un 401 es una contraseña incorrecta, y el interceptor lo deja a la pantalla; cualquier
      // otro fallo (sin conexión, un error del servidor) ya lo avisó el interceptor y se conserva
      // lo escrito para volver a intentarlo.
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.notices.show('error', describeApiError(401, error.error) ?? []);
        // El correo se queda; la contraseña, no, y el foco va a ella para escribirla de nuevo
        this.loginForm().reset({ email, password: '' });
        this.loginForm.password().focusBoundControl();
      }
      return;
    }
    this.loginForm().reset(emptyLogin());
    await this.continueAfterSignIn();
  }

  /** Crear cuenta: valida, y si todo está bien crea la cuenta e ingresa. Un segundo envío espera. */
  protected async onRegister(event: Event): Promise<void> {
    event.preventDefault();
    if (this.registerForm().submitting()) return;
    await submit(this.registerForm, {
      action: () => this.createAccount(),
      onInvalid: () => this.registerForm().errorSummary()[0]?.fieldTree?.().focusBoundControl(),
    });
  }

  private async createAccount(): Promise<void> {
    this.notices.dismissErrors();
    const { name, email, password } = this.registerForm().value();
    const credentials = { email: email.trim(), password };
    try {
      // En silencio: el interceptor no avisa, porque el texto de la API sobre un correo repetido
      // no se repite (ver `REGISTRATION_FAILED`).
      await firstValueFrom(
        this.auth.register(
          { name: name.trim(), ...credentials, accepts_policy: true },
          { quiet: true },
        ),
      );
    } catch (error) {
      this.notices.show('error', registrationErrorMessages(error));
      return;
    }

    // La contraseña no se queda en la memoria de la pantalla
    this.registerForm().reset(emptyRegistration());
    try {
      await firstValueFrom(this.session.login(credentials));
    } catch {
      // La cuenta ya existe pero no se pudo ingresar (el interceptor avisa si fue un fallo del
      // servidor): va a Ingresar con el correo puesto y con a dónde se iba, y se dice que no hace
      // falta registrarse otra vez.
      this.notices.show('error', [SIGN_IN_AFTER_REGISTRATION_FAILED]);
      this.loginForm().reset({ email, password: '' });
      await this.router.navigate(['/cuenta', ACCOUNT_SEGMENTS.login], {
        queryParamsHandling: 'preserve',
      });
      return;
    }
    await this.continueAfterSignIn();
  }

  /** Ya hay sesión: a donde se iba (`?volver=`, solo si es de esta app y no de la cuenta) o al catálogo. */
  private async continueAfterSignIn(): Promise<void> {
    if (this.leaving) return;
    this.leaving = true;
    await this.router.navigateByUrl(returnTarget(this.query().get('volver')));
  }

  /**
   * Dónde quedan las mitades. Un deslizamiento en curso se cancela antes: la medida incluye su
   * desplazamiento, y guardarla torcería el siguiente.
   */
  private measure(inverted: boolean): Layout {
    this.slides.forEach((slide) => slide.cancel());
    this.slides = [];
    return {
      inverted,
      asideLeft: this.aside().nativeElement.getBoundingClientRect().left,
      paneLeft: this.pane().nativeElement.getBoundingClientRect().left,
    };
  }

  private slide(element: HTMLElement, distance: number): void {
    if (Math.abs(distance) <= 1 || typeof element.animate !== 'function') return;
    this.slides.push(
      element.animate([{ transform: `translateX(${distance}px)` }, { transform: 'none' }], {
        duration: SWAP_MS,
        easing: 'cubic-bezier(.16, 1, .3, 1)',
      }),
    );
  }
}

/**
 * Lo que se le dice a la persona cuando la API rechazó el registro. Un 409 es un correo repetido
 * y no se cuenta (`REGISTRATION_FAILED`); el resto, que sí es algo que puede corregir o esperar
 * (sin conexión, un error del servidor, datos no válidos), dice lo mismo que en toda la aplicación.
 */
function registrationErrorMessages(error: unknown): readonly string[] {
  if (!(error instanceof HttpErrorResponse) || error.status === 409) return [REGISTRATION_FAILED];
  return describeApiError(error.status, error.error) ?? [REGISTRATION_FAILED];
}

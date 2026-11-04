import { withInterceptors } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { errorInterceptor } from '../../core/http/error.interceptor';
import { NoticeService } from '../../core/notice/notice.service';
import { FullNavigation } from '../../core/router/full-navigation';
import { SessionService } from '../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { AccountEntry } from './account';

const ID = '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f';
const BACK = encodeURIComponent(`/tecnicas/${ID}/instrumental`);
const ACCOUNT = { id: 'u-1', name: 'Ana Pérez', email: 'ana@example.com', role: 'user' };
const WRONG = { detail: 'Correo o contraseña incorrectos' };

describe('AccountEntry: ingresar', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;
  let root: HTMLElement;

  const field = (label: string) =>
    Array.from(root.querySelectorAll('app-text-field'))
      .find((f) => f.querySelector('label')!.textContent!.trim() === label)!
      .querySelector('input')!;
  const errors = () =>
    Array.from(root.querySelectorAll('app-field-error')).map((e) => e.textContent!.trim());
  const noticeTexts = () =>
    TestBed.inject(NoticeService)
      .notices()
      .flatMap((n) => n.messages);
  const loginRequest = () => http.expectOne(`${TEST_API_BASE}/auth/login`);
  const submitButton = () => root.querySelector('form button[type=submit]')!;

  async function open(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(withInterceptors([errorInterceptor])),
        { provide: FullNavigation, useValue: { assign: vi.fn() } },
        provideRouter([
          { path: 'cuenta/:modo', component: AccountEntry },
          { path: 'tecnicas', children: [{ path: '**', children: [] }] },
          { path: 'gestion/borradores', children: [] },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    root = harness.routeNativeElement as HTMLElement;
    document.body.appendChild(root);
    // La técnica a la que se iba, si la hay
    http
      .match(`${TEST_API_BASE}/techniques/${ID}`)
      .forEach((r) => r.flush({ name: 'Tiroidectomía', specialty: 'Cirugía general' }));
    await settle();
  }

  async function settle(): Promise<void> {
    await Promise.resolve();
    await harness.fixture.whenStable();
  }

  async function type(input: HTMLInputElement, value: string): Promise<void> {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  }

  async function fill(email = 'ana@example.com', password = 'una contraseña'): Promise<void> {
    await type(field('Correo'), email);
    await type(field('Contraseña'), password);
  }

  async function submit(): Promise<void> {
    root
      .querySelector('form')!
      .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await settle();
  }

  afterEach(() => {
    root?.remove();
    http?.verify();
  });

  describe('validación al enviar', () => {
    beforeEach(() => open('/cuenta/ingresar'));

    it('mientras no se intenta enviar, no reclama nada', () => {
      expect(errors()).toEqual([]);
    });

    it('vacío: dice qué falta bajo cada campo, no envía nada y lleva el foco al correo', async () => {
      await submit();

      expect(errors()).toEqual(['Escribir el correo.', 'Escribir la contraseña.']);
      expect(document.activeElement).toBe(field('Correo'));
      expect(http.match(() => true)).toHaveLength(0);
    });

    it('un correo con mala forma pide uno válido, y no se envía', async () => {
      await fill('ana');
      await submit();

      expect(errors()).toEqual(['Escribir un correo válido.']);
      expect(http.match(() => true)).toHaveLength(0);
    });

    it('al corregir un campo, su mensaje se va', async () => {
      await submit();
      await type(field('Correo'), 'ana@example.com');

      expect(errors()).toEqual(['Escribir la contraseña.']);
    });
  });

  describe('al ingresar bien', () => {
    it('manda el correo sin espacios de más y la contraseña tal cual', async () => {
      await open('/cuenta/ingresar');
      await fill(' ana@example.com ', '  con espacios  ');
      await submit();

      const request = loginRequest();
      expect(request.request.body).toEqual({
        email: 'ana@example.com',
        password: '  con espacios  ',
      });
      request.flush(ACCOUNT);
      await settle();
    });

    it('va a donde se iba (?volver=)', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await fill();
      await submit();
      loginRequest().flush(ACCOUNT);
      await settle();

      expect(router.url).toBe(`/tecnicas/${ID}/instrumental`);
      expect(TestBed.inject(SessionService).isLoggedIn()).toBe(true);
      expect(noticeTexts()).toEqual([]);
    });

    it('si se entró directo, va al catálogo', async () => {
      await open('/cuenta/ingresar');
      await fill();
      await submit();
      loginRequest().flush(ACCOUNT);
      await settle();

      expect(router.url).toBe('/tecnicas');
    });

    it.each([
      ['la mesa de una técnica en SIMIQ3D', `/simiq3d/tecnicas/${ID}`],
      ['SIVRI', '/sivri/'],
    ])(
      'si iba a %s, la pide al servidor (navegación completa): el router de esta app no la conoce',
      async (_name, volver) => {
        await open(`/cuenta/ingresar?volver=${encodeURIComponent(volver)}`);
        await fill();
        await submit();
        loginRequest().flush(ACCOUNT);
        await settle();

        expect(TestBed.inject(FullNavigation).assign).toHaveBeenCalledExactlyOnceWith(volver);
        expect(router.url).toMatch(/^\/cuenta\/ingresar\?/);
        expect(TestBed.inject(SessionService).isLoggedIn()).toBe(true);
      },
    );

    it('vuelve también a una pantalla de gestión, con su consulta', async () => {
      await open(`/cuenta/ingresar?volver=${encodeURIComponent('/gestion/borradores?x=1')}`);
      await fill();
      await submit();
      loginRequest().flush(ACCOUNT);
      await settle();

      expect(router.url).toBe('/gestion/borradores?x=1');
    });

    it.each([
      ['otro sitio', 'https://sitio.example'],
      ['una ruta con doble barra', '//sitio.example'],
      ['la misma pantalla de cuenta, que lo dejaría en círculos', '/cuenta/ingresar'],
    ])('un ?volver= que lleva a %s no se respeta: va al catálogo', async (_name, volver) => {
      await open(`/cuenta/ingresar?volver=${encodeURIComponent(volver)}`);
      await fill();
      await submit();
      loginRequest().flush(ACCOUNT);
      await settle();

      expect(router.url).toBe('/tecnicas');
    });

    it('vacía lo escrito: la contraseña no se queda en la memoria de la pantalla', async () => {
      await open('/cuenta/ingresar');
      // La pantalla se destruye al navegar; su formulario es lo que queda a la vista del código
      const page = harness.routeDebugElement!.componentInstance as unknown as {
        loginForm: () => { value: () => { email: string; password: string } };
      };
      await fill();
      expect(page.loginForm().value().password).toBe('una contraseña');
      await submit();
      loginRequest().flush(ACCOUNT);
      await settle();

      expect(page.loginForm().value()).toEqual({ email: '', password: '' });
    });
  });

  describe('cuando no se pudo ingresar', () => {
    it('con una contraseña incorrecta dice lo que responde la API, que no delata si el correo existe', async () => {
      await open('/cuenta/ingresar');
      await fill();
      await submit();
      loginRequest().flush(WRONG, { status: 401, statusText: 'Unauthorized' });
      await settle();

      expect(noticeTexts()).toEqual(['Correo o contraseña incorrectos']);
      expect(errors()).toEqual([]);
      expect(field('Correo').getAttribute('aria-invalid')).toBeNull();
      expect(field('Contraseña').getAttribute('aria-invalid')).toBeNull();
    });

    it('se queda en la pantalla, sin sesión, con el correo puesto y la contraseña vacía y con el foco', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await fill();
      await submit();
      loginRequest().flush(WRONG, { status: 401, statusText: 'Unauthorized' });
      await settle();

      expect(router.url).toBe(`/cuenta/ingresar?volver=${BACK}`);
      expect(TestBed.inject(SessionService).isLoggedIn()).toBe(false);
      expect(field('Correo').value).toBe('ana@example.com');
      expect(field('Contraseña').value).toBe('');
      expect(document.activeElement).toBe(field('Contraseña'));
    });

    it('se puede volver a intentar', async () => {
      await open('/cuenta/ingresar');
      await fill();
      await submit();
      loginRequest().flush(WRONG, { status: 401, statusText: 'Unauthorized' });
      await settle();

      await type(field('Contraseña'), 'la correcta');
      await submit();
      loginRequest().flush(ACCOUNT);
      await settle();

      expect(router.url).toBe('/tecnicas');
    });

    it('si falla el servidor, conserva lo escrito: el aviso lo da el interceptor, no la pantalla', async () => {
      await open('/cuenta/ingresar');
      await fill();
      await submit();
      loginRequest().flush(null, { status: 503, statusText: 'Service Unavailable' });
      await settle();

      expect(noticeTexts()).toEqual([
        'El servidor no pudo responder. Intentar de nuevo en un momento.',
      ]);
      expect(field('Contraseña').value).toBe('una contraseña');
      expect(router.url).toBe('/cuenta/ingresar');
    });

    it('no ofrece recuperar la contraseña', async () => {
      await open('/cuenta/ingresar');
      await fill();
      await submit();
      loginRequest().flush(WRONG, { status: 401, statusText: 'Unauthorized' });
      await settle();

      expect(root.textContent).not.toMatch(/Olvidaste|recuperar/i);
    });
  });

  describe('los avisos de un intento anterior', () => {
    it('al ingresar bien no queda el error de la contraseña incorrecta', async () => {
      await open('/cuenta/ingresar');
      await fill();
      await submit();
      loginRequest().flush(WRONG, { status: 401, statusText: 'Unauthorized' });
      await settle();
      expect(noticeTexts()).toEqual([WRONG.detail]);

      await fill();
      await submit();
      expect(noticeTexts()).toEqual([]);
      loginRequest().flush(ACCOUNT);
      await settle();

      expect(noticeTexts()).toEqual([]);
      expect(router.url).toBe('/tecnicas');
    });

    it('tampoco queda el de un servidor que no respondió', async () => {
      await open('/cuenta/ingresar');
      await fill();
      await submit();
      loginRequest().flush(null, { status: 503, statusText: 'Service Unavailable' });
      await settle();
      expect(noticeTexts()).toHaveLength(1);

      await submit();
      loginRequest().flush(ACCOUNT);
      await settle();

      expect(noticeTexts()).toEqual([]);
    });
  });

  describe('cuando la sesión se confirma con la pantalla abierta', () => {
    it('quien sí tenía sesión va a donde iba, sin ningún aviso', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);

      TestBed.inject(SessionService).login({ email: 'a@b.co', password: 'x' }).subscribe();
      loginRequest().flush(ACCOUNT);
      await settle();
      await harness.fixture.whenStable();

      expect(router.url).toBe(`/tecnicas/${ID}/instrumental`);
      expect(noticeTexts()).toEqual([]);
    });
  });

  describe('mientras se envía', () => {
    it('un segundo envío no manda otra petición', async () => {
      await open('/cuenta/ingresar');
      await fill();
      await submit();
      await submit();
      await submit();

      loginRequest().flush(ACCOUNT);
      await settle();
    });

    it('el botón dice que está ocupado y deja de estarlo al terminar', async () => {
      await open('/cuenta/ingresar');
      await fill();
      expect(submitButton().getAttribute('aria-busy')).toBe('false');

      await submit();
      expect(submitButton().getAttribute('aria-busy')).toBe('true');

      loginRequest().flush(WRONG, { status: 401, statusText: 'Unauthorized' });
      await vi.waitFor(() => expect(submitButton().getAttribute('aria-busy')).toBe('false'));
    });
  });
});

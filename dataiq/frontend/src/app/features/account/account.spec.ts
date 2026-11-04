import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NoticeService } from '../../core/notice/notice.service';
import { FullNavigation } from '../../core/router/full-navigation';
import { SessionService } from '../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../data/testing';
import { AccountEntry } from './account';

const ID = '019a0c1e-7b3d-7c2a-9e4f-0a1b2c3d4e5f';
const TECHNIQUE = {
  id: ID,
  name: 'Tiroidectomía',
  specialty: 'Cirugía general',
  version_number: 1,
};
const BACK = encodeURIComponent(`/tecnicas/${ID}/instrumental`);

describe('AccountEntry', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;
  let root: HTMLElement;

  const text = (selector: string) => root.querySelector(selector)?.textContent?.trim();
  const tabs = () => Array.from(root.querySelectorAll<HTMLAnchorElement>('[role=tab]'));
  const labels = () =>
    Array.from(root.querySelectorAll('app-text-field label')).map((l) => l.textContent!.trim());
  const entry = () => root.querySelector<HTMLElement>('.entry')!;

  async function open(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        { provide: FullNavigation, useValue: { assign: vi.fn() } },
        provideRouter([
          { path: 'cuenta/:modo', component: AccountEntry },
          { path: 'tecnicas', children: [{ path: '**', children: [] }] },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    root = harness.routeNativeElement as HTMLElement;
    document.body.appendChild(root);
  }

  async function settle(): Promise<void> {
    await Promise.resolve();
    await harness.fixture.whenStable();
  }

  async function respondTechnique(body: object | null = TECHNIQUE, status = 200): Promise<void> {
    const request = http.expectOne(`${TEST_API_BASE}/techniques/${ID}`);
    if (status === 200) request.flush(body);
    else request.flush(null, { status, statusText: 'Error' });
    await settle();
  }

  afterEach(() => {
    root?.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
    http?.verify();
  });

  describe('entrando directo, sin una técnica que abrir', () => {
    it('al ingresar saluda según la hora', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 1, 9, 30));

      await open('/cuenta/ingresar');

      expect(text('#entry-greeting')).toBe('Buenos días.');
    });

    it.each([
      [14, 'Buenas tardes.'],
      [21, 'Buenas noches.'],
    ])('a las %i h dice «%s»', async (hour, greeting) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 1, hour, 0));

      await open('/cuenta/ingresar');

      expect(text('#entry-greeting')).toBe(greeting);
    });

    it('no pide ninguna técnica ni muestra nada bloqueado', async () => {
      await open('/cuenta/ingresar');

      expect(root.querySelector('.locked')).toBeNull();
      expect(root.querySelector('.promise')).toBeNull();
    });

    it('lleva su ilustración, decorativa para los lectores de pantalla', async () => {
      await open('/cuenta/ingresar');

      const figure = root.querySelector('.aside figure')!;
      expect(figure.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('una ruta que no es de una técnica es lo mismo que no traer ninguna', async () => {
      await open(`/cuenta/ingresar?volver=${encodeURIComponent('/tecnicas?especialidad=e-1')}`);

      expect(text('#entry-greeting')).toBeTruthy();
    });

    it('al crear la cuenta dice «Mucho gusto.» y cambia la ilustración', async () => {
      await open('/cuenta/ingresar');
      const loginFigure = root.querySelector('.aside figure svg')!.innerHTML;

      await harness.navigateByUrl('/cuenta/crear');

      expect(text('#entry-greeting')).toBe('Mucho gusto.');
      expect(root.querySelector('.aside figure svg')!.innerHTML).not.toBe(loginFigure);
    });

    it('al crear la cuenta las mitades cambian de lado', async () => {
      await open('/cuenta/ingresar');
      expect(entry().classList.contains('inverted')).toBe(false);

      await harness.navigateByUrl('/cuenta/crear');
      expect(entry().classList.contains('inverted')).toBe(true);

      await harness.navigateByUrl('/cuenta/ingresar');
      expect(entry().classList.contains('inverted')).toBe(false);
    });

    describe('el cambio de lado se anima', () => {
      let animate: ReturnType<typeof vi.fn>;
      const cancel = vi.fn();

      beforeEach(() => {
        cancel.mockClear();
        animate = vi.fn(() => ({ cancel }));
        Object.defineProperty(HTMLElement.prototype, 'animate', {
          configurable: true,
          writable: true,
          value: animate,
        });
        // La mitad de la técnica o el saludo está a la izquierda, salvo cuando están invertidas
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
          this: HTMLElement,
        ) {
          const inverted = this.closest('.entry')?.classList.contains('inverted') ?? false;
          const aside = this.classList.contains('aside');
          return { left: aside === inverted ? 600 : 0 } as DOMRect;
        });
      });

      afterEach(() => {
        Reflect.deleteProperty(HTMLElement.prototype, 'animate');
      });

      it('cada mitad se desliza desde donde estaba, en 700 ms', async () => {
        await open('/cuenta/ingresar');
        expect(animate).not.toHaveBeenCalled();

        await harness.navigateByUrl('/cuenta/crear');

        expect(animate).toHaveBeenCalledTimes(2);
        const keyframes = animate.mock.calls.map(([frames]) => frames[0].transform).sort();
        expect(keyframes).toEqual(['translateX(-600px)', 'translateX(600px)']);
        expect(animate.mock.calls[0][1]).toMatchObject({ duration: 700 });
      });

      it('no se anima mientras no cambien de lado', async () => {
        await open('/cuenta/crear');
        await harness.navigateByUrl('/cuenta/crear?otra=1');

        expect(animate).not.toHaveBeenCalled();
      });

      it('un cambio de pestaña en pleno deslizamiento cancela el anterior', async () => {
        await open('/cuenta/ingresar');
        await harness.navigateByUrl('/cuenta/crear');
        expect(cancel).not.toHaveBeenCalled();

        await harness.navigateByUrl('/cuenta/ingresar');

        expect(cancel).toHaveBeenCalledTimes(2);
        expect(animate).toHaveBeenCalledTimes(4);
      });

      it('la respuesta de la técnica no mueve las mitades mientras se escribe', async () => {
        await open(`/cuenta/crear?volver=${BACK}`);

        await respondTechnique(null, 404);

        expect(entry().classList.contains('inverted')).toBe(false);
        expect(animate).not.toHaveBeenCalled();
      });
    });
  });

  describe('con la técnica que se quería abrir', () => {
    it('la pide a la API y, mientras llega, no dice nada que no se sepa', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);

      expect(root.querySelector('.entry .aside')!.getAttribute('aria-busy')).toBe('true');
      expect(root.querySelector('#entry-greeting')).toBeNull();
      expect(text('.technique-name')).toBe('');

      await respondTechnique();
      expect(root.querySelector('.entry .aside')!.getAttribute('aria-busy')).toBe('false');
    });

    it('también si iba a verla en 3D (`/simiq3d/tecnicas/:id`), sin mover las mitades', async () => {
      await open(`/cuenta/crear?volver=${encodeURIComponent(`/simiq3d/tecnicas/${ID}`)}`);
      await respondTechnique();

      expect(text('.technique-name')).toBe('Tiroidectomía');
      expect(root.querySelector('#entry-greeting')).toBeNull();
    });

    it('muestra su ruta, su nombre y su especialidad', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await respondTechnique();

      expect(text('.route a')).toBe('Técnicas');
      expect(root.querySelector<HTMLAnchorElement>('.route a')!.getAttribute('href')).toBe(
        '/tecnicas',
      );
      expect(text('.route')).toContain('Cirugía general');
      expect(text('.technique-name')).toBe('Tiroidectomía');
      expect(text('.technique-specialty')).toBe('Cirugía general');
    });

    it('muestra siempre sus cuatro pestañas, bloqueadas, sin revelar si falta una mesa', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await respondTechnique();

      const fakeTabs = Array.from(root.querySelectorAll('.fake-tabs span')).map((t) =>
        t.textContent!.trim(),
      );
      expect(fakeTabs).toEqual([
        'Datos clínicos',
        'Instrumental',
        'Mesa de Mayo',
        'Mesa de reserva',
      ]);
      expect(root.querySelector('.fake-tabs')!.getAttribute('aria-hidden')).toBe('true');
      expect(text('.locked p')).toBe(
        'Con una cuenta gratuita se abre todo el detalle de esta técnica.',
      );
    });

    it('en celular la vista bloqueada se reemplaza por una línea con el candado', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await respondTechnique();

      expect(text('.promise')).toBe(
        'Con una cuenta gratuita se abre todo el detalle de esta técnica.',
      );
    });

    it('el titular de la mitad es el nombre de la técnica', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await respondTechnique();

      const section = root.querySelector('.aside')!;
      const heading = root.querySelector(`#${section.getAttribute('aria-labelledby')}`)!;
      expect(heading.textContent!.trim()).toBe('Tiroidectomía');
    });

    it('al crear la cuenta las mitades se quedan donde estaban', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await respondTechnique();

      await harness.navigateByUrl(`/cuenta/crear?volver=${BACK}`);

      expect(entry().classList.contains('inverted')).toBe(false);
      expect(text('.technique-name')).toBe('Tiroidectomía');
      expect(http.match(() => true)).toHaveLength(0);
    });

    it('si la técnica no existe, la mitad vuelve a ser el saludo', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await respondTechnique(null, 404);

      expect(text('#entry-greeting')).toBeTruthy();
      expect(root.querySelector('.locked')).toBeNull();
    });

    it('si la API falla, tampoco se queda en blanco', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await respondTechnique(null, 503);

      expect(text('#entry-greeting')).toBeTruthy();
    });

    it('un id que no es un UUID no se pide', async () => {
      await open(`/cuenta/ingresar?volver=${encodeURIComponent('/tecnicas/tiroidectomia')}`);

      expect(text('#entry-greeting')).toBeTruthy();
    });
  });

  describe('si la sesión se confirma con la pantalla ya abierta', () => {
    const ACCOUNT = { id: 'u-1', name: 'Ana Pérez', email: 'ana@example.com', role: 'user' };

    async function confirmSession(): Promise<void> {
      const loading = TestBed.inject(SessionService).load();
      http.expectOne(`${TEST_API_BASE}/auth/me`).flush(ACCOUNT);
      await loading;
      await settle();
    }

    it('va a donde se iba, como guestGuard', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await respondTechnique();
      await confirmSession();

      expect(router.url).toBe(`/tecnicas/${ID}/instrumental`);
      expect(TestBed.inject(FullNavigation).assign).not.toHaveBeenCalled();
    });

    it('a SIMIQ3D o SIVRI va con navegación completa', async () => {
      await open(`/cuenta/ingresar?volver=${encodeURIComponent('/sivri/')}`);
      await confirmSession();

      expect(TestBed.inject(FullNavigation).assign).toHaveBeenCalledExactlyOnceWith('/sivri/');
    });
  });

  describe('las pestañas', () => {
    it('son Ingresar y Crear cuenta, enlaces a su pantalla, y la abierta está elegida', async () => {
      await open('/cuenta/ingresar');

      expect(tabs().map((tab) => tab.textContent!.trim())).toEqual(['Ingresar', 'Crear cuenta']);
      expect(tabs().map((tab) => tab.getAttribute('href'))).toEqual([
        '/cuenta/ingresar',
        '/cuenta/crear',
      ]);
      expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    });

    it('conservan a dónde se iba (?volver=) al pasar de una a otra', async () => {
      await open(`/cuenta/ingresar?volver=${BACK}`);
      await respondTechnique();

      expect(tabs()[1].getAttribute('href')).toBe(`/cuenta/crear?volver=${BACK}`);

      tabs()[1].click();
      await settle();
      expect(router.url).toBe(`/cuenta/crear?volver=${BACK}`);
      expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    });

    it('la hoja de la abierta es su panel', async () => {
      await open('/cuenta/crear');

      const panel = root.querySelector('[role=tabpanel]')!;
      expect(panel.id).toBe('panel-register');
      expect(panel.getAttribute('aria-labelledby')).toBe('tab-register');
    });
  });

  describe('el formulario', () => {
    it('al ingresar pide correo y contraseña, sin Google ni recuperar la contraseña', async () => {
      await open('/cuenta/ingresar');

      expect(text('h1')).toBe('Ingresar a IQ Platform');
      expect(labels()).toEqual(['Correo', 'Contraseña']);
      expect(text('form button[type=submit]')).toBe('Ingresar');
      expect(root.textContent).not.toMatch(/Google|Olvidaste/);
    });

    it('al crear la cuenta pide además el nombre', async () => {
      await open('/cuenta/crear');

      expect(text('h1')).toBe('Crear una cuenta gratis');
      expect(labels()).toEqual(['Nombre', 'Correo', 'Contraseña']);
      expect(text('form button[type=submit]')).toBe('Crear cuenta gratis');
    });

    it('los campos piden lo que los gestores de contraseñas esperan', async () => {
      await open('/cuenta/ingresar');
      const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('app-text-field input'));
      expect(inputs.map((i) => [i.type, i.getAttribute('autocomplete')])).toEqual([
        ['email', 'email'],
        ['password', 'current-password'],
      ]);

      await harness.navigateByUrl('/cuenta/crear');
      const created = Array.from(root.querySelectorAll<HTMLInputElement>('app-text-field input'));
      expect(created.map((i) => [i.type, i.getAttribute('autocomplete')])).toEqual([
        ['text', 'name'],
        ['email', 'email'],
        ['password', 'new-password'],
      ]);
    });

    it('la contraseña se puede mostrar', async () => {
      await open('/cuenta/ingresar');

      expect(text('form .control button')).toBe('Mostrar');
    });

    it('enviar el formulario no recarga la página ni manda la contraseña en la URL', async () => {
      await open('/cuenta/ingresar');
      const form = root.querySelector('form')!;

      const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('cada pantalla tiene un solo formulario, el de la pestaña abierta', async () => {
      await open('/cuenta/crear');

      expect(root.querySelectorAll('form')).toHaveLength(1);
    });
  });

  describe('crear la cuenta', () => {
    const REGISTRATION_FAILED =
      'No se pudo completar el registro. Verificar los datos e intentar de nuevo.';
    const ACCOUNT = { id: 'u-1', name: 'Ana Pérez', email: 'ana@example.com', role: 'user' };

    const field = (label: string) =>
      Array.from(root.querySelectorAll('app-text-field'))
        .find((f) => f.querySelector('label')!.textContent!.trim() === label)!
        .querySelector('input')!;
    const policy = () => root.querySelector<HTMLInputElement>('app-checkbox-field input')!;
    const errors = () =>
      Array.from(root.querySelectorAll('app-field-error')).map((e) => e.textContent!.trim());
    const noticeTexts = () =>
      TestBed.inject(NoticeService)
        .notices()
        .flatMap((n) => n.messages);

    async function type(input: HTMLInputElement, value: string): Promise<void> {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await settle();
    }

    async function fill(
      values: { name?: string; email?: string; password?: string; policy?: boolean } = {},
    ) {
      await type(field('Nombre'), values.name ?? 'Ana Pérez');
      await type(field('Correo'), values.email ?? 'ana@example.com');
      await type(field('Contraseña'), values.password ?? 'una contraseña');
      if (values.policy !== false) {
        policy().click();
        await settle();
      }
    }

    async function submit(): Promise<void> {
      root
        .querySelector('form')!
        .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
      await settle();
    }

    const registerRequest = () => http.expectOne(`${TEST_API_BASE}/auth/register`);
    const loginRequest = () => http.expectOne(`${TEST_API_BASE}/auth/login`);
    const noRequests = () => expect(http.match(() => true)).toHaveLength(0);

    describe('la casilla del aviso', () => {
      beforeEach(() => open('/cuenta/crear'));

      it('dice que la persona es mayor de 18 años y acepta el aviso de privacidad', () => {
        expect(text('app-checkbox-field .text')).toBe(
          'Soy mayor de 18 años y acepto el aviso de privacidad.',
        );
      });

      it('empieza sin marcar: el silencio nunca cuenta como autorización', () => {
        expect(policy().checked).toBe(false);
      });

      it('el enlace lleva al aviso en otra pestaña, para no perder lo escrito', () => {
        const link = root.querySelector<HTMLAnchorElement>('app-checkbox-field a')!;

        expect(link.textContent!.trim()).toBe('aviso de privacidad');
        expect(link.getAttribute('href')).toBe('/politica-de-datos');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener');
      });

      it('una contraseña pegada más larga que el máximo no se corta: se dice', async () => {
        await type(field('Contraseña'), 'x'.repeat(150));
        expect(field('Contraseña').value).toHaveLength(150);
        field('Contraseña').dispatchEvent(new Event('blur'));
        await settle();

        expect(errors()).toContain('La contraseña admite hasta 128 caracteres.');
      });
    });

    describe('validación al enviar', () => {
      beforeEach(() => open('/cuenta/crear'));

      it('mientras no se intenta enviar, no reclama nada', () => {
        expect(errors()).toEqual([]);
      });

      it('vacío: dice qué falta bajo cada campo, no envía nada y lleva el foco al primero', async () => {
        await submit();

        expect(errors()).toEqual([
          'Escribir el nombre.',
          'Escribir un correo válido.',
          'La contraseña necesita al menos 8 caracteres.',
          'Para crear la cuenta hay que aceptar el aviso de privacidad.',
        ]);
        expect(document.activeElement).toBe(field('Nombre'));
        noRequests();
      });

      it('sin aceptar el aviso no se crea la cuenta, aunque todo lo demás esté bien', async () => {
        await fill({ policy: false });
        await submit();

        expect(errors()).toEqual(['Para crear la cuenta hay que aceptar el aviso de privacidad.']);
        expect(document.activeElement).toBe(policy());
        noRequests();
      });

      it('al corregir un campo, su mensaje se va', async () => {
        await submit();
        await type(field('Nombre'), 'Ana');

        expect(errors()).not.toContain('Escribir el nombre.');
        expect(errors()).toHaveLength(3);
      });

      it('una contraseña corta se avisa sin decir cuánto falta', async () => {
        await fill({ password: '1234567' });
        await submit();

        expect(errors()).toEqual(['La contraseña necesita al menos 8 caracteres.']);
      });
    });

    describe('al crearse la cuenta', () => {
      it('manda los datos con la aceptación, sin espacios de más en el nombre y el correo', async () => {
        await open('/cuenta/crear');
        await fill({ name: '  Ana Pérez ', email: ' ana@example.com ' });
        await submit();

        const request = registerRequest();
        expect(request.request.body).toEqual({
          name: 'Ana Pérez',
          email: 'ana@example.com',
          password: 'una contraseña',
          accepts_policy: true,
        });
        request.flush(ACCOUNT, { status: 201, statusText: 'Created' });
        await settle();
        loginRequest().flush(ACCOUNT);
        await settle();
      });

      it('la contraseña se manda tal cual, sin recortarla', async () => {
        await open('/cuenta/crear');
        await fill({ password: '  con espacios  ' });
        await submit();

        const request = registerRequest();
        expect(request.request.body.password).toBe('  con espacios  ');
        request.flush(ACCOUNT, { status: 201, statusText: 'Created' });
        await settle();
        expect(loginRequest().request.body.password).toBe('  con espacios  ');
      });

      it('ingresa sola con las mismas credenciales y va a donde se iba', async () => {
        await open(`/cuenta/crear?volver=${BACK}`);
        await respondTechnique();
        await fill();
        await submit();

        registerRequest().flush(ACCOUNT, { status: 201, statusText: 'Created' });
        await settle();
        const login = loginRequest();
        expect(login.request.body).toEqual({
          email: 'ana@example.com',
          password: 'una contraseña',
        });
        login.flush(ACCOUNT);
        await settle();

        expect(router.url).toBe(`/tecnicas/${ID}/instrumental`);
        expect(TestBed.inject(SessionService).isLoggedIn()).toBe(true);
        expect(noticeTexts()).toEqual([]);
      });

      it('si iba a ver la técnica en 3D, va a SIMIQ3D con navegación completa', async () => {
        const volver = `/simiq3d/tecnicas/${ID}`;
        await open(`/cuenta/crear?volver=${encodeURIComponent(volver)}`);
        await respondTechnique();
        await fill();
        await submit();

        registerRequest().flush(ACCOUNT, { status: 201, statusText: 'Created' });
        await settle();
        loginRequest().flush(ACCOUNT);
        await settle();

        expect(TestBed.inject(FullNavigation).assign).toHaveBeenCalledExactlyOnceWith(volver);
        expect(TestBed.inject(SessionService).isLoggedIn()).toBe(true);
      });

      it('si se entró directo, va al catálogo', async () => {
        await open('/cuenta/crear');
        await fill();
        await submit();

        registerRequest().flush(ACCOUNT, { status: 201, statusText: 'Created' });
        await settle();
        loginRequest().flush(ACCOUNT);
        await settle();

        expect(router.url).toBe('/tecnicas');
      });

      it('un ?volver= que no es de esta app no lleva a otro sitio', async () => {
        await open(`/cuenta/crear?volver=${encodeURIComponent('https://sitio.example')}`);
        await fill();
        await submit();

        registerRequest().flush(ACCOUNT, { status: 201, statusText: 'Created' });
        await settle();
        loginRequest().flush(ACCOUNT);
        await settle();

        expect(router.url).toBe('/tecnicas');
      });

      it('si la cuenta se creó pero no se pudo ingresar, queda en Ingresar con lo que se iba a abrir', async () => {
        await open(`/cuenta/crear?volver=${BACK}`);
        await respondTechnique();
        await fill();
        await submit();

        registerRequest().flush(ACCOUNT, { status: 201, statusText: 'Created' });
        await settle();
        loginRequest().flush(null, { status: 503, statusText: 'Service Unavailable' });
        await settle();

        expect(router.url).toBe(`/cuenta/ingresar?volver=${BACK}`);
        expect(TestBed.inject(SessionService).isLoggedIn()).toBe(false);
        // Dice que no hace falta registrarse otra vez, y deja el correo para no reescribirlo
        expect(noticeTexts()).toContain(
          'La cuenta se creó, pero no se pudo ingresar. Intentar de nuevo con ese correo y esa contraseña.',
        );
        expect(field('Correo').value).toBe('ana@example.com');
        expect(field('Contraseña').value).toBe('');
      });

      it('borra lo escrito de la memoria de la pantalla en cuanto se crea la cuenta (la contraseña no se queda)', async () => {
        await open('/cuenta/crear');
        await fill();
        await submit();
        expect(field('Contraseña').value).toBe('una contraseña');

        registerRequest().flush(ACCOUNT, { status: 201, statusText: 'Created' });
        await settle();
        // Ya se creó y falta ingresar: la pantalla ya no tiene lo escrito
        expect(field('Contraseña').value).toBe('');
        expect(field('Nombre').value).toBe('');
        expect(errors()).toEqual([]);

        loginRequest().flush(ACCOUNT);
        await settle();
      });
    });

    describe('cuando no se puede crear', () => {
      const failWith = async (status: number, body: object | null = null) => {
        await open('/cuenta/crear');
        await fill();
        await submit();
        registerRequest().flush(body, { status, statusText: 'Error' });
        await settle();
      };

      it('un correo repetido (409) no dice que el correo exista: da un aviso neutro', async () => {
        await failWith(409, { detail: 'Ya hay una cuenta con ese correo' });

        expect(noticeTexts()).toEqual([REGISTRATION_FAILED]);
        expect(JSON.stringify(noticeTexts())).not.toMatch(
          /cuenta con ese correo|ya existe|repetid/i,
        );
      });

      it('un correo repetido no marca el campo del correo ni ningún otro', async () => {
        await failWith(409, { detail: 'Ya hay una cuenta con ese correo' });

        expect(errors()).toEqual([]);
        expect(field('Correo').getAttribute('aria-invalid')).toBeNull();
      });

      it('un correo repetido no cambia el aspecto ni el foco de la pantalla ni inicia sesión', async () => {
        await failWith(409);

        http.expectNone(`${TEST_API_BASE}/auth/login`);
        expect(router.url).toBe('/cuenta/crear');
        expect(TestBed.inject(SessionService).isLoggedIn()).toBe(false);
      });

      it('lo escrito se conserva para corregirlo, y se puede volver a intentar', async () => {
        await failWith(409);

        expect(field('Correo').value).toBe('ana@example.com');
        await submit();
        expect(noticeTexts()).toEqual([]);
        registerRequest().flush(ACCOUNT, { status: 201, statusText: 'Created' });
        await settle();
        loginRequest().flush(ACCOUNT);
        await settle();
        expect(router.url).toBe('/tecnicas');
      });

      it('no se agrega ninguna forma de recuperar la contraseña', async () => {
        await failWith(409);

        expect(root.textContent).not.toMatch(/Olvidaste|recuperar/i);
      });

      it('un 422 de la API dice lo mismo de siempre, sin repetir el texto técnico', async () => {
        await failWith(422, {
          detail: [{ loc: ['body', 'email'], msg: 'value is not a valid email' }],
        });

        expect(noticeTexts()).toEqual(['Hay datos que no son válidos.']);
      });

      it('un error del servidor lo dice con el texto fijo y no crea nada más', async () => {
        await failWith(503);

        expect(noticeTexts()).toEqual([
          'El servidor no pudo responder. Intentar de nuevo en un momento.',
        ]);
        http.expectNone(`${TEST_API_BASE}/auth/login`);
      });

      it('sin conexión lo dice', async () => {
        await open('/cuenta/crear');
        await fill();
        await submit();
        registerRequest().error(new ProgressEvent('error'));
        await settle();

        expect(noticeTexts()).toEqual(['No hay conexión con el servidor.']);
      });
    });

    describe('mientras se envía', () => {
      it('un segundo envío no manda otra petición', async () => {
        await open('/cuenta/crear');
        await fill();
        await submit();
        await submit();
        await submit();

        const request = registerRequest();
        request.flush(ACCOUNT, { status: 201, statusText: 'Created' });
        await settle();
        loginRequest().flush(ACCOUNT);
        await settle();
      });

      it('el botón dice que está ocupado', async () => {
        await open('/cuenta/crear');
        await fill();
        await submit();

        expect(root.querySelector('form button[type=submit]')!.getAttribute('aria-busy')).toBe(
          'true',
        );
        const request = registerRequest();
        request.flush(null, { status: 409, statusText: 'Conflict' });
        await vi.waitFor(() =>
          expect(root.querySelector('form button[type=submit]')!.getAttribute('aria-busy')).toBe(
            'false',
          ),
        );
      });
    });
  });
});

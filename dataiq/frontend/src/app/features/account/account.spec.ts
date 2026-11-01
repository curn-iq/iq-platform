import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
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
  const labels = () => Array.from(root.querySelectorAll('label')).map((l) => l.textContent!.trim());
  const entry = () => root.querySelector<HTMLElement>('.entry')!;

  async function open(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([
          { path: 'cuenta/:modo', component: AccountEntry },
          { path: 'tecnicas', children: [] },
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

      beforeEach(() => {
        animate = vi.fn();
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
      const inputs = Array.from(root.querySelectorAll('input'));
      expect(inputs.map((i) => [i.type, i.getAttribute('autocomplete')])).toEqual([
        ['email', 'email'],
        ['password', 'current-password'],
      ]);

      await harness.navigateByUrl('/cuenta/crear');
      const created = Array.from(root.querySelectorAll('input'));
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
});

import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionService } from '../../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import type { Role } from '../../../domain/role';
import { TechniqueEditAction } from './technique-edit-action';

const TECHNIQUE = '0192f3a0-0000-7000-8000-0000000000aa';
const OTHER_TECHNIQUE = '0192f3a0-0000-7000-8000-0000000000bb';
const ME = 'u-1';

const version = (
  id: string,
  state: string,
  options: { technique?: string; createdBy?: string; author?: string } = {},
) => ({
  id,
  technique_id: options.technique ?? TECHNIQUE,
  technique: 'Colecistectomía',
  specialty: 'Cirugía general',
  number: 2,
  state,
  created_by: options.createdBy ?? ME,
  author: options.author ?? 'Ana Ruiz',
  updated_at: '2026-10-03T15:00:00Z',
});

describe('TechniqueEditAction', () => {
  let http: HttpTestingController;
  let router: Router;
  let fixture: ComponentFixture<TechniqueEditAction>;
  let root: HTMLElement;

  const versionsRequest = () =>
    http.expectOne((request) => request.url === `${TEST_API_BASE}/versions`);

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
    fixture.detectChanges();
  }

  /** Abre el botón con esa sesión (`null` es sin sesión). Sin `answer`, la lista de versiones queda pendiente. */
  async function mount(role: Role | null, answer?: object[] | 'fail'): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideRepositoryTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const session = TestBed.inject(SessionService);
    const loading = session.load();
    const me = http.expectOne(`${TEST_API_BASE}/auth/me`);
    if (role) me.flush({ id: ME, name: 'Ana', email: 'ana@example.com', role });
    else me.flush(null, { status: 401, statusText: 'Unauthorized' });
    await loading;
    fixture = TestBed.createComponent(TechniqueEditAction);
    fixture.componentRef.setInput('techniqueId', TECHNIQUE);
    root = fixture.nativeElement;
    await settle();
    if (answer === 'fail') {
      versionsRequest().flush('', { status: 500, statusText: 'Error' });
      await settle();
    } else if (answer) {
      versionsRequest().flush(answer);
      await settle();
    }
  }

  afterEach(() => http.verify());

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const control = () => root.querySelector<HTMLElement>('.edit');

  describe('quién lo ve', () => {
    it('sin sesión no hay botón ni se pide nada', async () => {
      await mount(null);
      expect(control()).toBeNull();
    });

    it('un usuario sin rol de colaborador no lo ve ni pide versiones', async () => {
      await mount('user');
      expect(control()).toBeNull();
    });

    it.each(['contributor', 'reviewer', 'admin'] as const)('%s lo ve', async (role) => {
      await mount(role, []);
      expect(text(control())).toBe('Editar técnica');
    });

    it('pide las versiones en curso (borrador y en revisión) y hasta que llegan no se muestra', async () => {
      await mount('contributor');
      expect(control()).toBeNull();
      const request = versionsRequest();
      expect(request.request.params.getAll('state')).toEqual(['draft', 'in_review']);
      request.flush([]);
      await settle();
      expect(text(control())).toBe('Editar técnica');
    });
  });

  describe('según la versión en curso', () => {
    it('sin ninguna de esta técnica ofrece «Editar técnica», aunque haya de otras', async () => {
      await mount('contributor', [version('v-9', 'draft', { technique: OTHER_TECHNIQUE })]);
      expect(text(control())).toBe('Editar técnica');
      expect(control()!.tagName).toBe('BUTTON');
    });

    it('un borrador propio ofrece «Continuar borrador», que lleva al primer paso del editor', async () => {
      await mount('contributor', [version('v-1', 'draft')]);
      expect(text(control())).toBe('Continuar borrador');
      expect(control()!.getAttribute('href')).toBe('/gestion/editor/v-1/datos-clinicos');
    });

    it('una versión propia en revisión ofrece «Ver versión en revisión», que lleva al editor', async () => {
      await mount('contributor', [version('v-1', 'in_review')]);
      expect(text(control())).toBe('Ver versión en revisión');
      expect(control()!.getAttribute('href')).toBe('/gestion/editor/v-1/datos-clinicos');
    });

    it.each(['draft', 'in_review'])(
      'la de otra persona (%s) dice «En curso por …», sin acción',
      async (state) => {
        await mount('reviewer', [
          version('v-2', state, { createdBy: 'u-2', author: 'Daniela Ortiz' }),
        ]);
        expect(text(control())).toBe('En curso por Daniela Ortiz');
        expect(control()!.getAttribute('aria-disabled')).toBe('true');
        expect(control()!.classList).toContain('inert');
        control()!.click();
        await settle();
        http.expectNone(`${TEST_API_BASE}/techniques/${TECHNIQUE}/versions`);
      },
    );

    it('si la lista falla ofrece «Editar técnica»: el 409 lo respalda', async () => {
      await mount('contributor', 'fail');
      expect(text(control())).toBe('Editar técnica');
    });
  });

  describe('«Editar técnica»', () => {
    const create = () =>
      http.expectOne({ method: 'POST', url: `${TEST_API_BASE}/techniques/${TECHNIQUE}/versions` });

    it('crea la versión y lleva al primer paso del editor', async () => {
      await mount('contributor', []);
      control()!.click();
      await settle();

      expect(control()!.getAttribute('aria-busy')).toBe('true');
      create().flush({ summary: version('v-new', 'draft') });
      await settle();
      expect(router.navigate).toHaveBeenCalledWith(['/gestion/editor', 'v-new', 'datos-clinicos']);
    });

    it('un segundo toque mientras va el primero no pide otra versión', async () => {
      await mount('contributor', []);
      control()!.click();
      control()!.click();
      await settle();

      const request = create();
      request.flush({ summary: version('v-new', 'draft') });
    });

    it('un 409 se dice en el mismo botón, que queda sin acción', async () => {
      await mount('contributor', []);
      control()!.click();
      await settle();
      create().flush(
        { detail: 'La técnica ya tiene una versión en curso' },
        { status: 409, statusText: 'Conflict' },
      );
      await settle();

      expect(text(control())).toBe('La técnica ya tiene una versión en curso');
      expect(control()!.classList).toContain('inert');
      expect(control()!.getAttribute('aria-disabled')).toBe('true');
      expect(control()!.hasAttribute('aria-busy')).toBe(false);
      expect(text(root.querySelector('[role=status]'))).toBe(
        'La técnica ya tiene una versión en curso',
      );
      expect(router.navigate).not.toHaveBeenCalled();

      control()!.click();
      await settle();
      http.expectNone(`${TEST_API_BASE}/techniques/${TECHNIQUE}/versions`);
    });

    it('otro error no cambia el botón: el aviso es del interceptor y se puede reintentar', async () => {
      await mount('contributor', []);
      control()!.click();
      await settle();
      create().flush('', { status: 500, statusText: 'Error' });
      await settle();

      expect(text(control())).toBe('Editar técnica');
      expect(control()!.hasAttribute('aria-busy')).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();

      control()!.click();
      await settle();
      create().flush({ summary: version('v-new', 'draft') });
    });

    it('el 409 de una técnica no se pasa a otra al cambiar de técnica', async () => {
      await mount('contributor', []);
      control()!.click();
      await settle();
      create().flush({ detail: 'Ya hay' }, { status: 409, statusText: 'Conflict' });
      await settle();
      expect(text(control())).toBe('Ya hay');

      fixture.componentRef.setInput('techniqueId', OTHER_TECHNIQUE);
      await settle();
      expect(text(control())).toBe('Editar técnica');
    });
  });
});

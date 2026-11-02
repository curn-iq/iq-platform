import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionService } from '../../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import type { Role } from '../../../domain/role';
import { TechniqueInProgress } from '../technique-in-progress';
import { TechniqueMoreActions } from './technique-more-actions';

const TECHNIQUE = '0192f3a0-0000-7000-8000-0000000000aa';
const OTHER = '0192f3a0-0000-7000-8000-0000000000bb';
const ARCHIVE_URL = `${TEST_API_BASE}/techniques/${TECHNIQUE}/archive`;

const inProgress = (technique: string) => ({
  id: `v-${technique}`,
  technique_id: technique,
  technique: 'Tiroidectomía',
  specialty: 'Cirugía general',
  number: 2,
  state: 'draft',
  created_by: 'u-2',
  author: 'Daniela Ortiz',
  updated_at: '2026-10-03T15:00:00Z',
});

describe('TechniqueMoreActions', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<TechniqueMoreActions>;
  let root: HTMLElement;
  let archived: number;

  const versionsRequest = () =>
    http.expectOne((request) => request.url === `${TEST_API_BASE}/versions`);

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
    fixture.detectChanges();
  }

  /** Abre «Más acciones» con esa sesión (`null` es sin sesión). Sin `answer`, la lista queda pendiente. */
  async function mount(role: Role | null, answer?: object[] | 'fail'): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), TechniqueInProgress],
    });
    http = TestBed.inject(HttpTestingController);
    const session = TestBed.inject(SessionService);
    const loading = session.load();
    const me = http.expectOne(`${TEST_API_BASE}/auth/me`);
    if (role) me.flush({ id: 'u-1', name: 'Laura', email: 'laura@example.com', role });
    else me.flush(null, { status: 401, statusText: 'Unauthorized' });
    await loading;
    fixture = TestBed.createComponent(TechniqueMoreActions);
    fixture.componentRef.setInput('techniqueId', TECHNIQUE);
    fixture.componentRef.setInput('techniqueName', 'Tiroidectomía');
    archived = 0;
    fixture.componentInstance.archived.subscribe(() => archived++);
    root = fixture.nativeElement;
    document.body.appendChild(root);
    await settle();
    if (answer === 'fail') {
      versionsRequest().flush('', { status: 500, statusText: 'Error' });
      await settle();
    } else if (answer) {
      versionsRequest().flush(answer);
      await settle();
    }
  }

  afterEach(() => {
    root?.remove();
    http.verify();
  });

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const trigger = () => root.querySelector<HTMLButtonElement>('.trigger');
  const panel = () => root.querySelector('.panel');
  const item = () => root.querySelector<HTMLButtonElement>('.item')!;
  const buttons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.confirm button'));

  async function openPanel(): Promise<void> {
    trigger()!.click();
    await settle();
  }

  async function askToArchive(): Promise<void> {
    await openPanel();
    item().click();
    await settle();
  }

  describe('quién lo ve', () => {
    it.each(['reviewer', 'admin'] as const)('un %s ve «Más acciones»', async (role) => {
      await mount(role, []);

      expect(trigger()).not.toBeNull();
      expect(trigger()!.getAttribute('aria-label')).toBe('Más acciones');
    });

    it.each(['contributor', 'user'] as const)('un %s no lo ve', async (role) => {
      await mount(role, role === 'contributor' ? [] : undefined);

      expect(trigger()).toBeNull();
    });

    it('un visitante no lo ve ni pide nada', async () => {
      await mount(null);

      expect(trigger()).toBeNull();
    });
  });

  describe('el panel', () => {
    beforeEach(async () => mount('reviewer', []));

    it('empieza cerrado y el botón lo dice', () => {
      expect(panel()).toBeNull();
      expect(trigger()!.getAttribute('aria-expanded')).toBe('false');
    });

    it('al tocarlo abre la lista con «Archivar técnica»', async () => {
      await openPanel();

      expect(trigger()!.getAttribute('aria-expanded')).toBe('true');
      expect(text(item())).toBe('Archivar técnica');
      expect(item().getAttribute('aria-disabled')).toBeNull();
    });

    it('tocarlo otra vez lo cierra', async () => {
      await openPanel();
      await openPanel();

      expect(panel()).toBeNull();
    });

    it('Escape lo cierra y devuelve el foco al botón', async () => {
      await openPanel();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(trigger());
    });

    it('un clic fuera lo cierra; uno adentro no', async () => {
      await openPanel();

      panel()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle();
      expect(panel()).not.toBeNull();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle();
      expect(panel()).toBeNull();
    });
  });

  describe('con una versión en curso', () => {
    it('«Archivar técnica» queda atenuada, dice por qué y sigue siendo enfocable', async () => {
      await mount('reviewer', [inProgress(TECHNIQUE)]);
      await openPanel();

      expect(item().getAttribute('aria-disabled')).toBe('true');
      expect(item().disabled).toBe(false);
      expect(text(item().querySelector('small'))).toBe(
        'No se puede mientras tenga una versión en curso.',
      );
    });

    it('tocarla no pide confirmación', async () => {
      await mount('reviewer', [inProgress(TECHNIQUE)]);
      await openPanel();

      item().click();
      await settle();

      expect(root.querySelector('.confirm')).toBeNull();
      http.expectNone(ARCHIVE_URL);
    });

    it('la versión en curso de otra técnica no la bloquea', async () => {
      await mount('reviewer', [inProgress(OTHER)]);
      await openPanel();

      expect(item().getAttribute('aria-disabled')).toBeNull();
    });
  });

  it('si la lista de versiones en curso no llega, la opción queda disponible: el 409 la respalda', async () => {
    await mount('reviewer', 'fail');
    await openPanel();

    expect(item().getAttribute('aria-disabled')).toBeNull();
  });

  describe('la confirmación', () => {
    beforeEach(async () => {
      await mount('reviewer', []);
      await askToArchive();
    });

    it('dice qué se archiva, qué deja de verse y que las versiones quedan en el historial', () => {
      expect(text(root.querySelector('.confirm p'))).toBe(
        'Archivar Tiroidectomía. Deja de verse en el catálogo, en SIVRI y en SIMIQ3D; sus versiones quedan en el historial.',
      );
      expect(root.querySelector('.confirm b')!.textContent).toBe('Tiroidectomía');
    });

    it('tiene «Archivar» y «Cancelar», y el foco va al primero', () => {
      expect(buttons().map((b) => text(b))).toEqual(['Archivar', 'Cancelar']);
      expect(document.activeElement).toBe(buttons()[0]);
    });

    it('«Cancelar» cierra el panel, no archiva y devuelve el foco al botón', async () => {
      buttons()[1].click();
      await settle();

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(trigger());
      http.expectNone(ARCHIVE_URL);
      expect(archived).toBe(0);
    });

    it('«Archivar» archiva la técnica, cierra el panel y avisa con `archived`', async () => {
      buttons()[0].click();
      await settle();

      const request = http.expectOne(ARCHIVE_URL);
      expect(request.request.method).toBe('POST');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(archived).toBe(1);
      expect(panel()).toBeNull();
    });

    it('mientras va dice «Archivando…» y un segundo toque no pide otra vez', async () => {
      buttons()[0].click();
      await settle();

      expect(text(buttons()[0])).toBe('Archivando…');
      expect(buttons()[0].getAttribute('aria-busy')).toBe('true');
      buttons()[0].click();
      await settle();

      http.expectOne(ARCHIVE_URL).flush(null, { status: 204, statusText: 'No Content' });
    });

    it('si la API falla, la confirmación se queda para intentarlo otra vez', async () => {
      buttons()[0].click();
      await settle();
      http.expectOne(ARCHIVE_URL).flush('', { status: 500, statusText: 'Server Error' });
      await settle();

      expect(root.querySelector('.confirm')).not.toBeNull();
      expect(text(buttons()[0])).toBe('Archivar');
      expect(archived).toBe(0);
    });

    it('un 409 (una versión en curso que no se conocía) vuelve a la lista con la opción atenuada', async () => {
      buttons()[0].click();
      await settle();
      http
        .expectOne(ARCHIVE_URL)
        .flush(
          { detail: 'La técnica tiene una versión en curso' },
          { status: 409, statusText: 'Conflict' },
        );
      await settle();

      expect(root.querySelector('.confirm')).toBeNull();
      expect(panel()).not.toBeNull();
      expect(item().getAttribute('aria-disabled')).toBe('true');
      expect(text(item().querySelector('small'))).toBe(
        'No se puede mientras tenga una versión en curso.',
      );
      expect(archived).toBe(0);
    });
  });

  it('al cambiar de técnica el panel se cierra y lo de una no vale para otra', async () => {
    await mount('reviewer', []);
    await askToArchive();
    buttons()[0].click();
    await settle();
    http.expectOne(ARCHIVE_URL).flush({ detail: 'x' }, { status: 409, statusText: 'Conflict' });
    await settle();

    fixture.componentRef.setInput('techniqueId', OTHER);
    await settle();

    expect(panel()).toBeNull();
    await openPanel();
    expect(item().getAttribute('aria-disabled')).toBeNull();
  });
});

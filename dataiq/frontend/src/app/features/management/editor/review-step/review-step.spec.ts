import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NoticeService } from '../../../../core/notice/notice.service';
import type { VersionDetail, VersionSummary } from '../../../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../../data/testing';
import type { Role } from '../../../../domain/role';
import { EditorState } from '../editor-state';
import { publishedNotice, ReviewStep, SUBMITTED } from './review-step';

const ID = '0192f3a0-0000-7000-8000-000000000001';

const summary = (state = 'draft', number = 2): VersionSummary =>
  ({
    id: ID,
    technique_id: 't-edit',
    technique: 'Colecistectomía',
    specialty: 'Cirugía general',
    number,
    state,
    created_by: 'u-1',
    author: 'Ana Ruiz',
    updated_at: '2026-10-03T15:00:00Z',
  }) as VersionSummary;

const text = (value: string | null = 'Escrito.') => value;

/** Una versión completa: todos los campos, una sutura, un objeto en la mesa de Mayo y la reserva «no lleva». */
function detail(
  options: { state?: string; number?: number; complete?: boolean } = {},
): VersionDetail {
  const full = options.complete ?? true;
  return {
    summary: summary(options.state, options.number),
    content: {
      id: 't-edit',
      name: 'Colecistectomía',
      specialty: 'Cirugía general',
      version_number: options.number ?? 2,
      cups_code: null,
      anesthesia: text(full ? 'General' : null),
      patient_position: text(),
      drapes: text(),
      description: text(),
      indications: text(),
      complications: null,
      surgical_technique: null,
      source: text(),
      zones: [
        { zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 4, columns: 6 },
        { zone_id: 'z-res', zone: 'Mesa de reserva', used: false, rows: null, columns: null },
      ],
      items: [
        {
          id: 'it-1',
          zone_id: 'z-mayo',
          zone: 'Mesa de Mayo',
          legend_number: 1,
          source_text: 'Pinza Kelly',
          components: [{ instrument_id: 'i-1', suture_id: null, name: 'Pinza Kelly' }],
          cells: full ? [{ row: 1, column: 1 }] : [],
        },
      ],
      sutures: [{ id: 's-1', name: 'Seda', gauge: null, needle_type: null, usage: null }],
      equipment: [],
      devices: [],
    },
    rejections: [],
  } as unknown as VersionDetail;
}

describe('ReviewStep', () => {
  let state: EditorState;
  let http: HttpTestingController;
  let router: Router;
  let notices: NoticeService;
  let fixture: ComponentFixture<ReviewStep>;
  let root: HTMLElement;

  async function mount(
    options: {
      state?: string;
      number?: number;
      complete?: boolean;
      publishes?: boolean;
      role?: Role | null;
    } = {},
  ): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), provideRouter([]), EditorState],
    });
    state = TestBed.inject(EditorState);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    notices = TestBed.inject(NoticeService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const version = detail(options);
    state.load(version);
    fixture = TestBed.createComponent(ReviewStep);
    fixture.componentRef.setInput('version', version.summary);
    fixture.componentRef.setInput('publishes', options.publishes ?? false);
    fixture.componentRef.setInput('role', options.role ?? null);
    root = fixture.nativeElement;
    await settle();
  }

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
    fixture.detectChanges();
  }

  afterEach(() => {
    state.abandon();
    http.verify();
  });

  const text$ = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const one = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  const rows = () =>
    Array.from(root.querySelectorAll('.summary li')).map((li) => [
      text$(li.querySelector(':scope > div > strong')),
      text$(li.querySelector(':scope > div > span')),
      li.querySelector('a')?.getAttribute('href') ?? null,
    ]);
  const click = async (element: HTMLElement) => {
    element.click();
    await settle();
  };

  describe('quien envía', () => {
    it('lleva el título y el subtítulo de un colaborador', async () => {
      await mount();
      expect(text$(one('h2'))).toBe('Revisar y enviar');
      expect(text$(one('.title p'))).toBe('Un revisor la aprueba antes de publicarla.');
    });

    it('resume las cuatro secciones, sin «Completar» si están completas', async () => {
      await mount();
      expect(rows()).toEqual([
        ['Datos clínicos', 'Todos los campos obligatorios.', null],
        ['Instrumental', '1 objeto.', null],
        ['Mesa de Mayo', '1 de 1 ubicados.', null],
        ['Mesa de reserva', 'No lleva.', null],
      ]);
    });

    it('completa, deja enviar, sin motivo de bloqueo y con la aclaración', async () => {
      await mount();
      const button = one('.submit') as HTMLButtonElement;
      expect(text$(button)).toBe('Enviar a revisión');
      expect(button.disabled).toBe(false);
      expect(root.querySelector('.reason')).toBeNull();
      expect(text$(one('.note'))).toBe(
        'Mientras esté en revisión no se puede editar; si el revisor la devuelve, vuelve a Mis borradores con su comentario.',
      );
    });

    it('con algo sin completar, bloquea el botón y dice qué falta, con «Completar» a ese paso', async () => {
      await mount({ complete: false });
      expect((one('.submit') as HTMLButtonElement).disabled).toBe(true);
      expect(text$(one('.reason'))).toBe(
        'Para enviar falta completar Datos clínicos (Anestesia); Mesa de Mayo (1 objeto sin ubicar).',
      );
      expect(rows()[0]).toEqual([
        'Datos clínicos',
        'Falta: Anestesia.',
        `/gestion/editor/${ID}/datos-clinicos`,
      ]);
      expect(rows()[2][2]).toBe(`/gestion/editor/${ID}/mesa-de-mayo`);
      expect(one('a.complete').getAttribute('aria-label')).toBe('Completar Datos clínicos');
    });

    it('lo que se completa en el editor desbloquea el botón al momento', async () => {
      await mount({ complete: false });
      state.edit((content) => ({
        ...content,
        anesthesia: 'General',
        items: content.items.map((item) => ({ ...item, cells: [{ row: 1, column: 1 }] })),
      }));
      await settle();
      expect((one('.submit') as HTMLButtonElement).disabled).toBe(false);
      void state.whenSaved();
      http.expectOne(`${TEST_API_BASE}/versions/${ID}`).flush(detail());
    });

    it('enviar sin nada pendiente manda la versión a revisión, avisa y vuelve a Mis borradores', async () => {
      await mount();
      await click(one('.submit'));

      expect(text$(one('.submit'))).toBe('Enviando…');
      expect((one('.submit') as HTMLButtonElement).disabled).toBe(true);
      http.expectOne(`${TEST_API_BASE}/versions/${ID}/submit`).flush(null);
      await settle();

      expect(notices.notices().map((n) => [n.kind, n.messages])).toEqual([
        ['confirmation', [SUBMITTED]],
      ]);
      expect(router.navigate).toHaveBeenCalledWith(['/gestion/borradores']);
    });

    it('antes de enviar espera el guardado pendiente', async () => {
      await mount();
      state.edit((content) => ({ ...content, complications: 'Nueva' }));
      await click(one('.submit'));

      http.expectNone(`${TEST_API_BASE}/versions/${ID}/submit`);
      http.expectOne({ method: 'PUT', url: `${TEST_API_BASE}/versions/${ID}` }).flush(detail());
      await settle();
      http.expectOne(`${TEST_API_BASE}/versions/${ID}/submit`).flush(null);
      await settle();
      expect(router.navigate).toHaveBeenCalledWith(['/gestion/borradores']);
    });

    it('si el guardado falla, no envía y deja intentarlo otra vez', async () => {
      await mount();
      state.edit((content) => ({ ...content, complications: 'Nueva' }));
      await click(one('.submit'));
      http
        .expectOne({ method: 'PUT', url: `${TEST_API_BASE}/versions/${ID}` })
        .flush('', { status: 500, statusText: 'Error' });
      await settle();

      expect((one('.submit') as HTMLButtonElement).disabled).toBe(false);
      expect(text$(one('.submit'))).toBe('Enviar a revisión');
      expect(router.navigate).not.toHaveBeenCalled();
      http.expectNone(`${TEST_API_BASE}/versions/${ID}/submit`);
    });

    it('si la API rechaza el envío, se queda donde está, sin aviso propio', async () => {
      await mount();
      await click(one('.submit'));
      http
        .expectOne(`${TEST_API_BASE}/versions/${ID}/submit`)
        .flush({ detail: 'No' }, { status: 422, statusText: 'No' });
      await settle();

      expect(router.navigate).not.toHaveBeenCalled();
      expect(notices.notices()).toEqual([]);
      expect((one('.submit') as HTMLButtonElement).disabled).toBe(false);
    });

    it('un segundo toque mientras va el envío no manda otro', async () => {
      await mount();
      await click(one('.submit'));
      one('.submit').click();
      await settle();
      http.expectOne(`${TEST_API_BASE}/versions/${ID}/submit`).flush(null);
    });

    it('con algo sin completar, enviar no hace nada', async () => {
      await mount({ complete: false });
      one('.submit').click();
      await settle();
      http.expectNone(`${TEST_API_BASE}/versions/${ID}/submit`);
    });
  });

  describe('quien publica', () => {
    it('lleva su título, su subtítulo según el rol y el botón con la versión', async () => {
      await mount({ publishes: true, role: 'reviewer' });
      expect(text$(one('h2'))).toBe('Revisar y publicar');
      expect(text$(one('.title p'))).toBe(
        'Con rol revisor, lo propio se publica sin pasar por otro revisor.',
      );
      expect(text$(one('.submit'))).toBe('Publicar versión 2');
      expect(text$(one('.note'))).toBe(
        'La versión 1 queda como reemplazada y se conserva en el historial.',
      );
    });

    it('el admin lo dice con su rol', async () => {
      await mount({ publishes: true, role: 'admin' });
      expect(text$(one('.title p'))).toBe(
        'Con rol admin, lo propio se publica sin pasar por otro revisor.',
      );
    });

    it('la versión 1 no reemplaza nada: sin aclaración', async () => {
      await mount({ publishes: true, role: 'reviewer', number: 1 });
      expect(root.querySelector('.note')).toBeNull();
    });

    it('bloqueada, dice «Para publicar falta completar …»', async () => {
      await mount({ publishes: true, role: 'reviewer', complete: false });
      expect(text$(one('.reason'))).toContain('Para publicar falta completar');
      expect((one('.submit') as HTMLButtonElement).disabled).toBe(true);
    });

    it('tocar «Publicar versión 2» abre la confirmación en la misma tarjeta, sin enviar nada', async () => {
      await mount({ publishes: true, role: 'reviewer' });
      await click(one('.submit'));

      expect(root.querySelector('.submit')).toBeNull();
      expect(text$(one('.confirm p'))).toBe(
        'Publicar la versión 2 de Colecistectomía. Desde ese momento es la que ven estudiantes, SIVRI y SIMIQ3D.',
      );
      expect(Array.from(root.querySelectorAll('.confirm button')).map((b) => text$(b))).toEqual([
        'Publicar',
        'Cancelar',
      ]);
      expect(document.activeElement).toBe(one('.confirm button'));
      http.expectNone(`${TEST_API_BASE}/versions/${ID}/publish`);
    });

    it('en la versión 1 la confirmación dice que la técnica entra al catálogo', async () => {
      await mount({ publishes: true, role: 'reviewer', number: 1 });
      await click(one('.submit'));
      expect(text$(one('.confirm p'))).toBe(
        'Publicar la versión 1 de Colecistectomía. La técnica entra al catálogo y la ven estudiantes, SIVRI y SIMIQ3D.',
      );
    });

    it('«Cancelar» devuelve el botón, con el foco', async () => {
      await mount({ publishes: true, role: 'reviewer' });
      await click(one('.submit'));
      await click(Array.from(root.querySelectorAll<HTMLElement>('.confirm button'))[1]);

      expect(root.querySelector('.confirm')).toBeNull();
      expect(document.activeElement).toBe(one('.submit'));
      http.expectNone(`${TEST_API_BASE}/versions/${ID}/publish`);
    });

    it('«Publicar» de la versión 2 publica, avisa y va al detalle de la técnica', async () => {
      await mount({ publishes: true, role: 'reviewer' });
      await click(one('.submit'));
      await click(one('.confirm button'));

      http.expectOne(`${TEST_API_BASE}/versions/${ID}/publish`).flush(null);
      await settle();

      expect(notices.notices().map((n) => [n.kind, n.messages])).toEqual([
        ['confirmation', [publishedNotice('Colecistectomía')]],
      ]);
      expect(publishedNotice('Colecistectomía')).toBe(
        '«Colecistectomía» se publicó y ya está en el catálogo.',
      );
      expect(router.navigate).toHaveBeenCalledWith(['/tecnicas', 't-edit', 'datos-clinicos']);
    });

    it('«Publicar» de la versión 1 vuelve a Mis borradores', async () => {
      await mount({ publishes: true, role: 'admin', number: 1 });
      await click(one('.submit'));
      await click(one('.confirm button'));
      http.expectOne(`${TEST_API_BASE}/versions/${ID}/publish`).flush(null);
      await settle();

      expect(router.navigate).toHaveBeenCalledWith(['/gestion/borradores']);
    });

    it('si la API rechaza, la confirmación se cierra y queda el botón', async () => {
      await mount({ publishes: true, role: 'reviewer' });
      await click(one('.submit'));
      await click(one('.confirm button'));
      http
        .expectOne(`${TEST_API_BASE}/versions/${ID}/publish`)
        .flush({ detail: 'No' }, { status: 409, statusText: 'No' });
      await settle();

      expect(root.querySelector('.confirm')).toBeNull();
      expect((one('.submit') as HTMLButtonElement).disabled).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('solo lectura', () => {
    it('una versión en revisión se ve sin botón ni «Completar», con la aclaración', async () => {
      await mount({ state: 'in_review', complete: false });
      expect(root.querySelector('.submit')).toBeNull();
      expect(root.querySelector('.reason')).toBeNull();
      expect(root.querySelector('a.complete')).toBeNull();
      expect(rows()).toHaveLength(4);
      expect(text$(one('.note'))).toContain('Mientras esté en revisión no se puede editar');
    });
  });
});

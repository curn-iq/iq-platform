import type { HttpParams } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../../core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import type { Role } from '../../../domain/role';
import { Drafts } from './drafts';

const MAYO = { zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 4, columns: 6 };
const RESERVE = { zone_id: 'z-reserva', zone: 'Mesa de reserva', used: true, rows: 3, columns: 5 };

/** Todo lo obligatorio lleno y las dos mesas armadas. */
const COMPLETE = {
  description: 'Para qué sirve.',
  indications: 'Indicaciones.',
  anesthesia: 'General.',
  drapes: 'Campos.',
  patient_position: 'Supino.',
  source: 'Documento de IQ.',
  zones: [MAYO, RESERVE],
  items: [
    { zone_id: 'z-mayo', cells: [{ row: 1, column: 1 }] },
    { zone_id: 'z-reserva', cells: [{ row: 1, column: 1 }] },
  ],
  sutures: [{ name: 'Seda' }],
};

/** Una técnica nueva: nada lleno, solo la mesa de Mayo en su tamaño inicial. */
const EMPTY = {
  description: null,
  indications: null,
  anesthesia: null,
  drapes: null,
  patient_position: null,
  source: null,
  zones: [MAYO],
  items: [],
  sutures: [],
};

function detail(
  id: string,
  technique: string,
  state: string,
  content: object,
  rejections: object[] = [],
  updatedAt = '2026-10-03T15:00:00',
) {
  return {
    summary: {
      id,
      technique_id: `t-${id}`,
      technique,
      specialty: 'Cirugía general',
      number: 2,
      state,
      created_by: 'u-1',
      author: 'Ana',
      updated_at: updatedAt,
    },
    content,
    rejections,
  };
}

const SUMMARIES_URL = (r: { url: string }) => r.url === `${TEST_API_BASE}/versions`;
/** La lista de las versiones en curso, con el contenido de cada una (`include=content`). */
const IN_PROGRESS_URL = (r: { url: string; params: HttpParams }) =>
  SUMMARIES_URL(r) && r.params.get('include') === 'content';

describe('Drafts', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<Drafts>;
  let root: HTMLElement;

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
    fixture.detectChanges();
  }

  /** Abre la pantalla; si hay `details`, responde la lista con el contenido de cada versión. */
  async function open(
    details?: ReturnType<typeof detail>[],
    role: Role = 'contributor',
  ): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([]),
        { provide: SessionService, useValue: { role: signal(role) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Drafts);
    root = fixture.nativeElement;
    await settle();
    if (details) await answer(details);
  }

  async function answer(details: ReturnType<typeof detail>[]): Promise<void> {
    http.expectOne(IN_PROGRESS_URL).flush(details);
    await settle();
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const rows = () => Array.from(root.querySelectorAll<HTMLElement>('tr.row'));
  const names = () => rows().map((r) => text(r.querySelector('.name')));
  const marks = (row: HTMLElement) =>
    Array.from(row.querySelectorAll('app-progress-mark')).map((m) => m.getAttribute('data-status'));
  const filterButtons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.group button'));

  async function choose(label: string): Promise<void> {
    filterButtons()
      .find((b) => text(b)!.startsWith(label))!
      .click();
    await settle();
  }

  const FOUR = () => [
    detail('v-1', 'Hemicolectomía laparoscópica', 'draft', EMPTY, [
      {
        reason: 'Mesa de Mayo · 4: repetido.\nNota general: revisar la numeración.',
        rejected_by: 'Laura Pérez',
        created_at: '2026-10-04T09:00:00',
      },
    ]),
    detail('v-2', 'Colecistectomía', 'draft', {
      ...COMPLETE,
      anesthesia: null,
      zones: [MAYO],
      items: [{ zone_id: 'z-mayo', cells: [{ row: 1, column: 1 }] }],
    }),
    detail('v-3', 'Nefrectomía laparoscópica', 'draft', EMPTY),
    detail('v-4', 'Tiroidectomía', 'in_review', COMPLETE),
  ];

  afterEach(() => http.verify());

  describe('al cargar', () => {
    it('pide las versiones propias en curso con su contenido, en una sola petición', async () => {
      await open();

      const request = http.expectOne(IN_PROGRESS_URL);
      expect(request.request.params.get('mine')).toBe('true');
      expect(request.request.params.getAll('state')).toEqual(['draft', 'in_review']);
      request.flush([
        detail('v-1', 'Colecistectomía', 'draft', COMPLETE),
        detail('v-2', 'Mastectomía', 'draft', COMPLETE),
      ]);
      await settle();

      // Ninguna versión se pide por separado
      http.expectNone((r) => r.url.startsWith(`${TEST_API_BASE}/versions/`));
      expect(names()).toEqual(['Colecistectomía', 'Mastectomía']);
    });

    it('dice «Cargando…» y no cuenta nada hasta que llega todo', async () => {
      await open();

      expect(text(root.querySelector('.loading'))).toBe('Cargando…');
      expect(root.querySelector('.summary')).toBeNull();
      expect(root.querySelector('table')).toBeNull();

      await answer([detail('v-1', 'Colecistectomía', 'draft', COMPLETE)]);
      expect(text(root.querySelector('.summary'))).toBe('1 técnica en curso.');
    });
  });

  describe('el encabezado', () => {
    const newLink = () => root.querySelector<HTMLAnchorElement>('a.new')!;
    const editButton = () => root.querySelector<HTMLButtonElement>('app-edit-published button')!;

    it('«Nueva técnica» lleva al editor de una técnica nueva, y «Editar una publicada» abre su panel', async () => {
      await open([detail('v-1', 'Colecistectomía', 'draft', COMPLETE)]);

      expect(text(newLink())).toBe('Nueva técnica');
      expect(newLink().getAttribute('href')).toBe('/gestion/editor/nueva');
      expect(text(editButton())).toBe('Editar una publicada');
    });

    it('están desde el principio: mientras carga, si falla y sin nada en curso', async () => {
      await open();
      expect(newLink()).not.toBeNull();
      expect(editButton()).not.toBeNull();

      http.expectOne(IN_PROGRESS_URL).flush([]);
      await settle();
      http.expectOne((r) => r.params.getAll('state')?.join() === 'published').flush([]);
      await settle();

      expect(text(root.querySelector('.summary'))).toBe('Nada en curso.');
      expect(newLink()).not.toBeNull();
      expect(editButton()).not.toBeNull();
    });
  });

  describe('la matriz', () => {
    it('una fila por técnica, con su especialidad, su versión y su estado', async () => {
      await open(FOUR());

      expect(names()).toEqual([
        'Hemicolectomía laparoscópica',
        'Colecistectomía',
        'Nefrectomía laparoscópica',
        'Tiroidectomía',
      ]);
      expect(text(rows()[1].querySelector('.meta'))).toBe('Cirugía general · Versión 2');
      expect(rows().map((r) => text(r.querySelector('app-status-pill')))).toEqual([
        'Devuelta',
        'Borrador',
        'Borrador',
        'En revisión',
      ]);
    });

    it('una columna por sección, en el orden del editor', async () => {
      await open(FOUR());

      expect(Array.from(root.querySelectorAll('thead th')).map((th) => text(th))).toEqual([
        'Técnica',
        'Estado',
        'Editada',
        'Datos clínicos',
        'Instrumental',
        'Mesa de Mayo',
        'Mesa de reserva',
        'Acción',
      ]);
    });

    it('cada marca sigue la regla del avance, incluida «sin mesa» y la mesa pendiente', async () => {
      await open(FOUR());

      // Hemicolectomía (todo vacío; solo la mesa de Mayo, sin objetos)
      expect(marks(rows()[0])).toEqual(['pending', 'pending', 'pending', 'no_table']);
      // Colecistectomía: falta la anestesia; sin mesa de reserva
      expect(marks(rows()[1])).toEqual(['in_progress', 'complete', 'complete', 'no_table']);
      // Tiroidectomía: completa
      expect(marks(rows()[3])).toEqual(['complete', 'complete', 'complete', 'complete']);
    });

    it('cada marca escalona su trazado por columna y por fila', async () => {
      await open(FOUR());

      const third = rows()[2].querySelectorAll<HTMLElement>('app-progress-mark')[3];
      expect(third.style.getPropertyValue('--c')).toBe('3');
      expect(third.style.getPropertyValue('--f')).toBe('2');
    });

    it('«Continuar» abre el primer paso del editor; en revisión es «Ver», al mismo editor', async () => {
      await open(FOUR());

      const links = rows().map((r) => r.querySelector<HTMLAnchorElement>('a.continue')!);
      expect(links.map((a) => text(a))).toEqual(['Continuar', 'Continuar', 'Continuar', 'Ver']);
      expect(links[1].getAttribute('href')).toBe('/gestion/editor/v-2/datos-clinicos');
      expect(links[3].getAttribute('href')).toBe('/gestion/editor/v-4/datos-clinicos');
      expect(links[3].getAttribute('aria-label')).toBe('Ver Tiroidectomía');
      expect(links[0].getAttribute('aria-label')).toBe('Continuar Hemicolectomía laparoscópica');
    });

    it('dice cuándo se editó cada una', async () => {
      const today = new Date();
      const iso = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 42);
      const local = `${iso.getFullYear()}-${String(iso.getMonth() + 1).padStart(2, '0')}-${String(iso.getDate()).padStart(2, '0')}T10:42:00`;
      await open([
        detail('v-1', 'De hoy', 'draft', COMPLETE, [], local),
        detail('v-2', 'De otro año', 'draft', COMPLETE, [], '2020-10-03T15:00:00'),
      ]);

      expect(rows().map((r) => text(r.querySelector('.edited')))).toEqual([
        'Hoy, 10:42',
        '3 oct 2020',
      ]);
    });

    it('la leyenda explica las cuatro marcas, sin repetirlas a los lectores de pantalla', async () => {
      await open(FOUR());

      const items = Array.from(root.querySelectorAll('.legend li'));
      expect(items.map((li) => text(li))).toEqual([
        'Completa Completa',
        'En curso En curso',
        'Pendiente Pendiente',
        'La técnica no tiene esa mesa La técnica no tiene esa mesa',
      ]);
      for (const li of items) {
        expect(li.querySelector('app-progress-mark')!.getAttribute('aria-hidden')).toBe('true');
      }
    });
  });

  describe('resumen y filtros', () => {
    it('cuenta las técnicas y dice cuántas volvieron de revisión', async () => {
      await open(FOUR());

      expect(text(root.querySelector('.summary'))).toBe(
        '4 técnicas en curso. Una volvió de revisión.',
      );
    });

    it('cada filtro lleva su cifra; «Borradores» no cuenta las devueltas', async () => {
      await open(FOUR());

      expect(filterButtons().map((b) => text(b))).toEqual([
        'Todas 4',
        'Devueltas 1',
        'Borradores 2',
        'En revisión 1',
      ]);
    });

    it('al elegir un filtro quedan solo las de ese estado', async () => {
      await open(FOUR());

      await choose('Devueltas');
      expect(names()).toEqual(['Hemicolectomía laparoscópica']);

      await choose('Borradores');
      expect(names()).toEqual(['Colecistectomía', 'Nefrectomía laparoscópica']);

      await choose('En revisión');
      expect(names()).toEqual(['Tiroidectomía']);

      await choose('Todas');
      expect(rows()).toHaveLength(4);
    });

    it('un filtro sin técnicas lo dice', async () => {
      await open([detail('v-1', 'Colecistectomía', 'draft', COMPLETE)]);

      await choose('En revisión');

      expect(rows()).toHaveLength(0);
      expect(text(root.querySelector('.empty-filter'))).toBe('No hay técnicas en este estado.');
    });
  });

  describe('motivo de la devolución', () => {
    const note = () => root.querySelector<HTMLElement>('.note-row .note-box');
    const toggle = () => root.querySelector<HTMLButtonElement>('.note-toggle')!;

    it('solo la devuelta lleva nota y botón; las demás no', async () => {
      await open(FOUR());

      expect(root.querySelectorAll('.note-row')).toHaveLength(1);
      expect(root.querySelectorAll('.note-toggle')).toHaveLength(1);
      expect(rows()[0].classList.contains('with-note')).toBe(true);
    });

    it('dice el día de la revisión', async () => {
      await open(FOUR());

      expect(text(root.querySelector('.note-head'))).toBe('Revisión · 4 oct');
    });

    it('el motivo conserva sus saltos de línea y se pinta como texto, no como HTML', async () => {
      await open([
        detail('v-1', 'Colecistectomía', 'draft', COMPLETE, [
          {
            reason: 'Primera línea.\n<b>Segunda</b> línea.',
            rejected_by: 'Laura Pérez',
            created_at: '2026-10-04T09:00:00',
          },
        ]),
      ]);

      const reason = root.querySelector('.note-text')!;
      expect(reason.textContent).toBe('Primera línea.\n<b>Segunda</b> línea.');
      expect(reason.querySelector('b')).toBeNull();
    });

    it('se abre cuando las marcas terminan de trazarse, y se cierra y se abre con su botón', async () => {
      await open(FOUR());
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(note()!.classList.contains('closed')).toBe(true);

      await vi.waitFor(
        async () => {
          await fixture.whenStable();
          expect(toggle().getAttribute('aria-expanded')).toBe('true');
        },
        { timeout: 3000 },
      );
      expect(note()!.classList.contains('closed')).toBe(false);
      expect(toggle().getAttribute('aria-controls')).toBe(note()!.id);

      toggle().click();
      await settle();
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(note()!.classList.contains('closed')).toBe(true);

      toggle().click();
      await settle();
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
    });

    it('en celular la nota lleva su propio «Continuar»', async () => {
      await open(FOUR());

      const link = root.querySelector<HTMLAnchorElement>('.note-row a.continue')!;
      expect(link.getAttribute('href')).toBe('/gestion/editor/v-1/datos-clinicos');
      expect(link.getAttribute('aria-label')).toBe('Continuar Hemicolectomía laparoscópica');
    });
  });

  describe('revisor o admin', () => {
    it('no tiene filtros ni leyenda, y su línea dice que se publica sin revisión', async () => {
      await open([detail('v-1', 'Colecistectomía', 'draft', COMPLETE)], 'reviewer');

      expect(root.querySelector('app-segmented-control')).toBeNull();
      expect(root.querySelector('.legend')).toBeNull();
      expect(text(root.querySelector('.summary'))).toBe(
        '1 técnica en curso. Se publica al terminarla, sin pasar por revisión.',
      );
      expect(names()).toEqual(['Colecistectomía']);
    });

    it('el admin es igual', async () => {
      await open(
        [detail('v-1', 'A', 'draft', COMPLETE), detail('v-2', 'B', 'draft', COMPLETE)],
        'admin',
      );

      expect(text(root.querySelector('.summary'))).toBe(
        '2 técnicas en curso. Se publican al terminarlas, sin pasar por revisión.',
      );
    });
  });

  describe('sin nada en curso', () => {
    it('dice «Nada en curso.» y lo último que se publicó', async () => {
      await open();
      http.expectOne(IN_PROGRESS_URL).flush([]);
      await settle();

      const published = http.expectOne(
        (r) => SUMMARIES_URL(r) && r.params.getAll('state')?.join() === 'published',
      );
      expect(published.request.params.get('mine')).toBe('true');
      published.flush([
        { ...detail('v-9', 'Colecistectomía', 'published', COMPLETE).summary, number: 2 },
        { ...detail('v-8', 'Mastectomía', 'published', COMPLETE).summary, number: 1 },
      ]);
      await settle();

      expect(text(root.querySelector('.summary'))).toBe('Nada en curso.');
      expect(text(root.querySelector('.last'))).toBe(
        'La versión 2 de Colecistectomía ya está publicada.',
      );
      expect(root.querySelector('table')).toBeNull();
      expect(root.querySelector('app-segmented-control')).toBeNull();
    });

    it('si nunca publicó nada, queda solo la línea', async () => {
      await open();
      http.expectOne(IN_PROGRESS_URL).flush([]);
      await settle();
      http.expectOne((r) => r.params.getAll('state')?.join() === 'published').flush([]);
      await settle();

      expect(text(root.querySelector('.summary'))).toBe('Nada en curso.');
      expect(root.querySelector('.last')).toBeNull();
    });

    it('lo último publicado solo se pide cuando no hay nada en curso', async () => {
      await open([detail('v-1', 'Colecistectomía', 'draft', COMPLETE)]);

      http.expectNone((r) => r.params.getAll('state')?.join() === 'published');
    });
  });

  describe('si falla', () => {
    const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

    it('la lista: lo dice, no cuenta nada y «Reintentar» la pide otra vez', async () => {
      await open();
      http.expectOne(IN_PROGRESS_URL).flush(null, SERVER_ERROR);
      await settle();

      expect(text(root.querySelector('.notice'))).toContain('No se pudo cargar Mis borradores.');
      expect(root.querySelector('.summary')).toBeNull();
      expect(root.querySelector('.loading')).toBeNull();

      root.querySelector<HTMLButtonElement>('.notice button')!.click();
      await settle();
      await answer([detail('v-1', 'Colecistectomía', 'draft', COMPLETE)]);

      expect(names()).toEqual(['Colecistectomía']);
      expect(root.querySelector('.notice')).toBeNull();
    });
  });
});

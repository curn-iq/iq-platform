import type { HttpParams } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../../../core/session/session.service';
import type { Account } from '../../../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../../data/testing';
import { ReviewList } from './review-list';

const REVIEWER: Account = {
  id: 'u-revisor',
  name: 'Laura Pérez',
  email: 'laura@example.com',
  role: 'reviewer',
};

/** Una fecha de hace `days` días, a media mañana. */
function daysAgo(days: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 10).toISOString();
}

function version(
  id: string,
  technique: string,
  overrides: { number?: number; created_by?: string; days?: number; author?: string } = {},
) {
  return {
    id,
    technique_id: `t-${id}`,
    technique,
    specialty: 'Cirugía general',
    number: overrides.number ?? 2,
    state: 'in_review',
    created_by: overrides.created_by ?? 'u-autor',
    author: overrides.author ?? 'Daniela Ortiz',
    updated_at: daysAgo(overrides.days ?? 1),
  };
}

describe('ReviewList', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<ReviewList>;
  let root: HTMLElement;

  const isVersions = (r: { url: string }) => r.url === `${TEST_API_BASE}/versions`;
  const isPending = (r: { url: string; params: HttpParams }) =>
    isVersions(r) && r.params.get('reviewed_by_me') === null;
  const isReviewed = (r: { url: string; params: HttpParams }) =>
    isVersions(r) && r.params.get('reviewed_by_me') === 'true';
  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const items = () => Array.from(root.querySelectorAll<HTMLElement>('.item'));
  const names = () => items().map((item) => text(item.querySelector('.name')));

  async function settle(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      TestBed.tick();
    }
    fixture.detectChanges();
  }

  /** Abre la pantalla; si hay `versions`, responde la lista. */
  async function open(versions?: ReturnType<typeof version>[]): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([]),
        {
          provide: SessionService,
          useValue: { account: signal(REVIEWER), role: signal(REVIEWER.role) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReviewList);
    root = fixture.nativeElement;
    await settle();
    if (versions) {
      http.expectOne(isPending).flush(versions);
      await settle();
    }
  }

  afterEach(() => http.verify());

  it('pide las versiones en revisión', async () => {
    await open();

    const request = http.expectOne(isPending);
    expect(request.request.params.getAll('state')).toEqual(['in_review']);
    expect(request.request.params.get('mine')).toBeNull();
    request.flush([]);
  });

  it('mientras llega la lista dice «Cargando…» y no resume nada', async () => {
    await open();

    expect(text(root.querySelector('.loading'))).toBe('Cargando…');
    expect(root.querySelector('.loading')?.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('.summary')).toBeNull();
    http.expectOne(isPending).flush([]);
  });

  it('el título es «Por revisar»', async () => {
    await open([]);

    expect(text(root.querySelector('h1'))).toBe('Por revisar');
  });

  describe('con versiones', () => {
    beforeEach(async () => {
      await open([
        version('v-2', 'Cesárea', { days: 2, author: 'Andrés Gómez' }),
        version('v-1', 'Tiroidectomía', { days: 5 }),
        version('v-3', 'Nefrectomía', { number: 1, days: 0 }),
        version('v-propia', 'Colecistectomía', { created_by: REVIEWER.id }),
      ]);
    });

    it('lista las de otras personas, la que lleva más esperando primero', () => {
      expect(names()).toEqual(['Tiroidectomía', 'Cesárea', 'Nefrectomía']);
    });

    it('resume cuántas esperan y cuánto lleva la más antigua', () => {
      expect(text(root.querySelector('.summary'))).toBe(
        '3 versiones esperan revisión. La más antigua lleva 5 días.',
      );
    });

    it('cada fila dice la especialidad y la versión, el autor y el envío con su espera', () => {
      const [first] = items();
      const [author, sent] = Array.from(first.querySelectorAll('.datum')).map((datum) =>
        Array.from(datum.querySelectorAll('p')).map((p) => text(p)),
      );

      expect(text(first.querySelector('.meta'))).toBe('Cirugía general · Versión 2');
      expect(author).toEqual(['Autor', 'Daniela Ortiz']);
      expect(sent[0]).toBe('Enviada');
      expect(sent[1]).toMatch(/^\d{1,2} \S{3} · hace 5 días$/);
    });

    it('dice «hoy» de lo que llegó hoy', () => {
      const sent = items().map((item) => text(item.querySelector('.sent')));

      expect(sent[2]).toMatch(/· hoy$/);
    });

    it('distingue una técnica nueva de una edición de la publicada', () => {
      expect(items().map((item) => text(item.querySelector('.kind')))).toEqual([
        'Edición de la publicada',
        'Edición de la publicada',
        'Técnica nueva',
      ]);
    });

    it('«Revisar» lleva a la revisión de esa versión y dice de cuál', () => {
      const links = items().map((item) => item.querySelector<HTMLAnchorElement>('a.review')!);

      expect(links.map((a) => a.getAttribute('href'))).toEqual([
        '/gestion/revision/v-1',
        '/gestion/revision/v-2',
        '/gestion/revision/v-3',
      ]);
      expect(links[0].getAttribute('aria-label')).toBe('Revisar Tiroidectomía');
      expect(text(links[0])).toBe('Revisar');
    });
  });

  it('con una sola dice «1 versión espera revisión»', async () => {
    await open([version('v-1', 'Tiroidectomía', { days: 3 })]);

    expect(text(root.querySelector('.summary'))).toBe('1 versión espera revisión. Lleva 3 días.');
  });

  it('sin nada por revisar lo dice y no dibuja la lista', async () => {
    await open([]);

    expect(text(root.querySelector('.summary'))).toBe('Nada por revisar.');
    expect(root.querySelector('.queue')).toBeNull();
  });

  it('si las únicas son propias, tampoco hay nada por revisar', async () => {
    await open([version('v-propia', 'Colecistectomía', { created_by: REVIEWER.id })]);

    expect(text(root.querySelector('.summary'))).toBe('Nada por revisar.');
  });

  describe('revisadas por mí', () => {
    const REASON = 'Mesa de Mayo · 4 Pinza Kelly: repetido.\nNota general: revisar la numeración.';

    /** Una versión que pasó por revisión: con `rejections` el contenido y los rechazos de la API. */
    function reviewed(id: string, technique: string, state: string, rejections: object[] = []) {
      return {
        summary: { ...version(id, technique), state },
        content: {},
        rejections,
      };
    }

    const returnedAt = new Date(2026, 9, 4, 9).toISOString();
    const control = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.group button'));
    const label = (b: HTMLButtonElement) => text(b);

    async function chooseReviewed(): Promise<void> {
      control()[1].click();
      await settle();
    }

    async function openReviewed(details: ReturnType<typeof reviewed>[]): Promise<void> {
      await open([version('v-1', 'Tiroidectomía', { days: 5 }), version('v-2', 'Cesárea')]);
      await chooseReviewed();
      http.expectOne(isReviewed).flush(details);
      await settle();
    }

    it('el control ofrece las dos vistas, con la cifra de las que esperan', async () => {
      await open([version('v-1', 'Tiroidectomía'), version('v-2', 'Cesárea')]);

      expect(control().map(label)).toEqual(['Por revisar 2', 'Revisadas por mí']);
      expect(control()[0].getAttribute('aria-pressed')).toBe('true');
    });

    it('no pide las revisadas hasta que se abre esa vista', async () => {
      await open([]);

      http.expectNone(isReviewed);
    });

    it('al abrirla pide las revisadas por mí con el contenido de cada una', async () => {
      await open([]);
      await chooseReviewed();

      const request = http.expectOne(isReviewed);
      expect(request.request.params.get('include')).toBe('content');
      expect(request.request.params.has('state')).toBe(false);
      expect(text(root.querySelector('.loading'))).toBe('Cargando…');
      request.flush([]);
    });

    it('una devuelta dice «Devuelta», el día y el motivo con sus saltos de línea', async () => {
      await openReviewed([
        reviewed('v-3', 'Hemicolectomía laparoscópica', 'draft', [
          { reason: REASON, rejected_by: 'Laura Pérez', created_at: returnedAt },
        ]),
      ]);

      const [item] = items();
      expect(text(item.querySelector('.name'))).toBe('Hemicolectomía laparoscópica');
      expect(text(item.querySelector('app-status-pill'))).toBe('Devuelta');
      expect(item.querySelector('app-status-pill')?.getAttribute('data-kind')).toBe('returned');
      expect(text(item.querySelectorAll('.datum')[1].querySelector('.sent'))).toBe('4 oct');
      expect(item.querySelector('.reason')?.textContent).toBe(REASON);
    });

    it('una aprobada dice «Aprobada», sin fecha ni motivo', async () => {
      await openReviewed([reviewed('v-4', 'Colecistectomía', 'published')]);

      const [item] = items();
      expect(text(item.querySelector('app-status-pill'))).toBe('Aprobada');
      expect(item.querySelector('app-status-pill')?.getAttribute('data-kind')).toBe('approved');
      expect(text(item.querySelectorAll('.datum')[1].querySelector('.sent'))).toBe('—');
      expect(item.querySelector('.reason')).toBeNull();
    });

    it('las filas no llevan «Revisar»: ya están decididas', async () => {
      await openReviewed([reviewed('v-4', 'Colecistectomía', 'superseded')]);

      expect(root.querySelector('a.review')).toBeNull();
    });

    it('las revisadas siguen el orden en que llegan, y su cifra aparece al llegar', async () => {
      await openReviewed([
        reviewed('a', 'Colecistectomía', 'published'),
        reviewed('b', 'Nefrectomía', 'archived'),
        reviewed('c', 'Cesárea', 'in_review'),
      ]);

      expect(names()).toEqual(['Colecistectomía', 'Nefrectomía']);
      expect(control().map(label)).toEqual(['Por revisar 2', 'Revisadas por mí 2']);
    });

    it('sin nada revisado lo dice', async () => {
      await openReviewed([]);

      expect(text(root.querySelector('.empty'))).toBe('Todavía no hay versiones revisadas.');
      expect(root.querySelector('.queue')).toBeNull();
    });

    it('volver a «Por revisar» muestra su lista, y la línea de resumen no cambia', async () => {
      await openReviewed([reviewed('v-4', 'Colecistectomía', 'published')]);
      const summary = text(root.querySelector('.summary'));

      control()[0].click();
      await settle();

      expect(names()).toEqual(['Tiroidectomía', 'Cesárea']);
      expect(text(root.querySelector('.summary'))).toBe(summary);
    });

    it('abrirla otra vez la revisa de nuevo y conserva lo anterior hasta que llegue', async () => {
      await openReviewed([reviewed('v-4', 'Colecistectomía', 'published')]);
      control()[0].click();
      await settle();

      await chooseReviewed();

      expect(names()).toEqual(['Colecistectomía']);
      http.expectOne(isReviewed).flush([]);
      await settle();
      expect(text(root.querySelector('.empty'))).toBe('Todavía no hay versiones revisadas.');
    });

    it('si falla, lo dice y «Reintentar» la pide de nuevo', async () => {
      await open([]);
      await chooseReviewed();
      http.expectOne(isReviewed).flush('', { status: 500, statusText: 'Server Error' });
      await settle();

      expect(text(root.querySelector('.notice'))).toContain('No se pudo cargar Revisadas por mí.');

      root.querySelector<HTMLButtonElement>('.notice button')!.click();
      await settle();
      http.expectOne(isReviewed).flush([reviewed('v-4', 'Colecistectomía', 'published')]);
      await settle();

      expect(names()).toEqual(['Colecistectomía']);
    });
  });

  describe('si la API falla', () => {
    beforeEach(async () => {
      await open();
      http.expectOne(isPending).flush('', { status: 500, statusText: 'Server Error' });
      await settle();
    });

    it('lo dice y no resume nada: no se sabe cuántas hay', () => {
      expect(text(root.querySelector('.notice'))).toContain('No se pudo cargar Por revisar.');
      expect(root.querySelector('.summary')).toBeNull();
      expect(root.querySelector('.queue')).toBeNull();
    });

    it('«Reintentar» vuelve a pedir la lista', async () => {
      root.querySelector<HTMLButtonElement>('.notice button')!.click();
      await settle();

      http.expectOne(isPending).flush([version('v-1', 'Tiroidectomía')]);
      await settle();

      expect(names()).toEqual(['Tiroidectomía']);
      expect(root.querySelector('.notice')).toBeNull();
    });
  });
});

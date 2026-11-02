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

  const isList = (r: { url: string; params: HttpParams }) => r.url === `${TEST_API_BASE}/versions`;
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
      http.expectOne(isList).flush(versions);
      await settle();
    }
  }

  afterEach(() => http.verify());

  it('pide las versiones en revisión', async () => {
    await open();

    const request = http.expectOne(isList);
    expect(request.request.params.getAll('state')).toEqual(['in_review']);
    expect(request.request.params.get('mine')).toBeNull();
    request.flush([]);
  });

  it('mientras llega la lista dice «Cargando…» y no resume nada', async () => {
    await open();

    expect(text(root.querySelector('.loading'))).toBe('Cargando…');
    expect(root.querySelector('.loading')?.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('.summary')).toBeNull();
    http.expectOne(isList).flush([]);
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

  describe('si la API falla', () => {
    beforeEach(async () => {
      await open();
      http.expectOne(isList).flush('', { status: 500, statusText: 'Server Error' });
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

      http.expectOne(isList).flush([version('v-1', 'Tiroidectomía')]);
      await settle();

      expect(names()).toEqual(['Tiroidectomía']);
      expect(root.querySelector('.notice')).toBeNull();
    });
  });
});

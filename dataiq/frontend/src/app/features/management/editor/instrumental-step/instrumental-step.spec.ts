import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { VersionDetail } from '../../../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../../data/testing';
import { EditorCatalog } from '../editor-catalog';
import { EditorState } from '../editor-state';
import { InstrumentalStep } from './instrumental-step';

const instrument = (id: string, name: string, category: string, aliases: string[] = []) => ({
  id,
  name,
  category,
  description: null,
  description_source: null,
  aliases,
});

const KELLY = instrument('i-kelly', 'Pinza Kelly', 'Pinza');
const MOYNIHAN = instrument('i-moy', 'Pinza de Moynihan', 'Pinza', ['Pinza Moninjan']);
const BISTURI = instrument('i-bis', 'Mango de bisturí N.° 3', 'Bisturí');
const GASA = instrument('i-gasa', 'Gasa', 'Accesorios');

const apiItem = (n: number, ...instruments: { id: string; name: string }[]) => ({
  id: `item-${n}`,
  zone_id: null,
  zone: null,
  legend_number: null,
  source_text: instruments.map((i) => i.name).join(' con '),
  components: instruments.map((i) => ({ instrument_id: i.id, suture_id: null, name: i.name })),
  cells: [],
});

function version(state: string, items: object[]): VersionDetail {
  return {
    summary: {
      id: 'v-1',
      technique_id: 't-edit',
      technique: 'Colecistectomía',
      specialty: 'Cirugía general',
      number: 2,
      state,
      created_by: 'u-1',
      author: 'Ana Ruiz',
      updated_at: '2026-10-03T15:00:00Z',
    },
    content: {
      id: 't-edit',
      name: 'Colecistectomía',
      specialty: 'Cirugía general',
      version_number: 2,
      cups_code: null,
      anesthesia: null,
      patient_position: null,
      drapes: null,
      description: null,
      indications: null,
      complications: null,
      surgical_technique: null,
      source: null,
      zones: [],
      items,
      sutures: [],
      equipment: [],
      devices: [],
    },
    rejections: [],
  } as unknown as VersionDetail;
}

/** Una técnica publicada del catálogo con los instrumentos de sus objetos. */
const technique = (
  id: string,
  specialty: string,
  ...objects: { id: string; name: string }[][]
) => ({
  id,
  name: id,
  specialty,
  version_number: 1,
  items: objects.map((components, n) => apiItem(n, ...components)),
});

function catalog(extra: { instruments?: object[]; techniques?: object[] } = {}) {
  return {
    specialties: [],
    zones: [],
    categories: [
      { id: 'c-1', name: 'Accesorios' },
      { id: 'c-2', name: 'Bisturí' },
      { id: 'c-3', name: 'Pinza' },
    ],
    instruments: [KELLY, MOYNIHAN, BISTURI, GASA, ...(extra.instruments ?? [])],
    sutures: [],
    equipment: [],
    devices: [],
    techniques: extra.techniques ?? [
      technique('t-1', 'Cirugía general', [KELLY], [GASA]),
      technique('t-2', 'Cirugía general', [KELLY], [BISTURI]),
      technique('t-3', 'Cirugía general', [KELLY, MOYNIHAN]),
      technique('t-4', 'Urología', [MOYNIHAN]),
    ],
  };
}

describe('InstrumentalStep', () => {
  let state: EditorState;
  let http: HttpTestingController;
  let fixture: ComponentFixture<InstrumentalStep>;
  let root: HTMLElement;

  async function mount(
    options: {
      items?: object[];
      state?: string;
      catalog?: object;
      answer?: boolean;
    } = {},
  ): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), EditorState, EditorCatalog],
    });
    state = TestBed.inject(EditorState);
    http = TestBed.inject(HttpTestingController);
    state.load(version(options.state ?? 'draft', options.items ?? []));
    fixture = TestBed.createComponent(InstrumentalStep);
    fixture.componentRef.setInput('techniqueId', 't-edit');
    fixture.componentRef.setInput('specialty', 'Cirugía general');
    root = fixture.nativeElement;
    await settle();
    if (options.answer !== false) {
      http.expectOne(`${TEST_API_BASE}/catalog/full`).flush(options.catalog ?? catalog());
      await settle();
    }
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

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const chosen = () =>
    Array.from(root.querySelectorAll('.chosen .group')).map((group) => [
      text(group.querySelector('.group-name span')),
      Array.from(group.querySelectorAll('li')).map((li) => li.firstChild!.textContent!.trim()),
    ]);
  const chips = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.suggested .chip'));
  const rows = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.list .row'));
  const rowNamed = (name: string) =>
    rows().find((row) => text(row.querySelector('span'))!.startsWith(name))!;
  const types = () =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('.type')).map((b) => text(b));

  async function search(value: string): Promise<void> {
    const input = root.querySelector<HTMLInputElement>('app-search-field input')!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  }

  describe('mientras llega el catálogo', () => {
    it('dice «Cargando…», pide el catálogo completo y todavía no muestra las listas', async () => {
      await mount({ answer: false });

      expect(text(root.querySelector('.notice'))).toBe('Cargando…');
      expect(root.querySelector('.layout')).toBeNull();
      http.expectOne(`${TEST_API_BASE}/catalog/full`).flush(catalog());
      await settle();
      expect(root.querySelector('.layout')).not.toBeNull();
    });

    it('si falla lo dice y «Reintentar» vuelve a pedirlo', async () => {
      await mount({ answer: false });
      http
        .expectOne(`${TEST_API_BASE}/catalog/full`)
        .flush(null, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(text(root.querySelector('.notice'))).toContain('No se pudo cargar el catálogo.');
      root.querySelector<HTMLButtonElement>('.notice button')!.click();
      await settle();
      http.expectOne(`${TEST_API_BASE}/catalog/full`).flush(catalog());
      await settle();

      expect(root.querySelector('.layout')).not.toBeNull();
    });
  });

  describe('En esta técnica', () => {
    it('el título dice cuántos objetos hay', async () => {
      await mount({ items: [apiItem(1, KELLY), apiItem(2, GASA)] });

      expect(text(root.querySelector('.title h2'))).toBe('Instrumental');
      expect(text(root.querySelector('.title p'))).toBe('2 en esta técnica.');
      expect(text(root.querySelector('.chosen .head .count'))).toBe('2');
    });

    it('agrupa los objetos por categoría, en el orden de la API, cada grupo con su cifra', async () => {
      await mount({ items: [apiItem(1, KELLY), apiItem(2, BISTURI), apiItem(3, MOYNIHAN)] });

      expect(chosen()).toEqual([
        ['Bisturí', ['Mango de bisturí N.° 3']],
        ['Pinza', ['Pinza Kelly', 'Pinza de Moynihan']],
      ]);
      expect(Array.from(root.querySelectorAll('.group-name .count')).map((c) => text(c))).toEqual([
        '1',
        '2',
      ]);
    });

    it('un objeto sin instrumento del catálogo va a «Sin clasificar»', async () => {
      await mount({ items: [{ ...apiItem(1), source_text: 'Gasas', components: [] }] });

      expect(chosen()).toEqual([['Sin clasificar', ['Gasas']]]);
    });

    it('sin objetos dice cómo se agrega', async () => {
      await mount();

      expect(text(root.querySelector('.chosen .empty'))).toBe(
        'Todavía no hay instrumental. Se agrega desde los sugeridos o el catálogo.',
      );
    });

    it('quitar saca el objeto, con su nombre en el botón, y programa el guardado', async () => {
      await mount({ items: [apiItem(1, KELLY), apiItem(2, GASA)] });
      const remove = root.querySelector<HTMLButtonElement>('.remove')!;
      expect(remove.getAttribute('aria-label')).toBe('Quitar Gasa');

      remove.click();
      await settle();

      expect(state.content()?.items.map((i) => i.source_text)).toEqual(['Pinza Kelly']);
      expect(state.saveStatus()).toBe('saving');
    });
  });

  describe('Sugeridos', () => {
    it('se titulan con la especialidad y dicen qué son', async () => {
      await mount();

      expect(text(root.querySelector('#suggested-title'))).toBe('Sugeridos para Cirugía general');
      expect(text(root.querySelector('.sub'))).toBe(
        'Lo que usan las otras técnicas de la especialidad y esta todavía no tiene.',
      );
    });

    it('son lo que usan las otras técnicas de la especialidad, de más a menos, con sus puntos', async () => {
      await mount();

      expect(chips().map((c) => text(c))).toEqual([
        'Pinza Kelly',
        'Gasa',
        'Mango de bisturí N.° 3',
        'Pinza de Moynihan',
      ]);
      expect(chips().map((chip) => chip.querySelectorAll('.dots i.full').length)).toEqual([
        3, 2, 2, 2,
      ]);
    });

    it('cada chip dice cuántas técnicas lo usan, a la vista y a los lectores de pantalla', async () => {
      await mount();

      expect(chips()[0].title).toBe('Lo usan 3 de 3 técnicas');
      expect(chips()[0].getAttribute('aria-label')).toBe(
        'Agregar Pinza Kelly, lo usan 3 de 3 técnicas',
      );
      expect(chips()[0].querySelector('.dots')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('no sugiere lo que la técnica ya tiene', async () => {
      await mount({ items: [apiItem(1, KELLY)] });

      expect(chips().map((c) => text(c))).not.toContain('Pinza Kelly');
    });

    it('al tocar uno lo agrega: un objeto con ese instrumento, sin mesa, y se ilumina', async () => {
      await mount();

      chips()[1].click();
      await settle();

      expect(state.content()?.items).toEqual([
        {
          zone_id: null,
          legend_number: null,
          source_text: 'Gasa',
          components: [{ instrument_id: 'i-gasa', suture_id: null, name: 'Gasa' }],
          cells: [],
        },
      ]);
      expect(chosen()).toEqual([['Accesorios', ['Gasa']]]);
      expect(root.querySelector('.chosen li.fresh')).not.toBeNull();
      expect(chips().map((c) => text(c))).not.toContain('Gasa');
      expect(state.saveStatus()).toBe('saving');
    });

    it('con todo lo que usan las otras técnicas dice que ya lo tiene', async () => {
      await mount({
        items: [apiItem(1, KELLY), apiItem(2, GASA), apiItem(3, BISTURI), apiItem(4, MOYNIHAN)],
      });

      expect(text(root.querySelector('.suggested .empty'))).toBe(
        'Ya tiene todo lo que usan las otras técnicas.',
      );
    });

    it('muestra ocho y «Ver n más» muestra el resto, y «Ver menos» vuelve', async () => {
      const many = Array.from({ length: 10 }, (_, n) =>
        instrument(`i-${n}`, `Instrumento ${n}`, 'Pinza'),
      );
      await mount({
        catalog: catalog({
          instruments: many,
          techniques: [technique('t-1', 'Cirugía general', many)],
        }),
      });

      expect(chips()).toHaveLength(8);
      const more = root.querySelector<HTMLButtonElement>('.more')!;
      expect(text(more)).toBe('Ver 2 más');
      expect(more.getAttribute('aria-expanded')).toBe('false');

      more.click();
      await settle();
      expect(chips()).toHaveLength(10);
      expect(text(root.querySelector('.more'))).toBe('Ver menos');

      root.querySelector<HTMLButtonElement>('.more')!.click();
      await settle();
      expect(chips()).toHaveLength(8);
    });

    it('con ocho o menos no hay «Ver más»', async () => {
      await mount();

      expect(root.querySelector('.more')).toBeNull();
    });
  });

  describe('Explorar el catálogo', () => {
    it('cuenta lo que hay y lista el catálogo por categoría, con «Agregar» en cada instrumento', async () => {
      await mount();

      expect(text(root.querySelector('.explore .head .count'))).toBe('4');
      expect(Array.from(root.querySelectorAll('.list-group')).map((g) => text(g))).toEqual([
        'Accesorios 1',
        'Bisturí 1',
        'Pinza 2',
      ]);
      expect(rows().map((r) => text(r))).toEqual([
        'Gasa Agregar',
        'Mango de bisturí N.° 3 Agregar',
        'Pinza de Moynihan Agregar',
        'Pinza Kelly Agregar',
      ]);
    });

    it('el buscador tiene su nombre para quien no lo ve y su texto de ayuda', async () => {
      await mount();

      const input = root.querySelector<HTMLInputElement>('app-search-field input')!;
      expect(input.placeholder).toBe('Buscar por nombre');
      expect(root.querySelector('app-search-field label')!.textContent).toContain(
        'Buscar en el catálogo de instrumental',
      );
    });

    it('los tipos son «Todos» y las categorías de la API, cada uno con su cifra', async () => {
      await mount();

      expect(types()).toEqual(['Todos 4', 'Accesorios 1', 'Bisturí 1', 'Pinza 2']);
      expect(
        root.querySelector('.type[aria-pressed="true"]')!.textContent!.trim().startsWith('Todos'),
      ).toBe(true);
    });

    it('al elegir un tipo, solo ese', async () => {
      await mount();

      root.querySelectorAll<HTMLButtonElement>('.type')[2].click();
      await settle();

      expect(rows().map((r) => text(r))).toEqual(['Mango de bisturí N.° 3 Agregar']);
      expect(
        root.querySelectorAll<HTMLButtonElement>('.type')[2].getAttribute('aria-pressed'),
      ).toBe('true');
    });

    it('busca sin tildes ni mayúsculas, resalta lo que coincide y ajusta las cifras de los tipos', async () => {
      await mount();

      await search('PINZA');

      expect(rows().map((r) => text(r))).toEqual([
        'Pinza de Moynihan Agregar',
        'Pinza Kelly Agregar',
      ]);
      expect(Array.from(root.querySelectorAll('.row mark')).map((m) => m.textContent)).toEqual([
        'Pinza',
        'Pinza',
      ]);
      // Los tipos con resultados primero
      expect(types()).toEqual(['Todos 2', 'Pinza 2', 'Accesorios 0', 'Bisturí 0']);
    });

    it('también encuentra por alias', async () => {
      await mount();

      await search('moninjan');

      expect(rows().map((r) => text(r))).toEqual(['Pinza de Moynihan Agregar']);
    });

    it('sin coincidencias, dice que un revisor puede agregarlo', async () => {
      await mount();

      await search('zzz');

      expect(text(root.querySelector('.list .empty'))).toBe(
        'Ningún instrumento coincide. Un revisor puede agregarlo al catálogo.',
      );
    });

    it('tocar «Agregar» lo agrega y la fila pasa a «En la técnica»', async () => {
      await mount();

      rowNamed('Pinza Kelly').click();
      await settle();

      expect(state.content()?.items).toHaveLength(1);
      expect(text(rowNamed('Pinza Kelly'))).toBe('Pinza Kelly En la técnica');
      expect(rowNamed('Pinza Kelly').getAttribute('aria-pressed')).toBe('true');
    });

    it('tocar «En la técnica» quita el objeto que es solo ese instrumento', async () => {
      await mount({ items: [apiItem(1, KELLY), apiItem(2, GASA)] });

      rowNamed('Pinza Kelly').click();
      await settle();

      expect(state.content()?.items.map((i) => i.source_text)).toEqual(['Gasa']);
      expect(text(rowNamed('Pinza Kelly'))).toBe('Pinza Kelly Agregar');
    });

    it('con varios objetos que son solo ese instrumento (uno en cada mesa) no se quita ninguno desde aquí', async () => {
      await mount({
        items: [
          { ...apiItem(1, KELLY), zone_id: 'z-mayo', zone: 'Mesa de Mayo', legend_number: 3 },
          { ...apiItem(2, KELLY), zone_id: 'z-reserva', zone: 'Mesa de reserva', legend_number: 5 },
        ],
      });
      const row = rowNamed('Pinza Kelly');

      expect(text(row)).toBe('Pinza Kelly En la técnica');
      expect(row.getAttribute('aria-disabled')).toBe('true');
      row.click();
      await settle();

      expect(state.content()?.items).toHaveLength(2);
      expect(state.saveStatus()).toBe('unchanged');
    });

    it('un instrumento que solo está dentro de un objeto compuesto dice «En la técnica» y no se quita desde aquí', async () => {
      await mount({ items: [apiItem(1, GASA, KELLY)] });
      const row = rowNamed('Pinza Kelly');

      expect(text(row)).toBe('Pinza Kelly En la técnica');
      expect(row.getAttribute('aria-disabled')).toBe('true');
      row.click();
      await settle();

      expect(state.content()?.items).toHaveLength(1);
    });
  });

  describe('en solo lectura (en revisión)', () => {
    beforeEach(() => mount({ state: 'in_review', items: [apiItem(1, KELLY)] }));

    it('se ven las listas y nada se puede agregar ni quitar', () => {
      expect(chosen()).toEqual([['Pinza', ['Pinza Kelly']]]);
      expect(root.querySelector('.remove')).toBeNull();
      expect(chips().every((chip) => chip.disabled)).toBe(true);
      expect(rowNamed('Gasa').getAttribute('aria-disabled')).toBe('true');
    });

    it('tocar una fila no cambia nada ni guarda', async () => {
      rowNamed('Gasa').click();
      rowNamed('Pinza Kelly').click();
      await settle();

      expect(state.content()?.items).toHaveLength(1);
      expect(state.saveStatus()).toBe('unchanged');
    });
  });
});

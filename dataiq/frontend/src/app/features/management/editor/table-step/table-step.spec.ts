import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { VersionDetail } from '../../../../data/api/models';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../../data/testing';
import { EditorCatalog } from '../editor-catalog';
import { EditorState } from '../editor-state';
import { TableStep, type TableKind } from './table-step';

const instrument = (id: string, name: string, category: string) => ({
  id,
  name,
  category,
  description: null,
  description_source: null,
  aliases: [],
});

const KELLY = instrument('i-kelly', 'Pinza Kelly', 'Pinza');
const MAYO_SCISSORS = instrument('i-tij', 'Tijera Mayo', 'Tijera');
const GASA = instrument('i-gasa', 'Gasa', 'Accesorios');
const COMPRESA = instrument('i-comp', 'Compresa', 'Accesorios');

const MAYO = { zone_id: 'z-mayo', zone: 'Mesa de Mayo' };
const RESERVE = { zone_id: 'z-res', zone: 'Mesa de reserva' };

const zone = (
  ref: { zone_id: string; zone: string },
  rows: number | null,
  columns: number | null,
) => ({
  ...ref,
  used: rows !== null,
  rows,
  columns,
});

/** Un objeto de la API: un solo instrumento, en una mesa o suelto. */
const apiItem = (
  n: number,
  inst: { id: string; name: string },
  where: { zone_id: string; zone: string } | null = null,
  cells: [number, number][] = [],
) => ({
  id: `item-${n}`,
  zone_id: where?.zone_id ?? null,
  zone: where?.zone ?? null,
  legend_number: where ? n : null,
  source_text: inst.name,
  components: [{ instrument_id: inst.id, suture_id: null, name: inst.name }],
  cells: cells.map(([row, column]) => ({ row, column })),
});

function version(state: string, zones: object[], items: object[]): VersionDetail {
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
      zones,
      items,
      sutures: [],
      equipment: [],
      devices: [],
    },
    rejections: [],
  } as unknown as VersionDetail;
}

/** Una técnica publicada con objetos en la mesa de reserva. */
const published = (id: string, ...instruments: { id: string; name: string }[]) => ({
  id,
  name: id,
  specialty: 'Cirugía general',
  version_number: 1,
  items: instruments.map((inst, n) => apiItem(n + 1, inst, RESERVE)),
});

const catalog = () => ({
  specialties: [],
  zones: [
    { id: 'z-mayo', name: 'Mesa de Mayo' },
    { id: 'z-res', name: 'Mesa de reserva' },
  ],
  categories: [
    { id: 'c-1', name: 'Accesorios' },
    { id: 'c-2', name: 'Pinza' },
    { id: 'c-3', name: 'Tijera' },
  ],
  instruments: [KELLY, MAYO_SCISSORS, GASA, COMPRESA],
  sutures: [],
  equipment: [],
  devices: [],
  techniques: [
    published('t-1', GASA, COMPRESA),
    published('t-2', GASA),
    published('t-3', COMPRESA, GASA),
  ],
});

describe('TableStep', () => {
  let state: EditorState;
  let http: HttpTestingController;
  let fixture: ComponentFixture<TableStep>;
  let root: HTMLElement;

  async function mount(
    options: {
      kind?: TableKind;
      state?: string;
      zones?: object[];
      items?: object[];
      answer?: boolean;
    } = {},
  ): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideRepositoryTesting(), EditorState, EditorCatalog],
    });
    state = TestBed.inject(EditorState);
    http = TestBed.inject(HttpTestingController);
    state.load(version(options.state ?? 'draft', options.zones ?? [], options.items ?? []));
    fixture = TestBed.createComponent(TableStep);
    fixture.componentRef.setInput('kind', options.kind ?? 'mayo');
    root = fixture.nativeElement;
    await settle();
    if (options.answer !== false) {
      http.expectOne(`${TEST_API_BASE}/catalog/full`).flush(catalog());
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
  const all = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));
  const one = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  const cell = (row: number, column: number) =>
    one(`.cell[data-row="${row}"][data-column="${column}"]`);
  const objectButtons = () => all('.object');
  const objectNames = () => objectButtons().map((button) => text(button.querySelector('.name')));
  const byText = (selector: string, label: string) =>
    all(selector).find((element) => text(element)?.includes(label));
  const items = () => state.content()!.items;
  const zones = () => state.content()!.zones;
  const cellsOf = (index: number) => items()[index].cells;

  async function click(element: HTMLElement | undefined): Promise<void> {
    expect(element).toBeTruthy();
    element!.click();
    await settle();
  }

  /** Agrega un objeto desde el panel del catálogo y lo cierra. */
  async function addFromCatalog(name: string): Promise<void> {
    if (!root.querySelector('app-object-picker')) await click(one('.add'));
    await click(byText('app-object-picker .row', name));
  }

  describe('el paso', () => {
    it('lleva el nombre de la mesa y su ayuda', async () => {
      await mount();
      expect(text(one('h2'))).toBe('Mesa de Mayo');
      expect(text(one('.title p'))).toContain('Arrastrar cada objeto a su celda');
      expect(text(one('.objects .sub'))).toBe(
        'El número es el de la leyenda; cada mesa tiene su propia numeración.',
      );
    });

    it('mientras llega el catálogo dice que carga', async () => {
      await mount({ answer: false });
      expect(text(one('.notice'))).toBe('Cargando…');
      http.expectOne(`${TEST_API_BASE}/catalog/full`).flush(catalog());
    });

    it('si el catálogo falla, ofrece reintentar', async () => {
      await mount({ answer: false });
      http
        .expectOne(`${TEST_API_BASE}/catalog/full`)
        .flush('', { status: 500, statusText: 'Error' });
      await settle();
      expect(text(one('.notice'))).toContain('No se pudo cargar el catálogo.');
      await click(one('.notice button'));
      http.expectOne(`${TEST_API_BASE}/catalog/full`).flush(catalog());
      await settle();
      expect(root.querySelector('.editor')).not.toBeNull();
    });

    it('una mesa sin armar se ve de 4 filas por 6 columnas, vacía, y no cambia la versión', async () => {
      await mount();
      expect(all('.cell')).toHaveLength(24);
      expect(all('.stepper .value').map(text)).toEqual(['4', '6']);
      expect(text(one('.hint'))).toBe('Agregar el primer objeto.');
      expect(objectButtons()).toHaveLength(0);
      expect(zones()).toEqual([]);
    });

    it('muestra la mesa de la versión con su tamaño y sus objetos en orden de número', async () => {
      await mount({
        zones: [zone(MAYO, 3, 5)],
        items: [
          apiItem(2, MAYO_SCISSORS, MAYO, [[1, 2]]),
          apiItem(1, KELLY, MAYO),
          apiItem(3, GASA, null),
        ],
      });
      expect(all('.cell')).toHaveLength(15);
      expect(objectNames()).toEqual(['Pinza Kelly', 'Tijera Mayo']);
      expect(objectButtons().map((b) => text(b.querySelector('.place')))).toEqual([
        'Sin ubicar',
        'Fila 1 · Columna 2',
      ]);
      expect(objectButtons()[0].classList).toContain('unplaced');
      expect(text(one('.hint'))).toBe('Falta ubicar 1 objeto.');
      expect(cell(1, 2).getAttribute('aria-label')).toBe('Fila 1, columna 2: 2, Tijera Mayo');
      expect(cell(1, 1).getAttribute('aria-label')).toBe('Fila 1, columna 1: vacía');
    });
  });

  describe('agregar objetos', () => {
    it('«Agregar objeto» abre el catálogo y «Listo» lo cierra', async () => {
      await mount();
      expect(root.querySelector('app-object-picker')).toBeNull();
      await click(one('.add'));
      expect(root.querySelector('app-object-picker')).not.toBeNull();
      expect(root.querySelector('.add')).toBeNull();
      await click(one('app-object-picker .done'));
      expect(root.querySelector('app-object-picker')).toBeNull();
      expect(root.querySelector('.add')).not.toBeNull();
    });

    it('el primero crea la mesa de 4 × 6 y entra con el número 1, sin lugar', async () => {
      await mount();
      await addFromCatalog('Pinza Kelly');
      expect(zones()).toEqual([
        { zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 4, columns: 6 },
      ]);
      expect(items()).toHaveLength(1);
      expect(items()[0]).toMatchObject({
        zone_id: 'z-mayo',
        legend_number: 1,
        cells: [],
        components: [{ instrument_id: 'i-kelly', name: 'Pinza Kelly' }],
      });
      expect(objectNames()).toEqual(['Pinza Kelly']);
      expect(text(one('.hint'))).toBe('Falta ubicar 1 objeto.');
    });

    it('el panel queda abierto, marca lo que ya está y no lo repite', async () => {
      await mount();
      await addFromCatalog('Pinza Kelly');
      await addFromCatalog('Tijera Mayo');
      expect(items().map((item) => item.legend_number)).toEqual([1, 2]);
      const kelly = byText('app-object-picker .row', 'Pinza Kelly')!;
      expect(kelly.getAttribute('aria-pressed')).toBe('true');
      expect(text(kelly)).toContain('En la mesa');
      await click(kelly);
      expect(items()).toHaveLength(2);
    });

    it('un objeto del instrumental que aún no tiene mesa pasa a la mesa en vez de duplicarse', async () => {
      await mount({ items: [apiItem(1, KELLY, null)] });
      await addFromCatalog('Pinza Kelly');
      expect(items()).toHaveLength(1);
      expect(items()[0]).toMatchObject({ zone_id: 'z-mayo', legend_number: 1 });
    });

    it('la mesa de Mayo no ofrece atajos', async () => {
      await mount();
      await click(one('.add'));
      expect(root.querySelector('app-object-picker .quick')).toBeNull();
    });
  });

  describe('ubicar tocando', () => {
    const armed = (extra: object[] = []) => ({
      zones: [zone(MAYO, 4, 6)],
      items: [apiItem(1, KELLY, MAYO), apiItem(2, MAYO_SCISSORS, MAYO), ...extra],
    });

    it('elegir un objeto y luego su celda lo ubica', async () => {
      await mount(armed());
      await click(objectButtons()[0]);
      expect(objectButtons()[0].getAttribute('aria-pressed')).toBe('true');
      expect(text(one('.hint'))).toBe('Tocar la celda donde va el 1.');
      await click(cell(2, 3));
      expect(cellsOf(0)).toEqual([{ row: 2, column: 3 }]);
      expect(objectButtons()[0].getAttribute('aria-pressed')).toBe('false');
      expect(text(one('.hint'))).toBe('Falta ubicar 1 objeto.');
      expect(text(objectButtons()[0].querySelector('.place'))).toBe('Fila 2 · Columna 3');
    });

    it('un objeto sin número (la fuente no lo deja leer) se nombra por su nombre y su pieza se levanta', async () => {
      await mount({
        zones: [zone(MAYO, 4, 6)],
        items: [{ ...apiItem(1, KELLY, MAYO, [[1, 2]]), legend_number: null }],
      });
      expect(cell(1, 2).getAttribute('aria-label')).toBe('Fila 1, columna 2: Pinza Kelly');
      await click(objectButtons()[0]);
      expect(text(one('.hint'))).toBe('Tocar la celda donde va Pinza Kelly.');
      expect(all('app-table-diagram .piece.active')).toHaveLength(1);
    });

    it('tocar de nuevo el objeto elegido, o Escape, lo suelta', async () => {
      await mount(armed());
      await click(objectButtons()[0]);
      await click(objectButtons()[0]);
      expect(objectButtons()[0].getAttribute('aria-pressed')).toBe('false');
      await click(objectButtons()[1]);
      root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();
      expect(objectButtons()[1].getAttribute('aria-pressed')).toBe('false');
      expect(cellsOf(1)).toEqual([]);
    });

    it('poner un objeto donde hay otro los intercambia', async () => {
      await mount({
        zones: [zone(MAYO, 4, 6)],
        items: [apiItem(1, KELLY, MAYO, [[1, 1]]), apiItem(2, MAYO_SCISSORS, MAYO, [[3, 3]])],
      });
      await click(objectButtons()[0]);
      await click(cell(3, 3));
      expect(cellsOf(0)).toEqual([{ row: 3, column: 3 }]);
      expect(cellsOf(1)).toEqual([{ row: 1, column: 1 }]);
    });

    it('tocar una celda abre «Qué va aquí» con los sin ubicar primero', async () => {
      await mount({
        zones: [zone(MAYO, 4, 6)],
        items: [apiItem(1, KELLY, MAYO, [[1, 1]]), apiItem(2, MAYO_SCISSORS, MAYO)],
      });
      await click(cell(2, 2));
      const panel = one('.choice');
      expect(panel.getAttribute('aria-label')).toBe('Qué va en la fila 2, columna 2');
      expect(text(panel.querySelector('p'))).toBe('Fila 2 · Columna 2');
      expect(all('.choice li button').map((b) => text(b))).toEqual([
        '2 Tijera Mayo Sin ubicar',
        '1 Pinza Kelly Fila 1 · Columna 1',
      ]);
      expect(cell(2, 2).classList).toContain('chosen');
      expect(root.querySelector('.empty-cell')).toBeNull();
    });

    it('elegir en «Qué va aquí» ubica el objeto y cierra el panel', async () => {
      await mount(armed());
      await click(cell(4, 6));
      await click(byText('.choice li button', 'Tijera Mayo'));
      expect(cellsOf(1)).toEqual([{ row: 4, column: 6 }]);
      expect(root.querySelector('.choice')).toBeNull();
    });

    it('en una celda ocupada dice «Está aquí» y permite vaciarla', async () => {
      await mount({
        zones: [zone(MAYO, 4, 6)],
        items: [apiItem(1, KELLY, MAYO, [[2, 2]])],
      });
      await click(cell(2, 2));
      expect(text(one('.choice .here small'))).toBe('Está aquí');
      await click(one('.empty-cell'));
      expect(cellsOf(0)).toEqual([]);
      expect(items()[0].zone_id).toBe('z-mayo');
      expect(root.querySelector('.choice')).toBeNull();
    });

    const boxAt = (top: number) =>
      ({ top, bottom: top + 60, left: 0, right: 60, width: 60, height: 60 }) as DOMRect;

    it('«Qué va aquí» se abre bajo la celda si ahí cabe', async () => {
      await mount(armed());
      cell(1, 1).getBoundingClientRect = () => boxAt(100);
      await click(cell(1, 1));
      expect(one('.choice').style.top).toBe('6px');
    });

    it('si bajo la celda no cabe en lo que se ve de la ventana, se abre sobre ella', async () => {
      await mount(armed());
      cell(4, 1).getBoundingClientRect = () => boxAt(window.innerHeight - 70);
      await click(cell(4, 1));
      expect(one('.choice').style.top).toBe('-6px');
    });

    it('sin objetos, «Qué va aquí» manda a agregarlos primero', async () => {
      await mount();
      await click(cell(1, 1));
      expect(text(one('.choice .empty'))).toBe('Primero se agregan objetos a la mesa.');
    });

    it('Escape y tocar fuera cierran «Qué va aquí»', async () => {
      await mount(armed());
      await click(cell(1, 1));
      one('.choice').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();
      expect(root.querySelector('.choice')).toBeNull();

      await click(cell(1, 1));
      expect(root.querySelector('.choice')).not.toBeNull();
      document.body.click();
      await settle();
      expect(root.querySelector('.choice')).toBeNull();
    });
  });

  describe('ubicar arrastrando', () => {
    /** Las celdas no miden nada sin diseño: se les da la caja de una grilla de 10 px. */
    function layOut(): void {
      for (const button of all('.cell')) {
        const row = Number(button.dataset['row']);
        const column = Number(button.dataset['column']);
        button.getBoundingClientRect = () =>
          ({
            left: (column - 1) * 10,
            right: column * 10,
            top: (row - 1) * 10,
            bottom: row * 10,
          }) as DOMRect;
      }
    }

    const drop = (element: HTMLElement, x: number, y: number) => {
      const reset = vi.fn();
      fixture.debugElement
        .query(
          By.css(
            `[data-row="${element.dataset['row']}"][data-column="${element.dataset['column']}"]`,
          ),
        )
        ?.triggerEventHandler('cdkDragEnded', { dropPoint: { x, y }, source: { reset } });
      return reset;
    };

    it('soltar un objeto de la lista sobre una celda lo ubica', async () => {
      await mount({
        zones: [zone(MAYO, 4, 6)],
        items: [apiItem(1, KELLY, MAYO)],
      });
      layOut();
      const reset = vi.fn();
      fixture.debugElement
        .query(By.css('.object'))
        .triggerEventHandler('cdkDragEnded', { dropPoint: { x: 25, y: 15 }, source: { reset } });
      await settle();
      expect(cellsOf(0)).toEqual([{ row: 2, column: 3 }]);
      expect(reset).toHaveBeenCalled();
    });

    it('soltarlo fuera de la mesa lo deja donde estaba', async () => {
      await mount({
        zones: [zone(MAYO, 4, 6)],
        items: [apiItem(1, KELLY, MAYO, [[1, 1]])],
      });
      layOut();
      const reset = vi.fn();
      fixture.debugElement
        .query(By.css('.object'))
        .triggerEventHandler('cdkDragEnded', { dropPoint: { x: 500, y: 500 }, source: { reset } });
      await settle();
      expect(cellsOf(0)).toEqual([{ row: 1, column: 1 }]);
      expect(reset).toHaveBeenCalled();
    });

    it('arrastrar la pieza de una celda a otra la mueve, y sobre otra, las intercambia', async () => {
      await mount({
        zones: [zone(MAYO, 4, 6)],
        items: [apiItem(1, KELLY, MAYO, [[1, 1]]), apiItem(2, MAYO_SCISSORS, MAYO, [[1, 2]])],
      });
      layOut();
      drop(cell(1, 1), 15, 5);
      await settle();
      expect(cellsOf(0)).toEqual([{ row: 1, column: 2 }]);
      expect(cellsOf(1)).toEqual([{ row: 1, column: 1 }]);
    });

    it('un objeto de varias celdas arrastrado por una que no es la primera no se corre', async () => {
      const wide = {
        ...apiItem(1, COMPRESA, MAYO),
        cells: [
          { row: 1, column: 1 },
          { row: 1, column: 2 },
        ],
      };
      await mount({ zones: [zone(MAYO, 4, 6)], items: [wide] });
      layOut();
      // Agarrado por (1,2) y soltado en (2,2): baja una fila
      drop(cell(1, 2), 15, 15);
      await settle();
      expect(cellsOf(0)).toEqual([
        { row: 2, column: 1 },
        { row: 2, column: 2 },
      ]);
    });

    it('mientras se arrastra, la celda bajo el puntero se marca', async () => {
      await mount({
        zones: [zone(MAYO, 4, 6)],
        items: [apiItem(1, KELLY, MAYO)],
      });
      layOut();
      const source = fixture.debugElement.query(By.css('.object'));
      source.triggerEventHandler('cdkDragStarted', {});
      source.triggerEventHandler('cdkDragMoved', { pointerPosition: { x: 35, y: 25 } });
      await settle();
      expect(cell(3, 4).classList).toContain('over');
      expect(one('.editor').classList).toContain('dragging');
      source.triggerEventHandler('cdkDragEnded', {
        dropPoint: { x: 500, y: 500 },
        source: { reset: () => undefined },
      });
      await settle();
      expect(root.querySelector('.cell.over')).toBeNull();
      expect(one('.editor').classList).not.toContain('dragging');
    });
  });

  describe('tamaño', () => {
    it('agregar una fila o una columna crea la mesa con ese tamaño', async () => {
      await mount();
      await click(one('[aria-label="Agregar una fila"]'));
      expect(zones()).toEqual([
        { zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 5, columns: 6 },
      ]);
      await click(one('[aria-label="Agregar una columna"]'));
      expect(zones()[0]).toMatchObject({ rows: 5, columns: 7 });
      expect(all('.cell')).toHaveLength(35);
    });

    it('va de 2 a 10: los botones se apagan en los límites', async () => {
      await mount({ zones: [zone(MAYO, 2, 10)] });
      expect(one('[aria-label="Quitar una fila"]').hasAttribute('disabled')).toBe(true);
      expect(one('[aria-label="Agregar una fila"]').hasAttribute('disabled')).toBe(false);
      expect(one('[aria-label="Agregar una columna"]').hasAttribute('disabled')).toBe(true);
      expect(one('[aria-label="Quitar una columna"]').hasAttribute('disabled')).toBe(false);
    });

    it('lo que queda fuera al achicar vuelve a «sin ubicar»', async () => {
      await mount({
        zones: [zone(MAYO, 4, 6)],
        items: [apiItem(1, KELLY, MAYO, [[4, 1]]), apiItem(2, MAYO_SCISSORS, MAYO, [[1, 1]])],
      });
      await click(one('[aria-label="Quitar una fila"]'));
      expect(zones()[0]).toMatchObject({ rows: 3, columns: 6 });
      expect(cellsOf(0)).toEqual([]);
      expect(cellsOf(1)).toEqual([{ row: 1, column: 1 }]);
      expect(text(one('.hint'))).toBe('Falta ubicar 1 objeto.');
    });
  });

  describe('la mesa de reserva', () => {
    it('lleva su ayuda, la casilla «no lleva» y la mesa con sus propios números', async () => {
      await mount({
        kind: 'reserve',
        zones: [zone(MAYO, 4, 6), zone(RESERVE, 3, 4)],
        items: [apiItem(1, KELLY, MAYO), apiItem(1, GASA, RESERVE)],
      });
      expect(text(one('h2'))).toBe('Mesa de reserva');
      expect(text(one('.title p'))).toBe('Lo que se tiene a mano fuera de la mesa de Mayo.');
      expect(text(one('.not-carried strong'))).toBe('Esta técnica no lleva mesa de reserva');
      expect(one('.not-carried input').hasAttribute('checked')).toBe(false);
      expect((one('.not-carried input') as HTMLInputElement).checked).toBe(false);
      expect(objectNames()).toEqual(['Gasa']);
      expect(all('.cell')).toHaveLength(12);
      expect(text(one('.objects .sub'))).toBe(
        'Lo que se agrega aquí entra también al instrumental de la técnica.',
      );
    });

    it('ofrece como atajos lo más usado en las mesas de reserva publicadas', async () => {
      await mount({ kind: 'reserve' });
      await click(one('.add'));
      expect(text(one('app-object-picker .sub'))).toBe('Más usados en mesas de reserva');
      expect(all('app-object-picker .chip').map(text)).toEqual(['Gasa', 'Compresa']);
      await click(one('app-object-picker .chip'));
      expect(zones()).toEqual([
        { zone_id: 'z-res', zone: 'Mesa de reserva', used: true, rows: 4, columns: 6 },
      ]);
      expect(items()[0]).toMatchObject({ zone_id: 'z-res', legend_number: 1 });
      expect(one('app-object-picker .chip').getAttribute('aria-pressed')).toBe('true');
    });

    it('marcar «no lleva» deja la mesa en used:false, libera sus objetos y oculta el editor', async () => {
      await mount({
        kind: 'reserve',
        zones: [zone(RESERVE, 3, 4)],
        items: [apiItem(1, GASA, RESERVE, [[1, 1]])],
      });
      await click(one('.not-carried input'));
      expect(zones()).toEqual([
        { zone_id: 'z-res', zone: 'Mesa de reserva', used: false, rows: null, columns: null },
      ]);
      expect(items()[0]).toMatchObject({ zone_id: null, legend_number: null, cells: [] });
      expect(text(one('.none'))).toBe('Sin mesa de reserva en esta versión.');
      expect(root.querySelector('.editor')).toBeNull();
      expect(text(one('.not-carried .help'))).toBe('Desmarcar para armarla.');
    });

    it('una versión con la reserva en «no lleva» abre con la casilla marcada; desmarcarla arma la mesa', async () => {
      await mount({ kind: 'reserve', zones: [zone(RESERVE, null, null)] });
      expect((one('.not-carried input') as HTMLInputElement).checked).toBe(true);
      expect(root.querySelector('.editor')).toBeNull();
      await click(one('.not-carried input'));
      expect(zones()).toEqual([
        { zone_id: 'z-res', zone: 'Mesa de reserva', used: true, rows: 4, columns: 6 },
      ]);
      expect(root.querySelector('.editor')).not.toBeNull();
      expect(text(one('.not-carried .help'))).toBe('Marcar si la técnica no la lleva.');
    });

    it('sin la mesa en la versión, la casilla no está marcada y el editor está a la vista', async () => {
      await mount({ kind: 'reserve' });
      expect((one('.not-carried input') as HTMLInputElement).checked).toBe(false);
      expect(root.querySelector('.editor')).not.toBeNull();
      expect(zones()).toEqual([]);
    });
  });

  describe('solo lectura', () => {
    const readOnly = () =>
      mount({
        state: 'in_review',
        zones: [zone(MAYO, 4, 6)],
        items: [apiItem(1, KELLY, MAYO, [[1, 1]])],
      });

    it('se ve todo y no hay cómo agregar ni cambiar el tamaño', async () => {
      await readOnly();
      expect(objectNames()).toEqual(['Pinza Kelly']);
      expect(root.querySelector('.add')).toBeNull();
      expect(root.querySelector('.grip')).toBeNull();
      for (const button of all('.stepper button')) {
        expect(button.hasAttribute('disabled')).toBe(true);
      }
    });

    it('tocar una celda o un objeto no cambia nada', async () => {
      await readOnly();
      await click(cell(2, 2));
      expect(root.querySelector('.choice')).toBeNull();
      const before = state.content();
      await click(cell(2, 2));
      expect(state.content()).toBe(before);
    });

    it('la casilla de la mesa de reserva está deshabilitada', async () => {
      await mount({ kind: 'reserve', state: 'in_review', zones: [zone(RESERVE, 3, 4)] });
      expect((one('.not-carried input') as HTMLInputElement).disabled).toBe(true);
    });
  });
});

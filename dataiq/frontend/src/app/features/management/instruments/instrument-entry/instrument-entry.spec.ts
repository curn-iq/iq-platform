import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  placementIndex,
  type CatalogCategory,
  type CatalogEntry,
  type EntryDraft,
  type Placement,
  type TechniqueUse,
} from '../../../../domain/instrument-catalog';
import type { Table } from '../../../../domain/table';
import { InstrumentEntry, type EntryMode } from './instrument-entry';

const CATEGORIES: CatalogCategory[] = [
  { id: 'c-tijera', name: 'Tijera' },
  { id: 'c-pinza', name: 'Pinza' },
  { id: 'c-sin', name: 'Sin clasificar' },
];

const entry = (
  overrides: Partial<CatalogEntry> & Pick<CatalogEntry, 'id' | 'name'>,
): CatalogEntry => ({
  category: 'Pinza',
  description: null,
  description_source: null,
  aliases: [],
  ...overrides,
});

const KELLY = entry({
  id: 'i-kelly',
  name: 'Pinza Kelly',
  description: 'Pinza hemostática de agarre.',
  description_source: 'Libro de instrumentación',
  aliases: ['Pinza hemostática Kelly', 'Kelly curva'],
});
const ALLIS = entry({ id: 'i-allis', name: 'Pinza de Allis', aliases: ['Allis'] });
const VALVA = entry({ id: 'i-valva', name: 'Valva maleable', category: 'Sin clasificar' });
const ALL = [KELLY, ALLIS, VALVA];

const TABLE: Table = {
  zoneId: 'z-mayo',
  name: 'Mesa de Mayo',
  rows: 4,
  columns: 6,
  items: [
    {
      id: 'o-1',
      legendNumber: 4,
      name: 'Kelly',
      components: [],
      instruments: [],
      cells: [{ row: 1, column: 1 }],
    },
  ],
};
const USES: TechniqueUse[] = [
  {
    id: 't-1',
    name: 'Tiroidectomía',
    specialty: 'Cirugía general',
    items: [{ id: 'o-1', components: [{ instrument_id: 'i-kelly' }] }],
    tables: [TABLE],
  },
  {
    id: 't-2',
    name: 'Cesárea',
    specialty: 'Ginecología',
    items: [{ id: 'o-1', components: [{ instrument_id: 'i-kelly' }] }],
    tables: [TABLE],
  },
];
const KELLY_PLACEMENTS: Placement[] = placementIndex(USES).get('i-kelly')!;

describe('InstrumentEntry', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<InstrumentEntry>>;
  let root: HTMLElement;
  let saved: EntryDraft[];
  let edits: string[];
  let cancels: number;

  function mount(
    current: CatalogEntry | null,
    mode: EntryMode = 'read',
    options: { placements?: Placement[]; saving?: boolean } = {},
  ) {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
    fixture = TestBed.createComponent(InstrumentEntry);
    fixture.componentRef.setInput('entry', current);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('placements', options.placements ?? []);
    fixture.componentRef.setInput('specialties', ['Cirugía general', 'Ginecología']);
    fixture.componentRef.setInput('categories', CATEGORIES);
    fixture.componentRef.setInput('instruments', ALL);
    fixture.componentRef.setInput('saving', options.saving ?? false);
    saved = [];
    edits = [];
    cancels = 0;
    fixture.componentInstance.saved.subscribe((draft) => saved.push(draft));
    fixture.componentInstance.editRequested.subscribe((value) => edits.push(value));
    fixture.componentInstance.cancelled.subscribe(() => cancels++);
    root = fixture.nativeElement;
    document.body.appendChild(root);
    fixture.detectChanges();
  }

  afterEach(() => root?.remove());

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const nameInput = () => root.querySelector<HTMLInputElement>('.name-input')!;
  const textarea = () => root.querySelector<HTMLTextAreaElement>('textarea');
  const save = () => root.querySelector<HTMLButtonElement>('button[type=submit]')!;

  function typeIn(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  describe('al leer', () => {
    beforeEach(() => mount(KELLY, 'read', { placements: KELLY_PLACEMENTS }));

    it('dice la ruta con su categoría y el nombre como titular', () => {
      expect(text(root.querySelector('.route'))).toBe('Instrumental Pinza');
      expect(text(root.querySelector('h1'))).toBe('Pinza Kelly');
    });

    it('dice en cuántas técnicas y mesas va', () => {
      expect(text(root.querySelector('.summary'))).toBe('En 2 técnicas · 2 mesas');
    });

    it('muestra la descripción con su fuente', () => {
      expect(text(root.querySelector('.description'))).toBe('Pinza hemostática de agarre.');
      expect(text(root.querySelector('.source'))).toBe('Fuente: Libro de instrumentación');
    });

    it('lista los alias en «También se escribe así»', () => {
      const h2 = Array.from(root.querySelectorAll('h2')).map((h) => text(h));

      expect(h2).toEqual(['Descripción', 'También se escribe así', 'Dónde va']);
      expect(Array.from(root.querySelectorAll('.aliases span')).map((s) => text(s))).toEqual([
        'Pinza hemostática Kelly',
        'Kelly curva',
      ]);
    });

    it('tiene su dibujo en acero y «Dónde va»', () => {
      expect(root.querySelector('app-instrument-drawing svg')).not.toBeNull();
      expect(root.querySelector('app-where-it-goes')).not.toBeNull();
      expect(root.querySelectorAll('.use')).toHaveLength(2);
    });

    it('no tiene barra de guardar ni campos', () => {
      expect(root.querySelector('.save-bar')).toBeNull();
      expect(textarea()).toBeNull();
      expect(nameInput()).toBeNull();
      expect(root.querySelector('.where')!.classList.contains('dimmed')).toBe(false);
    });

    it('«Editar esta entrada» la pide', () => {
      root.querySelector<HTMLButtonElement>('.edit')!.click();

      expect(text(root.querySelector('.edit'))).toBe('Editar esta entrada');
      expect(edits).toEqual(['edit']);
    });
  });

  describe('una entrada sin nada', () => {
    beforeEach(() => mount(VALVA, 'read'));

    it('sin mesas lo dice, y sin descripción pide escribirla', () => {
      expect(text(root.querySelector('.summary'))).toBe('Todavía no está en ninguna mesa');
      expect(text(root.querySelector('.no-description'))).toBe(
        'Sin descripción todavía. Es la que se muestra al tocar la pieza en 3D. Escribir descripción',
      );
    });

    it('«Escribir descripción» pide editar solo la descripción', () => {
      root.querySelector<HTMLButtonElement>('.no-description button')!.click();

      expect(edits).toEqual(['description']);
    });

    it('sin alias dice que no hay otros nombres', () => {
      expect(text(root.querySelector('.nothing'))).toBe('Sin otros nombres en las fichas.');
    });

    it('sin dibujo propio no hay dibujo', () => {
      expect(root.querySelector('app-instrument-drawing')).toBeNull();
    });
  });

  describe('al editar', () => {
    beforeEach(() => mount(KELLY, 'edit', { placements: KELLY_PLACEMENTS }));

    it('el nombre es el titular editable y recibe el cursor', () => {
      expect(root.querySelector('h1')).toBeNull();
      expect(nameInput().value).toBe('Pinza Kelly');
      expect(document.activeElement).toBe(nameInput());
      expect(text(root.querySelector('label.sr-only'))).toBe('Nombre canónico');
    });

    it('la categoría es un selector, con «Sin clasificar» al final y la actual elegida', () => {
      const select = root.querySelector<HTMLSelectElement>('select')!;

      expect(Array.from(select.options).map((o) => o.textContent!.trim())).toEqual([
        'Elegir categoría',
        'Pinza',
        'Tijera',
        'Sin clasificar',
      ]);
      expect(select.value).toBe('c-pinza');
    });

    it('la descripción y su fuente se editan', () => {
      expect(textarea()!.value).toBe('Pinza hemostática de agarre.');
      expect(textarea()!.placeholder).toBe('Qué es y para qué se usa, en una o dos frases.');
      const labels = Array.from(root.querySelectorAll('label')).map((l) => text(l));
      expect(labels).toContain('Fuente de la descripción');
      expect(root.querySelectorAll('.help')).toHaveLength(3);
    });

    it('«Dónde va» queda atenuado y una barra dice en qué técnicas se verá el cambio', () => {
      expect(root.querySelector('.where')!.classList.contains('dimmed')).toBe(true);
      expect(text(root.querySelector('.impact'))).toBe(
        'Este cambio se verá en 2 técnicas publicadas: Cesárea, Tiroidectomía.',
      );
    });

    it('los alias salen como fichas que se pueden quitar y agregar', () => {
      const chips = () => Array.from(root.querySelectorAll('.chip')).map((c) => text(c));
      expect(chips()).toEqual(['Pinza hemostática Kelly', 'Kelly curva']);

      root.querySelector<HTMLButtonElement>('.chip .remove')!.click();
      fixture.detectChanges();

      expect(chips()).toEqual(['Kelly curva']);
    });

    it('«Guardar» manda el borrador con lo escrito', () => {
      typeIn(nameInput(), 'Pinza Kelly recta');
      typeIn(textarea()!, 'Otra descripción.');

      save().click();

      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        name: 'Pinza Kelly recta',
        categoryId: 'c-pinza',
        description: 'Otra descripción.',
        source: 'Libro de instrumentación',
      });
      expect(saved[0].aliases).toEqual(['Pinza hemostática Kelly', 'Kelly curva']);
    });

    it('«Cancelar» lo avisa y no guarda', () => {
      root.querySelector<HTMLButtonElement>('.buttons button')!.click();

      expect(cancels).toBe(1);
      expect(saved).toEqual([]);
    });

    it('cambiar de categoría queda en el borrador', () => {
      const select = root.querySelector<HTMLSelectElement>('select')!;
      select.value = 'c-tijera';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      save().click();

      expect(saved[0].categoryId).toBe('c-tijera');
    });
  });

  describe('la fuente de la descripción', () => {
    beforeEach(() => mount(VALVA, 'edit'));

    const sourceField = () =>
      Array.from(root.querySelectorAll('app-text-field')).find((f) =>
        text(f.querySelector('label'))?.startsWith('Fuente de la descripción'),
      );

    it('sin descripción no se pide', () => {
      expect(sourceField()).toBeUndefined();
      expect(save().disabled).toBe(false);
    });

    it('con descripción se pide, dice «Falta» y Guardar queda apagado', () => {
      typeIn(textarea()!, 'Una valva.');

      expect(sourceField()).toBeDefined();
      expect(text(sourceField()!.querySelector('.badge'))).toBe('Falta');
      expect(save().disabled).toBe(true);
    });

    it('con la fuente escrita ya se puede guardar', () => {
      typeIn(textarea()!, 'Una valva.');
      typeIn(sourceField()!.querySelector('input')!, 'Libro');

      expect(sourceField()!.querySelector('.badge')).toBeNull();
      expect(save().disabled).toBe(false);
    });

    it('vaciar la descripción quita el campo de la fuente', () => {
      typeIn(textarea()!, 'Una valva.');
      typeIn(textarea()!, '');

      expect(sourceField()).toBeUndefined();
    });
  });

  describe('nombres que ya son de otro', () => {
    beforeEach(() => mount(KELLY, 'edit'));

    it('un nombre que es de otro instrumento se avisa, con enlace, y Guardar queda apagado', () => {
      typeIn(nameInput(), 'pinza de allis');

      const warning = root.querySelector('.titles .duplicate')!;
      expect(text(warning)).toBe('Ya existe «Pinza de Allis» (también «Allis»). Abrir esa entrada');
      expect(warning.querySelector('a')!.getAttribute('href')).toBe(
        '/gestion/instrumental/i-allis',
      );
      expect(save().disabled).toBe(true);
    });

    it('un alias de otro cuenta como nombre', () => {
      typeIn(nameInput(), 'Allis');

      expect(root.querySelector('.titles .duplicate')).not.toBeNull();
    });

    it('su propio nombre no es un duplicado', () => {
      typeIn(nameInput(), 'PINZA KELLY');

      expect(root.querySelector('.titles .duplicate')).toBeNull();
      expect(save().disabled).toBe(false);
    });

    it('sin nombre no se puede guardar', () => {
      typeIn(nameInput(), '   ');

      expect(save().disabled).toBe(true);
    });
  });

  describe('alias', () => {
    beforeEach(() => mount(KELLY, 'edit'));

    function addAlias(value: string) {
      root.querySelector<HTMLButtonElement>('.add')!.click();
      fixture.detectChanges();
      const input = root.querySelector<HTMLInputElement>('input.new')!;
      input.value = value;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      fixture.detectChanges();
    }
    const chips = () => Array.from(root.querySelectorAll('.chip')).map((c) => text(c));

    it('agrega uno nuevo', () => {
      addAlias('Pinza Kelly 14 cm');

      expect(chips()).toEqual(['Pinza hemostática Kelly', 'Kelly curva', 'Pinza Kelly 14 cm']);
      expect(root.querySelector('.block .duplicate')).toBeNull();
    });

    it('uno que ya es de otro instrumento se avisa y no se agrega', () => {
      addAlias('allis');

      expect(chips()).toEqual(['Pinza hemostática Kelly', 'Kelly curva']);
      expect(text(root.querySelector('.block .duplicate'))).toBe(
        'Ya existe «Pinza de Allis» (también «Allis»). Abrir esa entrada',
      );
    });

    it('uno que ya tiene el propio instrumento, o su nombre, no se repite', () => {
      addAlias('kelly CURVA');
      addAlias('Pinza Kelly');

      expect(chips()).toEqual(['Pinza hemostática Kelly', 'Kelly curva']);
    });

    it('el aviso se va al quitar un alias', () => {
      addAlias('allis');
      root.querySelector<HTMLButtonElement>('.chip .remove')!.click();
      fixture.detectChanges();

      expect(root.querySelector('.block .duplicate')).toBeNull();
    });

    it('con los alias nuevos, «Guardar» los manda completos', () => {
      addAlias('Kelly 14');
      save().click();

      expect(saved[0].aliases).toEqual(['Pinza hemostática Kelly', 'Kelly curva', 'Kelly 14']);
    });
  });

  describe('un instrumento nuevo', () => {
    beforeEach(() => mount(null, 'new'));

    it('empieza vacío, con su resumen y sin dibujo ni «Dónde va» con datos', () => {
      expect(nameInput().value).toBe('');
      expect(text(root.querySelector('.summary'))).toBe(
        'Instrumento nuevo. Los instrumentos no se borran: se corrigen.',
      );
      expect(root.querySelector('app-instrument-drawing')).toBeNull();
      expect(root.querySelectorAll('.use')).toHaveLength(0);
    });

    it('la categoría empieza sin elegir y la barra dice que queda en el catálogo', () => {
      const select = root.querySelector<HTMLSelectElement>('select')!;

      expect(select.value).toBe('');
      expect(text(root.querySelector('.impact'))).toBe(
        'Queda en el catálogo para usarlo en las técnicas.',
      );
    });

    it('no se guarda sin nombre y sin categoría', () => {
      expect(save().disabled).toBe(true);

      typeIn(nameInput(), 'Pinza de Moynihan');
      expect(save().disabled).toBe(true);

      const select = root.querySelector<HTMLSelectElement>('select')!;
      select.value = 'c-pinza';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(save().disabled).toBe(false);
    });

    it('«Guardar» manda el borrador', () => {
      typeIn(nameInput(), 'Pinza de Moynihan');
      const select = root.querySelector<HTMLSelectElement>('select')!;
      select.value = 'c-pinza';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      save().click();

      expect(saved).toEqual([
        {
          name: 'Pinza de Moynihan',
          categoryId: 'c-pinza',
          description: '',
          source: '',
          aliases: [],
        },
      ]);
    });
  });

  describe('solo la descripción («Escribir descripción»)', () => {
    beforeEach(() => mount(VALVA, 'description'));

    it('edita la descripción y deja lo demás como se lee', () => {
      expect(textarea()).not.toBeNull();
      expect(root.querySelector('h1')!.textContent).toBe('Valva maleable');
      expect(nameInput()).toBeNull();
      expect(root.querySelector('select')).toBeNull();
      expect(root.querySelector('app-chip-list')).toBeNull();
      expect(root.querySelector('.save-bar')).not.toBeNull();
    });

    it('el cursor va a la descripción', () => {
      expect(document.activeElement).toBe(textarea());
    });
  });

  describe('guardando', () => {
    it('mientras guarda dice «Guardando…» y no responde a otro toque', () => {
      mount(KELLY, 'edit', { saving: true });

      expect(text(save())).toBe('Guardando…');
      expect(save().disabled).toBe(true);
    });

    it('enviar el formulario con Intro sin poder guardar no manda nada', () => {
      mount(KELLY, 'edit');
      typeIn(nameInput(), '');

      root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

      expect(saved).toEqual([]);
    });
  });

  it('al elegir otro instrumento el borrador vuelve a lo que dice la entrada', () => {
    mount(KELLY, 'edit');
    typeIn(nameInput(), 'Algo escrito');

    fixture.componentRef.setInput('entry', ALLIS);
    fixture.detectChanges();

    expect(nameInput().value).toBe('Pinza de Allis');
  });
});

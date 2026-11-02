import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NoticeService } from '../../../core/notice/notice.service';
import { provideRepositoryTesting, TEST_API_BASE } from '../../../data/testing';
import { instrumentsMatch } from '../../../app.routes';
import { Instruments } from './instruments';

const id = (n: number) => `0190dddd-0000-7000-8000-${String(n).padStart(12, '0')}`;
const KELLY = id(1);
const ALLIS = id(2);
const MAYO = id(3);
const NEW = id(9);

const instrument = (
  instrumentId: string,
  name: string,
  category: string,
  extra: Partial<{ description: string; description_source: string; aliases: string[] }> = {},
) => ({
  id: instrumentId,
  name,
  category,
  description: extra.description ?? null,
  description_source: extra.description_source ?? null,
  aliases: extra.aliases ?? [],
});

const CATALOG = () => ({
  specialties: [{ id: 'e-1', name: 'Cirugía general' }],
  zones: [],
  categories: [
    { id: 'c-pinza', name: 'Pinza' },
    { id: 'c-tijera', name: 'Tijera' },
    { id: 'c-sin', name: 'Sin clasificar' },
  ],
  instruments: [
    instrument(KELLY, 'Pinza Kelly', 'Pinza', {
      description: 'Pinza hemostática.',
      description_source: 'Libro',
      aliases: ['Kelly curva'],
    }),
    instrument(ALLIS, 'Pinza de Allis', 'Pinza'),
    instrument(MAYO, 'Tijera de Mayo', 'Tijera', { aliases: ['Tijeras Mayo'] }),
  ],
  sutures: [],
  equipment: [],
  devices: [],
  techniques: [
    {
      id: 't-1',
      name: 'Tiroidectomía',
      specialty: 'Cirugía general',
      zones: [{ zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 4, columns: 6 }],
      items: [
        {
          id: 'o-1',
          zone_id: 'z-mayo',
          legend_number: 4,
          source_text: 'Kelly',
          components: [{ instrument_id: KELLY, suture_id: null, name: 'Pinza Kelly' }],
          cells: [{ row: 1, column: 1 }],
        },
        {
          id: 'o-2',
          zone_id: 'z-mayo',
          legend_number: 5,
          source_text: 'Allis',
          components: [{ instrument_id: ALLIS, suture_id: null, name: 'Pinza de Allis' }],
          cells: [{ row: 2, column: 2 }],
        },
      ],
    },
  ],
});

/** El catálogo vuelto a pedir tras crear «Pinza de Moynihan». */
const withMoynihan = () => {
  const catalog = CATALOG();
  catalog.instruments.push(instrument(NEW, 'Pinza de Moynihan', 'Pinza'));
  return catalog;
};

const CATALOG_URL = `${TEST_API_BASE}/catalog/full`;

describe('Instruments', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let root: HTMLElement;
  let notices: NoticeService;

  async function settle(): Promise<void> {
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
      TestBed.tick();
      harness.detectChanges();
    }
  }

  async function open(url = '/gestion/instrumental', answer: object | 'fail' | null = CATALOG()) {
    TestBed.configureTestingModule({
      providers: [
        provideRepositoryTesting(),
        provideRouter([
          { matcher: instrumentsMatch, component: Instruments },
          { path: 'tecnicas/:id/:pestana', children: [] },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    notices = TestBed.inject(NoticeService);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    root = harness.routeNativeElement as HTMLElement;
    if (answer === 'fail') {
      http.expectOne(CATALOG_URL).flush('', { status: 500, statusText: 'Server Error' });
    } else if (answer) {
      http.expectOne(CATALOG_URL).flush(answer);
    }
    await settle();
  }

  afterEach(() => http?.verify());

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const indexNames = () =>
    Array.from(root.querySelectorAll('app-instrument-index li a .name')).map((n) => text(n));
  const heading = () => text(root.querySelector('app-instrument-entry h1'));
  const current = () => text(root.querySelector('app-instrument-index [aria-current=page] .name'));
  const nameInput = () => root.querySelector<HTMLInputElement>('.name-input')!;
  const save = () => root.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const noticeTexts = () => notices.notices().map((n) => n.messages.join(' '));

  function typeIn(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    el.value = value;
    el.dispatchEvent(new Event('input'));
    harness.detectChanges();
  }

  const clickEdit = async () => {
    root.querySelector<HTMLButtonElement>('.edit')!.click();
    await settle();
  };

  describe('al abrir', () => {
    it('pide el catálogo completo y mientras llega dice «Cargando…»', async () => {
      await open('/gestion/instrumental', null);

      expect(text(root.querySelector('.notice.loading'))).toBe('Cargando…');
      expect(root.querySelector('app-instrument-entry')).toBeNull();
      http.expectOne(CATALOG_URL).flush(CATALOG());
      await settle();
    });

    it('sin instrumento en la URL abre el primero del índice', async () => {
      await open();

      expect(heading()).toBe('Pinza de Allis');
      expect(current()).toBe('Pinza de Allis');
    });

    it('con un instrumento en la URL abre ese', async () => {
      await open(`/gestion/instrumental/${KELLY}`);

      expect(heading()).toBe('Pinza Kelly');
      expect(current()).toBe('Pinza Kelly');
    });

    it('el índice lista las categorías con sus instrumentos y las técnicas en que va cada uno', async () => {
      await open();

      expect(indexNames()).toEqual(['Pinza de Allis', 'Pinza Kelly', 'Tijera de Mayo']);
      const counts = Array.from(root.querySelectorAll('app-instrument-index li a .count')).map(
        (c) => text(c),
      );
      expect(counts).toEqual(['1', '1', '']);
    });

    it('«Dónde va» sale de las mesas de las técnicas publicadas', async () => {
      await open(`/gestion/instrumental/${KELLY}`);

      expect(text(root.querySelector('.summary'))).toBe('En 1 técnica · 1 mesa');
      expect(text(root.querySelector('.use .data'))).toBe('Tiroidectomía Mesa de Mayo · n.° 4');
    });

    it('un instrumento que no está en ninguna mesa lo dice', async () => {
      await open(`/gestion/instrumental/${MAYO}`);

      expect(text(root.querySelector('.summary'))).toBe('Todavía no está en ninguna mesa');
    });

    it('un id que no puede serlo, o que no existe, es «No encontrada»', async () => {
      await open('/gestion/instrumental/abc');
      expect(root.querySelector('app-not-found')).not.toBeNull();
    });

    it('un id que no existe en el catálogo también', async () => {
      await open(`/gestion/instrumental/${id(77)}`);

      expect(root.querySelector('app-not-found')).not.toBeNull();
    });

    it('si el catálogo no llega, lo dice y «Reintentar» lo pide de nuevo', async () => {
      await open('/gestion/instrumental', 'fail');
      expect(text(root.querySelector('.notice p'))).toBe('No se pudo cargar el catálogo.');

      root.querySelector<HTMLButtonElement>('.notice button')!.click();
      await settle();
      http.expectOne(CATALOG_URL).flush(CATALOG());
      await settle();

      expect(heading()).toBe('Pinza de Allis');
    });
  });

  describe('el índice', () => {
    it('buscar filtra por nombre o alias', async () => {
      await open();
      const input = root.querySelector<HTMLInputElement>('app-instrument-index input')!;

      typeIn(input, 'kelly curva');

      expect(indexNames()).toEqual(['Pinza Kelly']);
      expect(text(root.querySelector('.via-alias'))).toBe('también «Kelly curva»');
    });

    it('el selector de celular dice la categoría y el instrumento abiertos', async () => {
      await open(`/gestion/instrumental/${MAYO}`);

      expect(text(root.querySelector('app-instrument-index .toggle'))).toBe(
        'Tijera · Tijera de Mayo',
      );
    });

    it('elegir otro instrumento navega a él', async () => {
      await open();

      root.querySelector<HTMLAnchorElement>(`a[href="/gestion/instrumental/${MAYO}"]`)!.click();
      await settle();
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(TestBed.inject(Router).url).toBe(`/gestion/instrumental/${MAYO}`);
      expect(heading()).toBe('Tijera de Mayo');
    });
  });

  describe('editar', () => {
    it('«Editar esta entrada» abre la edición en su sitio, sin cambiar de pantalla', async () => {
      await open(`/gestion/instrumental/${KELLY}`);

      await clickEdit();

      expect(nameInput().value).toBe('Pinza Kelly');
      expect(root.querySelector('.save-bar')).not.toBeNull();
      expect(TestBed.inject(Router).url).toBe(`/gestion/instrumental/${KELLY}`);
    });

    it('guardar manda solo lo que cambió, avisa dónde se ve y deja ver el cambio de una vez', async () => {
      await open(`/gestion/instrumental/${KELLY}`);
      await clickEdit();
      typeIn(nameInput(), 'Pinza Kelly curva');

      save().click();
      await settle();

      const patch = http.expectOne(`${TEST_API_BASE}/instruments/${KELLY}`);
      expect(patch.request.method).toBe('PATCH');
      expect(patch.request.body).toEqual({ name: 'Pinza Kelly curva' });
      patch.flush({ ...CATALOG().instruments[0], name: 'Pinza Kelly curva' });
      await settle();

      expect(noticeTexts()).toEqual(['Cambios guardados · se ven en 1 técnica.']);
      expect(heading()).toBe('Pinza Kelly curva');
      expect(root.querySelector('.save-bar')).toBeNull();
      expect(indexNames()).toContain('Pinza Kelly curva');
      // Y pide el catálogo de nuevo saltándose la caché del navegador
      const reload = http.expectOne(CATALOG_URL);
      expect(reload.request.cache).toBe('reload');
      reload.flush(CATALOG());
      await settle();
    });

    it('cambiar la categoría manda el id de la nueva', async () => {
      await open(`/gestion/instrumental/${KELLY}`);
      await clickEdit();
      const select = root.querySelector<HTMLSelectElement>('select')!;
      select.value = 'c-tijera';
      select.dispatchEvent(new Event('change'));
      harness.detectChanges();

      save().click();
      await settle();

      const patch = http.expectOne(`${TEST_API_BASE}/instruments/${KELLY}`);
      expect(patch.request.body).toEqual({ category_id: 'c-tijera' });
      patch.flush({ ...CATALOG().instruments[0], category: 'Tijera' });
      await settle();
      http.expectOne(CATALOG_URL).flush(CATALOG());
      await settle();
    });

    it('sin cambios no manda nada y vuelve a leer', async () => {
      await open(`/gestion/instrumental/${KELLY}`);
      await clickEdit();

      save().click();
      await settle();

      expect(root.querySelector('.save-bar')).toBeNull();
      expect(noticeTexts()).toEqual([]);
      http.expectNone(`${TEST_API_BASE}/instruments/${KELLY}`);
    });

    it('«Cancelar» vuelve a leer sin guardar nada', async () => {
      await open(`/gestion/instrumental/${KELLY}`);
      await clickEdit();
      typeIn(nameInput(), 'Otro nombre');

      root.querySelector<HTMLButtonElement>('.buttons button')!.click();
      await settle();

      expect(heading()).toBe('Pinza Kelly');
      http.expectNone(`${TEST_API_BASE}/instruments/${KELLY}`);
    });

    it('si la API rechaza, lo escrito se queda para corregirlo', async () => {
      await open(`/gestion/instrumental/${KELLY}`);
      await clickEdit();
      typeIn(nameInput(), 'Pinza Kelly curva');

      save().click();
      await settle();
      http
        .expectOne(`${TEST_API_BASE}/instruments/${KELLY}`)
        .flush('', { status: 500, statusText: 'Server Error' });
      await settle();

      expect(nameInput().value).toBe('Pinza Kelly curva');
      expect(save().disabled).toBe(false);
      expect(noticeTexts()).toEqual([]);
    });

    it('elegir otro instrumento mientras se edita descarta lo escrito', async () => {
      await open(`/gestion/instrumental/${KELLY}`);
      await clickEdit();
      typeIn(nameInput(), 'Algo escrito');

      root.querySelector<HTMLAnchorElement>(`a[href="/gestion/instrumental/${MAYO}"]`)!.click();
      await settle();
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(root.querySelector('.name-input')).toBeNull();
      expect(heading()).toBe('Tijera de Mayo');
    });

    it('«Escribir descripción» edita solo la descripción', async () => {
      await open(`/gestion/instrumental/${ALLIS}`);

      root.querySelector<HTMLButtonElement>('.no-description button')!.click();
      await settle();

      expect(root.querySelector('textarea')).not.toBeNull();
      expect(root.querySelector('.name-input')).toBeNull();

      typeIn(root.querySelector('textarea')!, 'Pinza de agarre atraumática.');
      const source = root.querySelector<HTMLInputElement>('app-text-field input')!;
      typeIn(source, 'Libro de instrumentación');
      save().click();
      await settle();

      const patch = http.expectOne(`${TEST_API_BASE}/instruments/${ALLIS}`);
      expect(patch.request.body).toEqual({
        description: 'Pinza de agarre atraumática.',
        description_source: 'Libro de instrumentación',
      });
      patch.flush({
        ...CATALOG().instruments[1],
        description: 'Pinza de agarre atraumática.',
        description_source: 'Libro de instrumentación',
      });
      await settle();
      http.expectOne(CATALOG_URL).flush(CATALOG());
      await settle();
    });
  });

  describe('un instrumento nuevo', () => {
    async function fillNew(name: string): Promise<void> {
      root.querySelector<HTMLButtonElement>('app-instrument-index .new')!.click();
      await settle();
      typeIn(nameInput(), name);
      const select = root.querySelector<HTMLSelectElement>('select')!;
      select.value = 'c-pinza';
      select.dispatchEvent(new Event('change'));
      harness.detectChanges();
    }

    it('«Nuevo instrumento» abre una entrada vacía y no deja marcado ninguno del índice', async () => {
      await open();

      root.querySelector<HTMLButtonElement>('app-instrument-index .new')!.click();
      await settle();

      expect(nameInput().value).toBe('');
      expect(root.querySelector('app-instrument-index [aria-current]')).toBeNull();
      expect(text(root.querySelector('app-instrument-index .toggle'))).toBe('Nuevo instrumento');
    });

    it('guardar lo crea, avisa y lo abre', async () => {
      await open();
      await fillNew('Pinza de Moynihan');

      save().click();
      await settle();

      const post = http.expectOne(`${TEST_API_BASE}/instruments`);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({ name: 'Pinza de Moynihan', category_id: 'c-pinza' });
      post.flush(instrument(NEW, 'Pinza de Moynihan', 'Pinza'));
      await settle();
      http.expectOne(CATALOG_URL).flush(withMoynihan());
      await settle();
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(noticeTexts()).toEqual(['Instrumento agregado al catálogo.']);
      expect(TestBed.inject(Router).url).toBe(`/gestion/instrumental/${NEW}`);
      expect(heading()).toBe('Pinza de Moynihan');
      expect(indexNames()).toContain('Pinza de Moynihan');
    });

    it('los alias van en un segundo paso: el POST no los recibe', async () => {
      await open();
      await fillNew('Pinza de Moynihan');
      root.querySelector<HTMLButtonElement>('.add')!.click();
      harness.detectChanges();
      const alias = root.querySelector<HTMLInputElement>('input.new')!;
      alias.value = 'Moninjan';
      alias.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      harness.detectChanges();

      save().click();
      await settle();
      http
        .expectOne(`${TEST_API_BASE}/instruments`)
        .flush(instrument(NEW, 'Pinza de Moynihan', 'Pinza'));
      await settle();

      const patch = http.expectOne(`${TEST_API_BASE}/instruments/${NEW}`);
      expect(patch.request.body).toEqual({ aliases: ['Moninjan'] });
      patch.flush(instrument(NEW, 'Pinza de Moynihan', 'Pinza', { aliases: ['Moninjan'] }));
      await settle();
      http.expectOne(CATALOG_URL).flush(withMoynihan());
      await settle();
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(noticeTexts()).toEqual(['Instrumento agregado al catálogo.']);
    });

    it('si fallan los alias el instrumento queda creado y se abre sin ellos', async () => {
      await open();
      await fillNew('Pinza de Moynihan');
      root.querySelector<HTMLButtonElement>('.add')!.click();
      harness.detectChanges();
      const alias = root.querySelector<HTMLInputElement>('input.new')!;
      alias.value = 'Moninjan';
      alias.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      harness.detectChanges();

      save().click();
      await settle();
      http
        .expectOne(`${TEST_API_BASE}/instruments`)
        .flush(instrument(NEW, 'Pinza de Moynihan', 'Pinza'));
      await settle();
      http
        .expectOne(`${TEST_API_BASE}/instruments/${NEW}`)
        .flush('', { status: 409, statusText: 'Conflict' });
      await settle();
      http.expectOne(CATALOG_URL).flush(withMoynihan());
      await settle();
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(indexNames()).toContain('Pinza de Moynihan');
      expect(noticeTexts()).toEqual(['Instrumento agregado al catálogo.']);
    });

    it('«Cancelar» vuelve al instrumento que estaba abierto', async () => {
      await open(`/gestion/instrumental/${KELLY}`);
      root.querySelector<HTMLButtonElement>('app-instrument-index .new')!.click();
      await settle();

      root.querySelector<HTMLButtonElement>('.buttons button')!.click();
      await settle();

      expect(heading()).toBe('Pinza Kelly');
      expect(current()).toBe('Pinza Kelly');
    });
  });
});

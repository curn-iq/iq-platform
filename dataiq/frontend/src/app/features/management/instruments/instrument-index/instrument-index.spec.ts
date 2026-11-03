import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { indexGroups, type CatalogEntry } from '../../../../domain/instrument-catalog';
import { InstrumentIndex } from './instrument-index';

const entry = (
  id: string,
  name: string,
  category: string,
  aliases: string[] = [],
): CatalogEntry => ({
  id,
  name,
  category,
  description: null,
  description_source: null,
  aliases,
});

const INSTRUMENTS = [
  entry('i-kelly', 'Pinza Kelly', 'Pinza', ['Pinza hemostática Kelly']),
  entry('i-allis', 'Pinza de Allis', 'Pinza'),
  entry('i-mayo', 'Tijera de Mayo', 'Tijera'),
  entry('i-gasa', 'Gasa', 'Sin clasificar'),
];

describe('InstrumentIndex', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<InstrumentIndex>>;
  let root: HTMLElement;

  function mount(options: { query?: string; selectedId?: string | null; loading?: boolean } = {}) {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
    fixture = TestBed.createComponent(InstrumentIndex);
    const query = options.query ?? '';
    fixture.componentRef.setInput(
      'groups',
      indexGroups(INSTRUMENTS, (id) => (id === 'i-kelly' ? 3 : 0), query),
    );
    fixture.componentRef.setInput('selectedId', options.selectedId ?? null);
    fixture.componentRef.setInput('loading', options.loading ?? false);
    fixture.componentRef.setInput('query', query);
    root = fixture.nativeElement;
    fixture.detectChanges();
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const links = () => Array.from(root.querySelectorAll<HTMLAnchorElement>('li a'));

  it('es la navegación «Catálogo de instrumental», con su buscador y «Nuevo instrumento»', () => {
    mount();

    expect(root.querySelector('nav')!.getAttribute('aria-label')).toBe('Catálogo de instrumental');
    expect(root.querySelector('input')!.getAttribute('placeholder')).toBe('Nombre o alias');
    expect(root.querySelector('label')!.textContent).toContain('Buscar por nombre o alias');
    expect(text(root.querySelector('.new'))).toBe('Nuevo instrumento');
    expect(text(root.querySelector('.legend'))).toBe(
      'Cifra junto a cada instrumento: técnicas en que va',
    );
  });

  it('lista las categorías con su cifra de instrumentos, «Sin clasificar» al final', () => {
    mount();

    expect(
      Array.from(root.querySelectorAll('h2')).map(
        (h) => `${h.firstChild!.textContent!.trim()} ${text(h.querySelector('.count'))}`,
      ),
    ).toEqual(['Pinza 2', 'Tijera 1', 'Sin clasificar 1']);
  });

  it('cada instrumento lleva a su ruta y dice en cuántas técnicas va', () => {
    mount();

    expect(links().map((a) => a.getAttribute('href'))).toEqual([
      '/gestion/instrumental/i-allis',
      '/gestion/instrumental/i-kelly',
      '/gestion/instrumental/i-mayo',
      '/gestion/instrumental/i-gasa',
    ]);
    expect(links().map((a) => text(a.querySelector('.count')))).toEqual(['', '3', '', '']);
    expect(links()[1].querySelector('.count')!.getAttribute('title')).toBe('Técnicas en que va');
  });

  it('el instrumento abierto va marcado', () => {
    mount({ selectedId: 'i-kelly' });

    expect(links().filter((a) => a.getAttribute('aria-current') === 'page')).toHaveLength(1);
    expect(text(links()[1])).toContain('Pinza Kelly');
    expect(links()[1].getAttribute('aria-current')).toBe('page');
  });

  it('con uno nuevo no hay ninguno marcado', () => {
    mount({ selectedId: null });

    expect(root.querySelector('[aria-current]')).toBeNull();
  });

  it('al buscar resalta lo que coincide', () => {
    mount({ query: 'allis' });

    expect(links()).toHaveLength(1);
    expect(text(links()[0].querySelector('mark'))).toBe('Allis');
  });

  it('al buscar por alias dice por cuál coincidió, y no resalta el nombre', () => {
    mount({ query: 'hemostática' });

    expect(links()).toHaveLength(1);
    expect(text(links()[0])).toContain('Pinza Kelly');
    expect(text(links()[0].querySelector('.via-alias'))).toBe('también «Pinza hemostática Kelly»');
    expect(links()[0].querySelector('mark')).toBeNull();
  });

  it('sin resultados lo dice', () => {
    mount({ query: 'zzz' });

    expect(links()).toHaveLength(0);
    expect(text(root.querySelector('.none'))).toBe('Ningún instrumento con ese nombre o alias.');
  });

  it('mientras llega el catálogo dice «Cargando…», no «ninguno»', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
    fixture = TestBed.createComponent(InstrumentIndex);
    fixture.componentRef.setInput('groups', []);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    root = fixture.nativeElement;

    expect(text(root.querySelector('.none'))).toBe('Cargando…');
  });

  it('escribir en el buscador cambia `query`', () => {
    mount();

    const input = root.querySelector('input')!;
    input.value = 'kelly';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('kelly');
  });

  it('«Nuevo instrumento» lo pide', () => {
    mount();
    let requested = 0;
    fixture.componentInstance.newRequested.subscribe(() => requested++);

    root.querySelector<HTMLButtonElement>('.new')!.click();

    expect(requested).toBe(1);
  });

  it('elegir un instrumento avisa y pliega el selector de celular', async () => {
    mount();
    let chosen = 0;
    fixture.componentInstance.chosen.subscribe(() => chosen++);
    const toggle = root.querySelector<HTMLButtonElement>('.toggle')!;
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    links()[0].addEventListener('click', (event) => event.preventDefault());
    links()[0].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(chosen).toBe(1);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('el selector de celular dice lo que se le da', () => {
    mount();
    fixture.componentRef.setInput('label', 'Pinza · Pinza Kelly');
    fixture.detectChanges();

    expect(text(root.querySelector('.toggle'))).toBe('Pinza · Pinza Kelly');
    expect(root.querySelector('.toggle')!.getAttribute('aria-controls')).toBe(
      'instrument-index-body',
    );
  });
});

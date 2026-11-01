import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TabItem, tabIndexAfterKey, Tabs } from './tabs';

const ITEMS: TabItem[] = [
  { key: 'one', label: 'Uno', link: ['/x', 'one'] },
  { key: 'two', label: 'Dos', link: ['/x', 'two'], locked: true },
  { key: 'three', label: 'Tres', link: ['/x', 'three'], locked: true },
  { key: 'four', label: 'Cuatro', link: ['/x', 'four'] },
];

describe('Tabs', () => {
  let router: Router;
  let fixture: ReturnType<typeof TestBed.createComponent<Tabs>>;
  let root: HTMLElement;

  const tabs = () => Array.from(root.querySelectorAll<HTMLAnchorElement>('[role=tab]'));
  const line = () => root.querySelector<HTMLElement>('.line')!;

  async function mount(current = 'one', items: readonly TabItem[] = ITEMS) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Tabs);
    fixture.componentRef.setInput('label', 'Contenido');
    fixture.componentRef.setInput('tabs', items);
    fixture.componentRef.setInput('current', current);
    root = fixture.nativeElement;
    document.body.appendChild(root);
    await fixture.whenStable();
  }

  afterEach(() => {
    root?.remove();
    vi.restoreAllMocks();
  });

  it('son un grupo de pestañas con nombre, cada una con su texto', async () => {
    await mount();

    expect(root.querySelector('[role=tablist]')!.getAttribute('aria-label')).toBe('Contenido');
    expect(tabs().map((tab) => tab.textContent!.trim())).toEqual(['Uno', 'Dos', 'Tres', 'Cuatro']);
  });

  it('cada una es un enlace y apunta a su hoja', async () => {
    await mount();

    expect(tabs().map((tab) => tab.getAttribute('href'))).toEqual([
      '/x/one',
      '/x/two',
      '/x/three',
      '/x/four',
    ]);
    expect(tabs().map((tab) => tab.id)).toEqual(['tab-one', 'tab-two', 'tab-three', 'tab-four']);
    expect(tabs().map((tab) => tab.getAttribute('aria-controls'))).toEqual([
      'panel-one',
      'panel-two',
      'panel-three',
      'panel-four',
    ]);
  });

  it('solo la abierta está elegida y es la única a la que llega el tabulador', async () => {
    await mount('three');

    expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ]);
    expect(tabs().map((tab) => tab.getAttribute('tabindex'))).toEqual(['-1', '-1', '0', '-1']);
  });

  it('el candado lo llevan solo las pestañas que lo piden', async () => {
    await mount();

    const locked = tabs()
      .filter((tab) => tab.querySelector('.lock'))
      .map((tab) => tab.textContent!.trim());
    expect(locked).toEqual(['Dos', 'Tres']);
    expect(root.querySelector('.lock')!.getAttribute('aria-label')).toBe('Requiere cuenta');
  });

  describe('teclado', () => {
    const press = (key: string, from: number) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      tabs()[from].dispatchEvent(event);
      return event;
    };

    it('Derecha pasa a la siguiente pestaña y le da el foco', async () => {
      await mount('one');
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const event = press('ArrowRight', 0);

      expect(navigate).toHaveBeenCalledWith(['/x', 'two']);
      expect(document.activeElement).toBe(tabs()[1]);
      expect(event.defaultPrevented).toBe(true);
    });

    it('Izquierda da la vuelta, Fin e Inicio van a los extremos', async () => {
      await mount('one');
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      press('ArrowLeft', 0);
      press('End', 1);
      press('Home', 2);

      expect(navigate.mock.calls.map(([commands]) => (commands as string[])[1])).toEqual([
        'four',
        'four',
        'one',
      ]);
    });

    it('otra tecla no navega ni se traga', async () => {
      await mount('one');
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const event = press('Enter', 0);

      expect(navigate).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('raya', () => {
    function stubLayout(): void {
      vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return Array.from(this.parentElement?.children ?? []).indexOf(this) * 120;
      });
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(96);
    }

    it('se coloca bajo la pestaña abierta y los lectores de pantalla la ignoran', async () => {
      stubLayout();
      await mount('three');

      expect(line().style.transform).toBe('translateX(240px)');
      expect(line().style.width).toBe('96px');
      expect(line().getAttribute('aria-hidden')).toBe('true');
    });

    it('se desliza al cambiar de pestaña, sin animarse la primera vez', async () => {
      stubLayout();
      await mount('one');
      await fixture.whenStable();
      expect(line().classList).toContain('ready');

      fixture.componentRef.setInput('current', 'two');
      await fixture.whenStable();

      expect(line().style.transform).toBe('translateX(120px)');
    });
  });
});

describe('tabIndexAfterKey', () => {
  it('Derecha e Izquierda dan la vuelta', () => {
    expect(tabIndexAfterKey(1, 'ArrowRight', 4)).toBe(2);
    expect(tabIndexAfterKey(3, 'ArrowRight', 4)).toBe(0);
    expect(tabIndexAfterKey(0, 'ArrowLeft', 4)).toBe(3);
    expect(tabIndexAfterKey(2, 'ArrowLeft', 4)).toBe(1);
  });

  it('Inicio y Fin van a los extremos', () => {
    expect(tabIndexAfterKey(2, 'Home', 4)).toBe(0);
    expect(tabIndexAfterKey(1, 'End', 4)).toBe(3);
  });

  it('otra tecla no mueve nada', () => {
    expect(tabIndexAfterKey(1, 'Enter', 4)).toBeNull();
    expect(tabIndexAfterKey(1, 'ArrowDown', 4)).toBeNull();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CYCLE_MS, HeroStage, SCAN_MS } from './hero-stage';

describe('HeroStage', () => {
  let fixture: ComponentFixture<HeroStage>;
  const root = () => fixture.nativeElement as HTMLElement;
  const tabs = () => Array.from(root().querySelectorAll<HTMLButtonElement>('[role=tab]'));
  const tab = (index: number) => tabs()[index];
  const piece = (n: number) => root().querySelector<SVGGElement>(`.piece[data-n="${n}"]`)!;
  const view = () => root().getAttribute('data-view');
  const rail = () => root().querySelector('app-stage-rail')!;

  async function settle(): Promise<void> {
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  }

  async function mount(reducedMotion = false): Promise<void> {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: reducedMotion && query.includes('prefers-reduced-motion'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    fixture = TestBed.createComponent(HeroStage);
    fixture.detectChanges();
    await settle();
  }

  async function tick(ms: number): Promise<void> {
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('abre en la vista de referencia, con la pieza 7 elegida', async () => {
    await mount();

    expect(view()).toBe('reference');
    expect(tab(0).getAttribute('aria-selected')).toBe('true');
    expect(piece(7).getAttribute('aria-pressed')).toBe('true');
    expect(rail().querySelector('.reference .number')!.textContent!.trim()).toBe('7');
  });

  it('el selector tiene las tres vistas, cada una con su herramienta', async () => {
    await mount();

    expect(tabs().map((t) => t.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
      'ReferenciaDataIQ',
      '3DSIMIQ3D',
      'CámaraSIVRI',
    ]);
    expect(root().querySelector('[role=tablist]')!.getAttribute('aria-label')).toBe(
      'Ver la mesa como',
    );
  });

  it('la mesa es de ejemplo y lo dice: «demostración»', async () => {
    await mount();

    expect(root().querySelector('.status')!.textContent).toContain('Mesa de Mayo de ejemplo');
    expect(root().querySelector('.status .demo')!.textContent).toContain('demostración');
  });

  describe('cambio automático', () => {
    it('pasa solo de una vista a la siguiente cada 5,5 s y vuelve a empezar', async () => {
      await mount();

      await tick(CYCLE_MS);
      expect(view()).toBe('3d');
      await tick(CYCLE_MS);
      expect(view()).toBe('camera');
      await tick(CYCLE_MS);
      expect(view()).toBe('reference');
    });

    it('muestra el trazo de progreso solo bajo la pestaña activa', async () => {
      await mount();
      expect(root().querySelectorAll('.progress').length).toBe(1);
      expect(tab(0).querySelector('.progress')).not.toBeNull();

      await tick(CYCLE_MS);
      expect(tab(0).querySelector('.progress')).toBeNull();
      expect(tab(1).querySelector('.progress')).not.toBeNull();
    });

    it('con movimiento reducido no corre solo ni traza el progreso', async () => {
      await mount(true);

      await tick(CYCLE_MS * 3);
      expect(view()).toBe('reference');
      expect(root().querySelector('.progress')).toBeNull();
    });

    it('se pausa mientras el puntero está sobre el escenario y sigue al salir', async () => {
      await mount();
      const stage = root().querySelector('.stage')!;

      stage.dispatchEvent(new MouseEvent('mouseenter'));
      await tick(CYCLE_MS * 2);
      expect(view()).toBe('reference');
      expect(root().querySelector('.progress')!.classList.contains('paused')).toBe(true);

      stage.dispatchEvent(new MouseEvent('mouseleave'));
      await tick(CYCLE_MS);
      expect(view()).toBe('3d');
    });

    it('al interactuar se detiene para siempre', async () => {
      await mount();
      tab(2).click();
      await settle();

      await tick(CYCLE_MS * 3);
      expect(view()).toBe('camera');
      expect(root().querySelector('.progress')).toBeNull();
    });

    it('al salir el puntero tras interactuar no vuelve a correr', async () => {
      await mount();
      const stage = root().querySelector('.stage')!;
      tab(1).click();
      await settle();

      stage.dispatchEvent(new MouseEvent('mouseenter'));
      stage.dispatchEvent(new MouseEvent('mouseleave'));
      await tick(CYCLE_MS * 2);
      expect(view()).toBe('3d');
    });

    it('al destruirse deja de contar', async () => {
      await mount();
      fixture.destroy();

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('selector', () => {
    it('elegir una vista la muestra', async () => {
      await mount();
      tab(1).click();
      await settle();

      expect(view()).toBe('3d');
      expect(tab(1).getAttribute('aria-selected')).toBe('true');
      expect(tab(1).getAttribute('tabindex')).toBe('0');
      expect(tab(0).getAttribute('tabindex')).toBe('-1');
    });

    it('las flechas pasan a la pestaña vecina, dando la vuelta, y le dan el foco', async () => {
      await mount();
      tab(0).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true }));
      await settle();
      expect(view()).toBe('camera');
      expect(document.activeElement).toBe(tab(2));

      tab(2).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
      await settle();
      expect(view()).toBe('reference');
    });

    it('otras teclas no hacen nada', async () => {
      await mount();
      const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
      tab(0).dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(view()).toBe('reference');
    });
  });

  describe('3D', () => {
    it('lo dice en el estado, con SIMIQ3D y «demostración»', async () => {
      await mount();
      tab(1).click();
      await settle();

      expect(root().querySelector('.status')!.textContent).toContain('La misma mesa, en 3D');
      expect(root().querySelector('.status .demo')!.textContent!.trim()).toBe(
        'SIMIQ3D · demostración',
      );
    });
  });

  describe('cámara', () => {
    beforeEach(async () => {
      await mount();
      tab(2).click();
      await settle();
    });

    it('barre la mesa y, pasado el barrido, traza las cajas', async () => {
      expect(root().querySelector('.stage')!.classList.contains('scanning')).toBe(true);
      expect(root().querySelector('.detections')!.classList.contains('scanned')).toBe(false);

      await tick(SCAN_MS);
      expect(root().querySelector('.detections')!.classList.contains('scanned')).toBe(true);
    });

    it('al salir de la cámara, el barrido y las cajas se reinician', async () => {
      await tick(SCAN_MS);
      tab(0).click();
      await settle();
      tab(2).click();
      await settle();

      expect(root().querySelector('.detections')!.classList.contains('scanned')).toBe(false);
    });

    it('si la persona deja la cámara antes de que termine el barrido, no traza nada', async () => {
      tab(0).click();
      await settle();
      await tick(SCAN_MS * 2);

      expect(root().querySelector('.detections')!.classList.contains('scanned')).toBe(false);
    });

    it('cuenta cuántas piezas están en su lugar y cuál hay que mover', () => {
      const status = root().querySelector('.status')!;
      expect(status.querySelector('.good')!.textContent!.trim()).toBe('9 en su lugar');
      expect(status.querySelector('.bad')!.textContent!.trim()).toBe('1 por mover');
      expect(status.querySelector('.demo')!.textContent!.trim()).toBe('SIVRI · demostración');
    });

    it('el riel dice qué pieza mover y hacia dónde', () => {
      const camera = rail().querySelector('.camera')!;
      expect(camera.querySelector('.number')!.textContent!.trim()).toBe('6');
      expect(camera.querySelector('.name')!.textContent!.trim()).toBe('Separador de Senn Miller');
      expect(camera.querySelector('.hint')!.textContent!.trim()).toBe(
        'Mover una celda a la izquierda.',
      );
    });

    it('la pieza 6 aparece corrida y marcada fuera de lugar', () => {
      expect(root().querySelectorAll('.det.error').length).toBe(1);
      expect(root().querySelector('.target-label')!.textContent!.trim()).toBe('Va aquí');
    });
  });

  describe('las piezas', () => {
    beforeEach(async () => {
      await mount();
    });

    it('tocar una la elige, el riel la muestra de cerca y se detiene el cambio automático', async () => {
      piece(3).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle();

      expect(piece(3).getAttribute('aria-pressed')).toBe('true');
      const reference = rail().querySelector('.reference')!;
      expect(reference.querySelector('.number')!.textContent!.trim()).toBe('3');
      expect(reference.querySelector('.name')!.textContent!.trim()).toBe('Tijera de Mayo');

      await tick(CYCLE_MS * 2);
      expect(view()).toBe('reference');
    });

    it('pasar el puntero la elige pero no detiene el cambio', async () => {
      piece(4).dispatchEvent(new MouseEvent('mouseenter'));
      await settle();
      expect(rail().querySelector('.reference .number')!.textContent!.trim()).toBe('4');

      await tick(CYCLE_MS);
      expect(view()).toBe('3d');
    });
  });

  describe('«Ver las 10 piezas»', () => {
    const showAll = () => rail().querySelector<HTMLButtonElement>('.show-all')!;
    const list = () => root().querySelector('#stage-pieces');

    beforeEach(async () => {
      await mount();
    });

    it('dice cuántas piezas hay y está cerrada al principio', () => {
      expect(showAll().textContent!.trim()).toBe('Ver las 10 piezas');
      expect(showAll().getAttribute('aria-expanded')).toBe('false');
      expect(list()).toBeNull();
    });

    it('la abre sobre la mesa con las diez piezas, y detiene el cambio automático', async () => {
      showAll().click();
      await settle();

      expect(list()).not.toBeNull();
      expect(showAll().getAttribute('aria-expanded')).toBe('true');
      expect(list()!.querySelectorAll('li').length).toBe(10);
      expect(list()!.querySelector('li:nth-child(4)')!.textContent).toContain('Pinza de disección');
      await tick(CYCLE_MS * 2);
      expect(view()).toBe('reference');
    });

    it('un segundo clic la cierra', async () => {
      showAll().click();
      await settle();
      showAll().click();
      await settle();

      expect(list()).toBeNull();
    });

    it('elegir una pieza de la lista la marca y cierra la lista', async () => {
      showAll().click();
      await settle();
      list()!.querySelectorAll('li button')[7].dispatchEvent(new MouseEvent('click'));
      await settle();

      expect(list()).toBeNull();
      expect(piece(8).getAttribute('aria-pressed')).toBe('true');
      expect(rail().querySelector('.reference .number')!.textContent!.trim()).toBe('8');
    });

    it('«Cerrar la lista» la cierra y devuelve el foco al botón que la abre', async () => {
      showAll().click();
      await settle();
      list()!.querySelector<HTMLButtonElement>('.close')!.click();
      await settle();

      expect(list()).toBeNull();
      expect(document.activeElement).toBe(showAll());
    });

    it('al cambiar de vista la lista se cierra', async () => {
      showAll().click();
      await settle();
      tab(1).click();
      await settle();

      expect(list()).toBeNull();
    });
  });
});

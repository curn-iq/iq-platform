import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEMO_TABLE } from '../demo-table';
import { HomeTable, type TableView } from './home-table';

@Component({
  imports: [HomeTable],
  template: `
    <app-home-table
      [view]="view()"
      [grid]="grid()"
      [numbers]="numbers()"
      [interactive]="interactive()"
      [detectable]="detectable()"
      [detecting]="detecting()"
      [scanned]="scanned()"
      [displaced]="displaced()"
      [(selected)]="selected"
      (activated)="activated.push($event)"
    />
  `,
})
class Host {
  view = signal<TableView>('reference');
  grid = signal(false);
  numbers = signal(false);
  interactive = signal(false);
  detectable = signal(false);
  detecting = signal(false);
  scanned = signal(true);
  displaced = signal(false);
  selected = signal<number | null>(null);
  activated: number[] = [];
}

describe('HomeTable', () => {
  let fixture: ComponentFixture<Host>;
  const root = () => fixture.nativeElement as HTMLElement;
  const piece = (n: number) => root().querySelector<SVGGElement>(`.piece[data-n="${n}"]`)!;

  async function mount(setup: (host: Host) => void = () => undefined): Promise<void> {
    fixture = TestBed.createComponent(Host);
    setup(fixture.componentInstance);
    await fixture.whenStable();
  }

  afterEach(() => vi.unstubAllGlobals());

  it('dibuja las diez piezas de la mesa de ejemplo, cada una con su dibujo de acero', async () => {
    await mount();

    expect(root().querySelectorAll('.piece').length).toBe(10);
    expect(root().querySelectorAll('.piece [data-drawing]').length).toBe(10);
    expect(piece(7).querySelector('[data-drawing="allis"]')).not.toBeNull();
  });

  it('es un dibujo decorativo si no se puede interactuar con él', async () => {
    await mount();
    const svg = root().querySelector('svg')!;

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.hasAttribute('role')).toBe(false);
    expect(piece(1).hasAttribute('tabindex')).toBe(false);
  });

  it('la rejilla y los números van solo si se piden', async () => {
    await mount();
    expect(root().querySelectorAll('.grid path').length).toBe(0);
    expect(root().querySelectorAll('.number').length).toBe(0);

    await mount((host) => {
      host.grid.set(true);
      host.numbers.set(true);
    });
    expect(root().querySelectorAll('.grid path').length).toBe(DEMO_TABLE.columns - 1);
    expect(root().querySelectorAll('.number').length).toBe(10);
    expect(piece(3).querySelector('.number text')!.textContent!.trim()).toBe('3');
  });

  it('cada mesa tiene sus propios degradados: dos en una página no comparten id', async () => {
    await mount();
    const other = TestBed.createComponent(Host);
    await other.whenStable();
    const idOf = (el: HTMLElement) => el.querySelector('linearGradient.steel-gradient')!.id;

    expect(idOf(root())).not.toBe(idOf(other.nativeElement));
  });

  describe('interactiva', () => {
    beforeEach(async () => {
      await mount((host) => host.interactive.set(true));
    });

    it('cada pieza es un botón con su número y su nombre', () => {
      expect(piece(7).getAttribute('role')).toBe('button');
      expect(piece(7).getAttribute('tabindex')).toBe('0');
      expect(piece(7).getAttribute('aria-label')).toBe('7: Pinza de Allis');
      expect(piece(7).getAttribute('aria-pressed')).toBe('false');
    });

    it('pasar el puntero o enfocar elige la pieza, y se queda elegida aunque se vaya', async () => {
      piece(4).dispatchEvent(new MouseEvent('mouseenter'));
      await fixture.whenStable();
      expect(fixture.componentInstance.selected()).toBe(4);
      expect(piece(4).getAttribute('aria-pressed')).toBe('true');

      piece(4).dispatchEvent(new MouseEvent('mouseleave'));
      piece(5).dispatchEvent(new Event('focus'));
      await fixture.whenStable();
      expect(fixture.componentInstance.selected()).toBe(5);
      expect(piece(4).getAttribute('aria-pressed')).toBe('false');
    });

    it('un clic la elige y avisa que se activó; pasar el puntero no avisa', async () => {
      piece(2).dispatchEvent(new MouseEvent('mouseenter'));
      expect(fixture.componentInstance.activated).toEqual([]);

      piece(2).dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(fixture.componentInstance.selected()).toBe(2);
      expect(fixture.componentInstance.activated).toEqual([2]);
    });

    it('Enter y Espacio la activan sin desplazar la página', async () => {
      for (const key of ['Enter', ' ']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        piece(9).dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
      }
      await fixture.whenStable();

      expect(fixture.componentInstance.activated).toEqual([9, 9]);
    });

    it('la elegida lleva la marca y su número se pinta aparte', async () => {
      fixture.componentInstance.selected.set(6);
      fixture.componentInstance.numbers.set(true);
      await fixture.whenStable();

      expect(piece(6).classList.contains('selected')).toBe(true);
      expect(piece(3).classList.contains('selected')).toBe(false);
    });
  });

  describe('no interactiva', () => {
    it('pasar el puntero no elige nada', async () => {
      await mount();
      piece(4).dispatchEvent(new MouseEvent('mouseenter'));
      await fixture.whenStable();

      expect(fixture.componentInstance.selected()).toBeNull();
    });

    it('un clic tampoco: ni elige la pieza ni avisa', async () => {
      await mount();
      piece(4).dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(fixture.componentInstance.selected()).toBeNull();
      expect(fixture.componentInstance.activated).toEqual([]);
      expect(piece(4).classList.contains('selected')).toBe(false);
    });
  });

  it('la vista queda en el atributo del anfitrión, para agrandar las piezas en 3D', async () => {
    await mount((host) => host.view.set('3d'));

    expect(root().querySelector('app-home-table')!.getAttribute('data-view')).toBe('3d');
  });

  describe('detecciones de la cámara', () => {
    it('sin pedirlas, no hay capa', async () => {
      await mount();
      expect(root().querySelector('.detections')).toBeNull();
    });

    it('dibuja una caja con su etiqueta por pieza, con el nombre corto y la confianza', async () => {
      await mount((host) => host.detectable.set(true));

      expect(root().querySelectorAll('.det').length).toBe(10);
      const labels = Array.from(root().querySelectorAll('.det .label text')).map((t) =>
        t.textContent!.trim(),
      );
      expect(labels[0]).toBe('Bisturí N.° 3 0,97');
      expect(labels[6]).toBe('Allis 0,97');
    });

    it('en celular las etiquetas llevan solo el nombre', async () => {
      vi.stubGlobal('matchMedia', () => ({
        matches: true,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }));
      await mount((host) => host.detectable.set(true));

      expect(root().querySelectorAll('.det .label text')[6].textContent!.trim()).toBe('Allis');
    });

    it('la capa se muestra solo mientras se detecta, y traza las cajas al escanear', async () => {
      await mount((host) => host.detectable.set(true));
      const layer = () => root().querySelector('.detections')!;
      expect(layer().classList.contains('on')).toBe(false);

      fixture.componentInstance.detecting.set(true);
      await fixture.whenStable();
      expect(layer().classList.contains('on')).toBe(true);
      expect(layer().classList.contains('scanned')).toBe(true);

      fixture.componentInstance.scanned.set(false);
      await fixture.whenStable();
      expect(layer().classList.contains('scanned')).toBe(false);
    });

    it('sin correr ninguna pieza, ninguna está fuera de lugar', async () => {
      await mount((host) => host.detectable.set(true));

      expect(root().querySelectorAll('.det.error').length).toBe(0);
      expect(root().querySelector('.target')).toBeNull();
    });

    it('la pieza 6 corrida está fuera de lugar y su destino dice «Va aquí»', async () => {
      await mount((host) => {
        host.detectable.set(true);
        host.displaced.set(true);
      });

      expect(root().querySelectorAll('.det.error').length).toBe(1);
      expect(root().querySelector('.target-label')!.textContent!.trim()).toBe('Va aquí');
      // La pieza se corre una celda a la derecha, y su caja con ella
      expect(piece(6).querySelector(':scope > g')!.getAttribute('transform')).toBe(
        'translate(100 0)',
      );
      const box = root().querySelectorAll<SVGRectElement>('.det')[5].querySelector('.box')!;
      const target = root().querySelector('.target')!;
      expect(Number(box.getAttribute('x')) - Number(target.getAttribute('x'))).toBe(100);
    });

    it('ninguna etiqueta se sale del dibujo', async () => {
      await mount((host) => {
        host.detectable.set(true);
        host.displaced.set(true);
      });

      for (const rect of Array.from(root().querySelectorAll('.det .label rect'))) {
        const x = Number(rect.getAttribute('x'));
        const y = Number(rect.getAttribute('y'));
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + Number(rect.getAttribute('width'))).toBeLessThanOrEqual(700);
        expect(y + Number(rect.getAttribute('height'))).toBeLessThanOrEqual(700);
      }
    });
  });
});

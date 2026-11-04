import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SegmentedControl, type SegmentOption } from './segmented-control';

const OPTIONS: SegmentOption[] = [
  { key: 'all', label: 'Todas', count: 4 },
  { key: 'returned', label: 'Devueltas', count: 1 },
  { key: 'draft', label: 'Borradores', count: 0 },
];

@Component({
  imports: [SegmentedControl],
  template: `<app-segmented-control
    label="Filtrar por estado"
    [options]="options"
    [(value)]="value"
  />`,
})
class Host {
  options = OPTIONS;
  value = signal('all');
}

@Component({
  imports: [SegmentedControl],
  template: `<app-segmented-control label="Rol" [options]="options" [fill]="true" value="all" />`,
})
class FillHost {
  options = OPTIONS;
}

@Component({
  imports: [SegmentedControl],
  template: `<app-segmented-control
    label="Rol"
    [options]="options"
    [disabled]="true"
    [(value)]="value"
  />`,
})
class DisabledHost {
  options = OPTIONS;
  value = signal('all');
}

const text = (button: HTMLElement) => button.textContent!.replace(/\s+/g, ' ').trim();

describe('SegmentedControl', () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const buttons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
    return {
      fixture,
      root,
      buttons,
      pressed: () =>
        buttons()
          .filter((button) => button.getAttribute('aria-pressed') === 'true')
          .map(text),
    };
  }

  it('es un grupo con nombre, con un botón por opción y su cifra', async () => {
    const { root, buttons } = await mount();

    expect(root.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe(
      'Filtrar por estado',
    );
    expect(buttons().map(text)).toEqual(['Todas 4', 'Devueltas 1', 'Borradores 0']);
  });

  it('una opción sin cifra no pinta ninguna', async () => {
    const fixture = TestBed.createComponent(SegmentedControl);
    fixture.componentRef.setInput('label', 'Vista');
    fixture.componentRef.setInput('options', [{ key: 'a', label: 'A' }]);
    fixture.componentRef.setInput('value', 'a');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.count')).toBeNull();
  });

  it('marca con aria-pressed solo la opción elegida', async () => {
    const { pressed } = await mount();

    expect(pressed()).toEqual(['Todas 4']);
  });

  it('al tocar una opción la elige, y avisa con [(value)]', async () => {
    const { fixture, buttons, pressed } = await mount();

    buttons()[1].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('returned');
    expect(pressed()).toEqual(['Devueltas 1']);
  });

  it('sigue lo que cambie fuera del control', async () => {
    const { fixture, pressed } = await mount();

    fixture.componentInstance.value.set('draft');
    await fixture.whenStable();

    expect(pressed()).toEqual(['Borradores 0']);
  });

  it('ocupa todo el ancho solo si se pide con fill', async () => {
    const { root } = await mount();
    expect(root.querySelector('app-segmented-control')!.classList).not.toContain('fill');

    const filled = TestBed.createComponent(FillHost);
    await filled.whenStable();
    expect(filled.nativeElement.querySelector('app-segmented-control').classList).toContain('fill');
  });

  it('deshabilitado, no deja elegir otra opción y se marca para atenuarlo', async () => {
    const { root, buttons } = await mount();
    expect(buttons().every((button) => !button.disabled)).toBe(true);
    expect(root.querySelector('app-segmented-control')!.classList).not.toContain('disabled');

    const disabled = TestBed.createComponent(DisabledHost);
    await disabled.whenStable();
    const host = disabled.nativeElement as HTMLElement;
    const options = Array.from(host.querySelectorAll<HTMLButtonElement>('button'));

    expect(host.querySelector('app-segmented-control')!.classList).toContain('disabled');
    expect(options.every((button) => button.disabled)).toBe(true);
    options[1].click();
    await disabled.whenStable();
    expect(disabled.componentInstance.value()).toBe('all');
  });

  it('la placa se coloca bajo la elegida y solo se anima después de colocarse', async () => {
    const { fixture, root } = await mount();
    const plate = root.querySelector<HTMLElement>('.plate')!;

    expect(plate.style.transform).toMatch(/^translateX\(/);
    expect(plate.getAttribute('aria-hidden')).toBe('true');
    await fixture.whenStable();
    expect(plate.classList.contains('ready')).toBe(true);
  });

  describe('con el estuche observado', () => {
    let resized: () => void;
    let disconnect: ReturnType<typeof vi.fn>;
    let width = 100;

    beforeEach(() => {
      disconnect = vi.fn();
      // jsdom no trae ResizeObserver ni mide: este guarda el aviso para dispararlo a mano
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: () => void) {
            resized = callback;
          }
          observe(): void {}
          disconnect = disconnect;
        },
      );
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => width);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      width = 100;
    });

    it('la placa se vuelve a medir cuando cambia el ancho del estuche, sin cambiar la ventana', async () => {
      const fixture = TestBed.createComponent(FillHost);
      await fixture.whenStable();
      const plate = fixture.nativeElement.querySelector('.plate') as HTMLElement;
      expect(plate.style.width).toBe('100px');

      // Con fill, los botones se angostan cuando se angosta el estuche
      width = 80;
      resized();
      await fixture.whenStable();
      expect(plate.style.width).toBe('80px');
    });

    it('deja de observar al destruirse', async () => {
      const fixture = TestBed.createComponent(FillHost);
      await fixture.whenStable();
      fixture.destroy();
      expect(disconnect).toHaveBeenCalled();
    });
  });
});

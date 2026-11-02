import { TestBed } from '@angular/core/testing';
import { MarkStatus, ProgressMark } from './progress-mark';

describe('ProgressMark, para los pasos del editor', () => {
  function create(status: MarkStatus, inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(ProgressMark);
    fixture.componentRef.setInput('status', status);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('bloqueado: anillo y candado, y lo dice a los lectores de pantalla', () => {
    const root = create('locked').nativeElement as HTMLElement;

    expect(root.querySelector('.ring')).not.toBeNull();
    expect(root.querySelector('.icon')).not.toBeNull();
    expect(root.querySelector('.sr-only')!.textContent).toBe('Bloqueado');
  });

  it('listo: anillo y flecha, y lo dice a los lectores de pantalla', () => {
    const root = create('ready').nativeElement as HTMLElement;

    expect(root.querySelector('.icon')).not.toBeNull();
    expect(root.querySelector('.sr-only')!.textContent).toBe('Listo');
  });

  it('el candado y la flecha no son el mismo dibujo', () => {
    const lock = (create('locked').nativeElement as HTMLElement).querySelector('.icon')!;
    const arrow = (create('ready').nativeElement as HTMLElement).querySelector('.icon')!;

    expect(lock.getAttribute('d')).not.toBe(arrow.getAttribute('d'));
  });

  describe('retrazar al cambiar de estado', () => {
    it('al aparecer no se traza si no se pidió, aunque pueda retrazarse', () => {
      const root = create('pending', { animated: false, retrace: true })
        .nativeElement as HTMLElement;

      expect(root.getAttribute('data-animated')).toBe('false');
    });

    it('al cambiar de estado se traza de nuevo y se vuelve a dibujar', () => {
      const fixture = create('pending', { animated: false, retrace: true });
      const root = fixture.nativeElement as HTMLElement;
      const before = root.querySelector('svg');

      fixture.componentRef.setInput('status', 'complete');
      fixture.detectChanges();
      fixture.detectChanges();

      expect(root.getAttribute('data-animated')).toBe('true');
      expect(root.querySelector('svg')).not.toBe(before);
      expect(root.querySelector('.fill circle')).not.toBeNull();
    });

    it('sin retrace, cambiar de estado no traza nada', () => {
      const fixture = create('pending', { animated: false });
      const root = fixture.nativeElement as HTMLElement;

      fixture.componentRef.setInput('status', 'complete');
      fixture.detectChanges();
      fixture.detectChanges();

      expect(root.getAttribute('data-animated')).toBe('false');
    });
  });
});

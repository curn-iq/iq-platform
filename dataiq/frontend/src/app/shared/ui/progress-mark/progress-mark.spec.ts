import { TestBed } from '@angular/core/testing';
import type { ProgressStatus } from '../../../domain/version-progress';
import { PROGRESS_LABELS, ProgressMark } from './progress-mark';

describe('ProgressMark', () => {
  function create(status: ProgressStatus, inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(ProgressMark);
    fixture.componentRef.setInput('status', status);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('cada estado lleva su texto para los lectores de pantalla, y el dibujo está oculto', () => {
    for (const status of Object.keys(PROGRESS_LABELS) as ProgressStatus[]) {
      const root = create(status);

      expect(root.querySelector('.sr-only')!.textContent).toBe(PROGRESS_LABELS[status]);
      expect(root.querySelector('svg, .dash')!.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('completa: anillo, relleno y visto', () => {
    const root = create('complete');

    expect(root.querySelector('.ring')).not.toBeNull();
    expect(root.querySelector('.fill circle')).not.toBeNull();
    expect(root.querySelector('.fill path')).not.toBeNull();
  });

  it('en curso: anillo y medio círculo lleno', () => {
    const root = create('in_progress');

    expect(root.querySelector('.ring')).not.toBeNull();
    expect(root.querySelector('.fill.half')).not.toBeNull();
    expect(root.querySelector('.fill circle')).toBeNull();
  });

  it('pendiente: solo el anillo', () => {
    const root = create('pending');

    expect(root.querySelector('.ring')).not.toBeNull();
    expect(root.querySelector('.fill')).toBeNull();
  });

  it('sin mesa: una raya, sin círculo', () => {
    const root = create('no_table');

    expect(root.querySelector('.dash')).not.toBeNull();
    expect(root.querySelector('svg')).toBeNull();
  });

  it('el estado queda en un atributo del host', () => {
    expect(create('pending').getAttribute('data-status')).toBe('pending');
  });

  it('escalona el trazado con su columna y su fila', () => {
    const root = create('complete', { column: 2, row: 3 });

    expect(root.style.getPropertyValue('--c')).toBe('2');
    expect(root.style.getPropertyValue('--f')).toBe('3');
  });

  it('se traza al cargar salvo que se pida quieta, y es de 22 px salvo la chica', () => {
    expect(create('complete').getAttribute('data-animated')).toBe('true');
    expect(create('complete', { animated: false }).getAttribute('data-animated')).toBe('false');
    expect(create('complete').getAttribute('data-size')).toBe('default');
    expect(create('complete', { size: 'small' }).getAttribute('data-size')).toBe('small');
  });
});

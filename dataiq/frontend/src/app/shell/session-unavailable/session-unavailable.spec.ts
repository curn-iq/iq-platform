import { TestBed } from '@angular/core/testing';
import { SessionUnavailable } from './session-unavailable';

describe('SessionUnavailable', () => {
  function create(busy = false) {
    const fixture = TestBed.createComponent(SessionUnavailable);
    fixture.componentRef.setInput('busy', busy);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, button: root.querySelector('button')! };
  }

  it('dice que no se pudo comprobar la sesión y que la página se abre cuando responda el servidor', () => {
    const { root } = create();

    expect(root.querySelector('.title')!.textContent).toBe('No se pudo comprobar la sesión.');
    expect(root.querySelector('.hint')!.textContent).toBe(
      'Se vuelve a intentar sola y la página se abre en cuanto responda el servidor.',
    );
  });

  it('se anuncia a los lectores de pantalla sin interrumpirlos', () => {
    const { root } = create();

    expect(root.getAttribute('role')).toBe('status');
  });

  it('«Reintentar» pide volver a comprobar', () => {
    const { fixture, button } = create();
    const retries = vi.fn();
    fixture.componentInstance.retry.subscribe(retries);

    expect(button.textContent!.trim()).toBe('Reintentar');
    button.click();

    expect(retries).toHaveBeenCalledTimes(1);
  });

  it('mientras vuelve a comprobar dice que está ocupado, sin esconder el botón', () => {
    const idle = create(false);
    expect(idle.button.getAttribute('aria-busy')).toBe('false');

    const busy = create(true);
    expect(busy.button.getAttribute('aria-busy')).toBe('true');
    expect(busy.root.contains(busy.button)).toBe(true);
  });
});

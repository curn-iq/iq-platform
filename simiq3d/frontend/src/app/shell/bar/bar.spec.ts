import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideRepositoryTesting } from '../../data/testing';
import { SessionService } from '../../core/session/session.service';
import { Bar } from './bar';

describe('Bar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideRepositoryTesting()] });
  });

  async function render() {
    const session = TestBed.inject(SessionService);
    vi.spyOn(session, 'account').mockReturnValue({
      id: 'u-1',
      name: 'Usuario de prueba',
      email: 'usuario@example.com',
      role: 'user',
    } as never);
    const fixture = TestBed.createComponent(Bar);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('«Mi cuenta» despliega quién es, su rol y «Cerrar sesión», y se cierra con Escape', async () => {
    const bar = await render();
    const button = bar.querySelector<HTMLButtonElement>('.account')!;
    expect(bar.querySelector('.panel')).toBeNull();

    button.click();
    await TestBed.inject(ApplicationRef).whenStable();
    const panel = bar.querySelector('.panel')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(panel.textContent).toContain('Usuario de prueba');
    expect(panel.textContent).toContain('usuario@example.com');
    expect(panel.textContent).toContain('Usuario');
    expect(panel.textContent).toContain('Cerrar sesión');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await TestBed.inject(ApplicationRef).whenStable();
    expect(bar.querySelector('.panel')).toBeNull();
  });
});

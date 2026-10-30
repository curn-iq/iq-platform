import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { handledByRouter } from '../testing';
import { NavLink } from './nav-link';
import type { NavTarget } from './nav-menus';

@Component({ template: '' })
class Blank {}

@Component({
  imports: [NavLink],
  template: `<a [appNavLink]="target()">Enlace</a>`,
})
class Host {
  readonly target = signal<NavTarget>({ route: '/' });
}

describe('NavLink', () => {
  let fixture: ComponentFixture<Host>;
  let router: Router;

  const anchor = () => (fixture.nativeElement as HTMLElement).querySelector('a')!;
  async function point(target: NavTarget): Promise<void> {
    fixture.componentInstance.target.set(target);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('una ruta lleva su fragmento y sus parámetros en el href', async () => {
    await point({ route: '/', fragment: 'preguntas' });
    expect(anchor().getAttribute('href')).toBe('/#preguntas');

    await point({ route: '/tecnicas', queryParams: { especialidad: 'e-1' } });
    expect(anchor().getAttribute('href')).toBe('/tecnicas?especialidad=e-1');
  });

  it('una ruta la abre el router', async () => {
    await point({ route: '/tecnicas', queryParams: { especialidad: 'e-1' } });

    expect(handledByRouter(anchor())).toBe(true);
    await vi.waitFor(() => expect(router.url).toBe('/tecnicas?especialidad=e-1'));
  });

  it('otra app va tal cual en el href y se abre con navegación completa', async () => {
    await point({ href: '/simiq3d/' });

    expect(anchor().getAttribute('href')).toBe('/simiq3d/');
    expect(handledByRouter(anchor())).toBe(false);
  });

  it('con una tecla modificadora o con otro botón, el clic queda para el navegador', async () => {
    await point({ route: '/tecnicas' });
    // Como `handledByRouter`, pero con el clic que se pida.
    const handled = (init: MouseEventInit) => {
      let prevented = false;
      const observe = (event: Event) => {
        prevented = event.defaultPrevented;
        event.preventDefault();
      };
      document.addEventListener('click', observe);
      anchor().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
      document.removeEventListener('click', observe);
      return prevented;
    };

    expect(
      [
        { ctrlKey: true },
        { metaKey: true },
        { shiftKey: true },
        { altKey: true },
        { button: 1 },
      ].map(handled),
    ).toEqual([false, false, false, false, false]);
    await fixture.whenStable();
    expect(router.url).toBe('/');
  });
});

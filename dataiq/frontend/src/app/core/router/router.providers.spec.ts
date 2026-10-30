import { ViewportScroller } from '@angular/common';
import { ApplicationRef, Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';
import { provideAppRouter } from './router.providers';

@Component({ template: '<section id="camino"></section><section id="preguntas"></section>' })
class Home {}

@Component({ template: '' })
class Catalog {}

@Component({ selector: 'test-root', imports: [RouterOutlet], template: '<router-outlet />' })
class Root {}

// El router solo empieza a bajar a los fragmentos cuando la app arranca de verdad
// (`bootstrap`), no con `TestBed`; por eso se arranca una app mínima.
describe('provideAppRouter', () => {
  let app: ApplicationRef;
  let router: Router;
  let scrollToAnchor: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    document.body.appendChild(document.createElement('test-root'));
    app = await bootstrapApplication(Root, {
      providers: [
        provideAppRouter([
          { path: '', component: Home },
          { path: 'tecnicas', component: Catalog },
        ]),
      ],
    });
    router = app.injector.get(Router);
    await router.navigateByUrl('/');
    scrollToAnchor = vi
      .spyOn(app.injector.get(ViewportScroller), 'scrollToAnchor')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    app.destroy();
    document.querySelector('test-root')?.remove();
  });

  it('baja hasta la sección del fragmento', async () => {
    await router.navigateByUrl('/#camino');

    await vi.waitFor(() => expect(scrollToAnchor).toHaveBeenCalledWith('camino'));
  });

  it('desde otra página, va al inicio y baja a su sección', async () => {
    await router.navigateByUrl('/tecnicas');

    await router.navigateByUrl('/#preguntas');

    expect(router.url).toBe('/#preguntas');
    await vi.waitFor(() => expect(scrollToAnchor).toHaveBeenCalledWith('preguntas'));
  });

  it('tocar otra vez el mismo enlace vuelve a bajar a la sección', async () => {
    await router.navigateByUrl('/#camino');
    await vi.waitFor(() => expect(scrollToAnchor).toHaveBeenCalledTimes(1));

    await router.navigateByUrl('/#camino');

    await vi.waitFor(() => expect(scrollToAnchor).toHaveBeenCalledTimes(2));
  });

  it('una ruta sin fragmento no baja a ninguna sección', async () => {
    await router.navigateByUrl('/tecnicas');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(scrollToAnchor).not.toHaveBeenCalled();
  });
});

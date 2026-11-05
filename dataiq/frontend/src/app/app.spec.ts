import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { NoticeService } from './core/notice/notice.service';
import { SessionService } from './core/session/session.service';
import { provideRepositoryTesting, TEST_API_BASE } from './data/testing';
import { provideShellHost } from './shell/shell-host';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideRepositoryTesting(), provideShellHost()],
    }).compileComponents();
  });

  /** Crea la app y responde las especialidades del pie, que si no mantienen la app inestable. */
  async function render() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .match(() => true)
      .forEach((request) => request.flush([]));
    await fixture.whenStable();
    return fixture;
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('pone la barra arriba, el contenido de la ruta en medio y el pie abajo', async () => {
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(Array.from(compiled.children).map((e) => e.tagName.toLowerCase())).toEqual([
      'app-navbar',
      'main',
      'app-footer',
      'app-notice-stack',
    ]);
    expect(compiled.querySelector('main router-outlet')).not.toBeNull();
  });

  it('muestra los avisos de NoticeService y cerrar uno lo quita del servicio', async () => {
    const fixture = await render();
    const notices = TestBed.inject(NoticeService);
    const compiled = fixture.nativeElement as HTMLElement;

    notices.show('error', ['No hay permiso para esta acción.']);
    await fixture.whenStable();
    expect(compiled.querySelector('[role="alert"] .error')?.textContent).toContain(
      'No hay permiso para esta acción.',
    );

    compiled.querySelector<HTMLButtonElement>('.close')!.click();
    await fixture.whenStable();
    expect(notices.notices()).toEqual([]);
    expect(compiled.querySelector('.error')).toBeNull();
  });

  describe('cuando no se pudo comprobar la sesión de una ruta protegida', () => {
    const unavailable = { status: 503, statusText: 'Service Unavailable' };

    /** Una ruta protegida espera, y la API no responde. */
    async function waitingRoute() {
      const fixture = await render();
      const session = TestBed.inject(SessionService);
      const http = TestBed.inject(HttpTestingController);
      const waiting = session.verified().subscribe();
      http.expectOne(`${TEST_API_BASE}/auth/me`).flush(null, unavailable);
      await vi.waitFor(() => expect(session.verificationBlocked()).toBe(true));
      await fixture.whenStable();
      return { fixture, session, http, waiting, root: fixture.nativeElement as HTMLElement };
    }

    afterEach(() => TestBed.inject(HttpTestingController).match(() => true));

    it('sin ninguna ruta esperando, no hay aviso', async () => {
      const fixture = await render();

      expect((fixture.nativeElement as HTMLElement).querySelector('app-session-unavailable')).toBe(
        null,
      );
    });

    it('lo dice arriba de lo que muestre la ruta y ofrece reintentar', async () => {
      const { root, waiting } = await waitingRoute();

      const notice = root.querySelector('main > app-session-unavailable')!;
      expect(notice.textContent).toContain('No se pudo comprobar la sesión.');
      expect(notice.nextElementSibling?.tagName.toLowerCase()).toBe('router-outlet');
      waiting.unsubscribe();
    });

    it('«Reintentar» vuelve a comprobar la sesión, y al responder el aviso se va', async () => {
      const { fixture, http, root, session } = await waitingRoute();

      root.querySelector<HTMLButtonElement>('app-session-unavailable button')!.click();
      http.expectOne(`${TEST_API_BASE}/auth/me`).flush({
        id: 'u-1',
        name: 'Ana',
        email: 'ana@example.com',
        role: 'user',
      });
      await vi.waitFor(() => expect(session.verificationBlocked()).toBe(false));
      await fixture.whenStable();

      expect(root.querySelector('app-session-unavailable')).toBeNull();
    });

    it('mientras vuelve a comprobar, el botón dice que está ocupado', async () => {
      const { fixture, root, waiting } = await waitingRoute();

      root.querySelector<HTMLButtonElement>('app-session-unavailable button')!.click();
      await fixture.whenStable();

      expect(root.querySelector('app-session-unavailable button')!.getAttribute('aria-busy')).toBe(
        'true',
      );
      waiting.unsubscribe();
    });

    it('si la ruta se cancela, el aviso se va', async () => {
      const { fixture, root, waiting } = await waitingRoute();

      waiting.unsubscribe();
      await fixture.whenStable();

      expect(root.querySelector('app-session-unavailable')).toBeNull();
    });
  });
});

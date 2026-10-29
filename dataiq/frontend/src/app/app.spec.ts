import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { NoticeService } from './core/notice/notice.service';
import { provideRepositoryTesting } from './data/testing';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideRepositoryTesting()],
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
});

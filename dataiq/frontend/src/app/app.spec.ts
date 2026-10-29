import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { NoticeService } from './core/notice/notice.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('deja el contenido de la ruta en su salida', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main router-outlet')).not.toBeNull();
  });

  it('muestra los avisos de NoticeService y cerrar uno lo quita del servicio', async () => {
    const fixture = TestBed.createComponent(App);
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

import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideRepositoryTesting, TEST_DATAIQ } from './data/testing';
import { provideShellHost } from './shell/shell-host';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideRepositoryTesting(), provideShellHost()],
    }).compileComponents();
  });

  it('pone la barra arriba y las pantallas en `.content`, debajo', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(Array.from(root.children).map((e) => e.tagName.toLowerCase())).toEqual([
      'app-navbar',
      'main',
    ]);
    const content = root.querySelector('main')!;
    expect(content.classList.contains('content')).toBe(true);
    expect(content.querySelector('router-outlet')).not.toBeNull();
  });

  it('al arrancar pregunta si hay sesión, aunque la ruta sea pública', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    TestBed.inject(HttpTestingController).expectOne(`${TEST_DATAIQ}/auth/me`);
  });
});

import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Layout } from './core/layout/layout';
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

  it('pone el enlace para saltar, la barra y las pantallas en `.content`, en ese orden', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(Array.from(root.children).map((e) => e.tagName.toLowerCase())).toEqual([
      'a',
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

  it('la cámara va sin la barra del shell', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(Layout).immersive.set(true);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-navbar')).toBeNull();
    expect(root.querySelector('main.content')).not.toBeNull();
  });

  it('ofrece saltar la barra y lleva el foco a la pantalla', async () => {
    const fixture = TestBed.createComponent(App);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLAnchorElement>('a.skip')!.click();
    expect(document.activeElement).toBe(root.querySelector('main'));
    root.remove();
  });
});

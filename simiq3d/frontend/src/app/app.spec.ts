import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideRepositoryTesting } from './data/testing';
import { provideShellHost } from './shell/shell-host';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideRepositoryTesting(), provideShellHost()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('pone la barra arriba y la ruta abierta debajo', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(Array.from(compiled.children).map((e) => e.tagName.toLowerCase())).toEqual([
      'app-navbar',
      'router-outlet',
    ]);
  });
});

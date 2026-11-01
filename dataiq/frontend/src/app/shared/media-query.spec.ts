import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mediaQuery } from './media-query';

@Component({ template: '' })
class Host {
  readonly narrow = mediaQuery('(max-width: 760px)');
}

describe('mediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('es falso sin matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(TestBed.createComponent(Host).componentInstance.narrow()).toBe(false);
  });

  it('parte de lo que dice la consulta y sigue sus cambios', () => {
    let listener: ((event: MediaQueryListEvent) => void) | null = null;
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => (listener = fn),
      removeEventListener: () => (listener = null),
    }));
    const fixture = TestBed.createComponent(Host);
    expect(fixture.componentInstance.narrow()).toBe(true);

    listener!({ matches: false } as MediaQueryListEvent);
    expect(fixture.componentInstance.narrow()).toBe(false);

    fixture.destroy();
    expect(listener).toBeNull();
  });
});

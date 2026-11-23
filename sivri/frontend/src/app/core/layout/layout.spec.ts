import { TestBed } from '@angular/core/testing';
import { Layout } from './layout';

describe('Layout', () => {
  it('por defecto la barra del shell se ve', () => {
    expect(TestBed.inject(Layout).immersive()).toBe(false);
  });
});

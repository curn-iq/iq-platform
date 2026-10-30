import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';

@Component({
  imports: [Button],
  template: `
    <a app-button id="primary" href="/tecnicas">Ver</a>
    <button app-button id="soft" variant="soft" type="button">Cancelar</button>
    <a app-button id="ghost" variant="ghost" size="large" href="/cuenta/ingresar">Ingresar</a>
  `,
})
class Host {}

describe('Button', () => {
  let root: HTMLElement;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    root = fixture.nativeElement;
  });

  it('es el primario si no se dice otra cosa', () => {
    expect(root.querySelector('#primary')?.getAttribute('data-variant')).toBe('primary');
  });

  it('el suave y el fantasma se piden con variant', () => {
    expect(root.querySelector('#soft')?.getAttribute('data-variant')).toBe('soft');
    expect(root.querySelector('#ghost')?.getAttribute('data-variant')).toBe('ghost');
  });

  it('el tamaño es el normal si no se dice otra cosa, y el grande se pide con size', () => {
    expect(root.querySelector('#primary')?.getAttribute('data-size')).toBe('default');
    expect(root.querySelector('#ghost')?.getAttribute('data-size')).toBe('large');
  });

  it('conserva su texto y sigue siendo un enlace o un botón nativo', () => {
    expect(root.querySelector('a#primary')?.textContent).toBe('Ver');
    expect(root.querySelector('button#soft')?.textContent).toBe('Cancelar');
  });
});

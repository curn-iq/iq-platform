import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DrawingParts } from './drawing-parts';
import { DRAWINGS } from './drawings';

@Component({
  imports: [DrawingParts],
  template: '<svg><g app-drawing-parts [parts]="parts" /></svg>',
})
class Host {
  parts = DRAWINGS.scalpel.parts;
}

describe('DrawingParts', () => {
  it('pinta cada parte como un elemento SVG con la clase de su material', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const painted = Array.from(root.querySelectorAll('g[app-drawing-parts] > *'));

    expect(painted.length).toBe(DRAWINGS.scalpel.parts.length);
    expect(painted.map((element) => element.getAttribute('class'))).toEqual(
      DRAWINGS.scalpel.parts.map((part) => part.style),
    );
    // Están en el espacio de nombres de SVG: si no, el navegador no las dibujaría
    expect(painted.every((element) => element instanceof SVGElement)).toBe(true);
  });

  it('pinta rutas, rectángulos y círculos', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.parts = [
      { shape: 'path', style: 'steel', d: 'M0 0L1 1', evenodd: true },
      { shape: 'rect', style: 'box', x: 1, y: 2, width: 3, height: 4, rx: 1 },
      { shape: 'circle', style: 'cloth', cx: 5, cy: 6, r: 7 },
    ];
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('path.steel')?.getAttribute('fill-rule')).toBe('evenodd');
    expect(root.querySelector('rect.box')?.getAttribute('width')).toBe('3');
    expect(root.querySelector('circle.cloth')?.getAttribute('r')).toBe('7');
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SteelGradients } from './steel-gradients';

@Component({
  imports: [SteelGradients],
  template: '<svg><defs app-steel-gradients steelId="acero-1" bladeId="hoja-1" /></svg>',
})
class Host {}

describe('SteelGradients', () => {
  it('define el degradado del acero y el de la hoja con los ids que recibe', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('linearGradient.steel-gradient')?.id).toBe('acero-1');
    expect(root.querySelector('linearGradient.blade-gradient')?.id).toBe('hoja-1');
    expect(root.querySelectorAll('linearGradient.steel-gradient stop').length).toBe(5);
    expect(root.querySelectorAll('linearGradient.blade-gradient stop').length).toBe(3);
  });
});

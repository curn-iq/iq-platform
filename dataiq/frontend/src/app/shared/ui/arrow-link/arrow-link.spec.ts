import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArrowLink } from './arrow-link';

@Component({
  imports: [ArrowLink],
  template:
    '<a app-arrow-link href="/tecnicas" [direction]="direction()">Ver todas las técnicas</a>',
})
class Host {
  direction = signal<'right' | 'down'>('right');
}

describe('ArrowLink', () => {
  async function mount(direction: 'right' | 'down' = 'right') {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.direction.set(direction);
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
  }

  it('muestra el texto y una flecha decorativa, y conserva el enlace', async () => {
    const link = await mount();

    expect(link.textContent!.trim()).toBe('Ver todas las técnicas');
    expect(link.getAttribute('href')).toBe('/tecnicas');
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('por omisión la flecha va a la derecha', async () => {
    const link = await mount();

    expect(link.getAttribute('data-direction')).toBe('right');
    expect(link.querySelector('path')?.getAttribute('d')).toBe('M3 8h9M8.5 4L12.5 8l-4 4');
  });

  it('también puede apuntar hacia abajo, para bajar a una sección', async () => {
    const link = await mount('down');

    expect(link.getAttribute('data-direction')).toBe('down');
    expect(link.querySelector('path')?.getAttribute('d')).toBe('M8 2.5v10M3.5 8.5L8 13l4.5-4.5');
  });
});

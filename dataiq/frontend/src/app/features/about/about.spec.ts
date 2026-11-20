import { TestBed } from '@angular/core/testing';
import { About } from './about';

describe('About', () => {
  it('muestra el titular «Nosotros»', () => {
    const fixture = TestBed.createComponent(About);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Nosotros');
  });
});

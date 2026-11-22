import { TestBed } from '@angular/core/testing';
import { BrandMark } from './brand-mark';

describe('BrandMark', () => {
  it('dibuja la mesa de Mayo de 44 px y es decorativa', () => {
    const fixture = TestBed.createComponent(BrandMark);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const svg = root.querySelector('svg')!;

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('width')).toBe('44');
    expect(svg.getAttribute('viewBox')).toBe('24 24 150 150');
    // Bandeja con su canto, paño, poste, base y cuatro ruedas: los nueve trazos del isotipo
    expect(svg.querySelectorAll('path')).toHaveLength(9);
    expect(svg.querySelectorAll('.wheel')).toHaveLength(4);
    expect(root.querySelector('.tile')).toBeNull();
  });
});

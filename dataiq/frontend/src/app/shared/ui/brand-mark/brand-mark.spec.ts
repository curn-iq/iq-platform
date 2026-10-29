import { TestBed } from '@angular/core/testing';
import { BrandMark } from './brand-mark';

describe('BrandMark', () => {
  it('dibuja la marca de 30 px y es decorativa', () => {
    const fixture = TestBed.createComponent(BrandMark);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('svg')!.getAttribute('width')).toBe('30');
    expect(root.querySelector('.tile')).not.toBeNull();
  });
});

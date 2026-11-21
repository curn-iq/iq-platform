import { TestBed } from '@angular/core/testing';
import { TEAM } from '../about-photos';
import { Portrait } from './portrait';

describe('Portrait', () => {
  const member = TEAM[1].members[0];
  let root: HTMLElement;

  beforeEach(() => {
    const fixture = TestBed.createComponent(Portrait);
    fixture.componentRef.setInput('member', member);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  it('muestra el nombre y la carrera bajo la foto', () => {
    expect(root.querySelector('.name')!.textContent).toBe('Juan José Caraballo Nieves');
    expect(root.querySelector('.career')!.textContent).toBe('Ingeniería de Sistemas');
  });

  it('la foto es 4:5, perezosa, con sus dos anchos, y no repite el nombre al lector de pantalla', () => {
    const img = root.querySelector('img')!;

    expect(img.getAttribute('width')).toBe('840');
    expect(img.getAttribute('height')).toBe('1050');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('srcset')).toBe(
      '/nosotros/caraballo-480.webp 480w, /nosotros/caraballo-840.webp 840w',
    );
  });

  it('no es un enlace ni recibe el foco', () => {
    expect(root.querySelector('a, button, [tabindex]')).toBeNull();
  });
});

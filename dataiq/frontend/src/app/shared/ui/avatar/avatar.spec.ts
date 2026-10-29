import { TestBed } from '@angular/core/testing';
import { Avatar } from './avatar';

describe('Avatar', () => {
  function create(name: string, size?: 'small' | 'medium') {
    const fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('name', name);
    if (size) fixture.componentRef.setInput('size', size);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra las iniciales del nombre', () => {
    expect(create('Daniela Ortiz').textContent).toBe('DO');
  });

  it('es decorativo: los lectores de pantalla lo saltan', () => {
    expect(create('Daniela Ortiz').getAttribute('aria-hidden')).toBe('true');
  });

  it('es pequeño si no se dice otra cosa, y mediano se pide con size', () => {
    expect(create('Daniela Ortiz').getAttribute('data-size')).toBe('small');
    expect(create('Daniela Ortiz', 'medium').getAttribute('data-size')).toBe('medium');
  });
});

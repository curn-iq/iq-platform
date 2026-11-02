import { TestBed } from '@angular/core/testing';
import { FieldError } from './field-error';

describe('FieldError', () => {
  function create(message: string) {
    const fixture = TestBed.createComponent(FieldError);
    fixture.componentRef.setInput('message', message);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('dice el mensaje', () => {
    expect(create('Escribir el nombre.').textContent!.trim()).toBe('Escribir el nombre.');
  });

  it('se anuncia a los lectores de pantalla en cuanto aparece', () => {
    expect(create('Escribir el nombre.').getAttribute('role')).toBe('alert');
  });

  it('lleva el círculo de alerta, decorativo: el error no se dice con color', () => {
    const icon = create('x').querySelector('svg')!;

    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });
});

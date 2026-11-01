import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField, validate } from '@angular/forms/signals';
import { CheckboxField } from './checkbox-field';

@Component({
  imports: [CheckboxField, FormField],
  template: `
    <app-checkbox-field [formField]="terms.accepted">
      Acepto los <a href="/terminos">términos</a>.
    </app-checkbox-field>
  `,
})
class Host {
  readonly model = signal({ accepted: false });
  readonly terms = form(this.model, (path) => {
    validate(path.accepted, ({ value }) =>
      value() ? undefined : { kind: 'accepted', message: 'Hay que aceptar los términos.' },
    );
  });
}

describe('CheckboxField', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const root = () => fixture.nativeElement as HTMLElement;
  const box = () => root().querySelector('input')!;
  const error = () => root().querySelector('app-field-error');

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('es una casilla con el texto que se le pone dentro, enlaces incluidos', () => {
    expect(box().type).toBe('checkbox');
    expect(root().querySelector('label')!.textContent).toContain('Acepto los términos.');
    expect(root().querySelector('label a')!.getAttribute('href')).toBe('/terminos');
  });

  it('empieza sin marcar', () => {
    expect(box().checked).toBe(false);
  });

  it('marcarla llega al modelo, y desmarcarla también', async () => {
    box().click();
    await fixture.whenStable();
    expect(host.model().accepted).toBe(true);

    box().click();
    await fixture.whenStable();
    expect(host.model().accepted).toBe(false);
  });

  it('lo que cambia en el modelo llega a la casilla', async () => {
    host.model.set({ accepted: true });
    await fixture.whenStable();

    expect(box().checked).toBe(true);
  });

  it('tocar el texto la marca, pero tocar su enlace no', async () => {
    root().querySelector<HTMLElement>('.text')!.click();
    await fixture.whenStable();
    expect(host.model().accepted).toBe(true);

    const link = root().querySelector<HTMLAnchorElement>('label a')!;
    link.addEventListener('click', (event) => event.preventDefault());
    link.click();
    await fixture.whenStable();
    expect(host.model().accepted).toBe(true);
  });

  it('al perder el foco, el formulario la marca como tocada', async () => {
    expect(host.terms.accepted().touched()).toBe(false);

    box().dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(host.terms.accepted().touched()).toBe(true);
  });

  describe('error', () => {
    it('mientras no se toca no dice nada', () => {
      expect(error()).toBeNull();
      expect(box().getAttribute('aria-invalid')).toBeNull();
    });

    it('una vez tocada y sin marcar, lo dice bajo el texto y la caja queda inválida', async () => {
      host.terms.accepted().markAsTouched();
      await fixture.whenStable();

      expect(error()!.textContent!.trim()).toBe('Hay que aceptar los términos.');
      expect(box().getAttribute('aria-invalid')).toBe('true');
      expect(box().getAttribute('aria-describedby')).toBe(error()!.id);
    });

    it('al marcarla, el error se va', async () => {
      host.terms.accepted().markAsTouched();
      box().click();
      await fixture.whenStable();

      expect(error()).toBeNull();
      expect(box().getAttribute('aria-invalid')).toBeNull();
    });
  });
});

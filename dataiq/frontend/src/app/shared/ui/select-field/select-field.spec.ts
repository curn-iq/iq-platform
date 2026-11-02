import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, required } from '@angular/forms/signals';
import { SelectField, type SelectOption } from './select-field';

const OPTIONS: SelectOption[] = [
  { value: 's-1', label: 'Cirugía general' },
  { value: 's-2', label: 'Urología' },
];

@Component({
  imports: [SelectField],
  template: `<app-select-field
    label="Especialidad"
    placeholder="Elegir especialidad"
    [badge]="badge()"
    [disabled]="disabled()"
    [options]="options"
    [value]="value()"
    (valueChange)="value.set($event)"
    (touch)="touched = touched + 1"
  />`,
})
class Host {
  options = OPTIONS;
  value = signal('');
  badge = signal('Falta');
  disabled = signal(false);
  touched = 0;
}

@Component({
  imports: [SelectField, FormField],
  template: `<app-select-field
    label="Especialidad"
    placeholder="Elegir especialidad"
    [options]="options"
    [formField]="technique.specialty"
  />`,
})
class FormHost {
  options = OPTIONS;
  model = signal({ specialty: '' });
  technique = form(this.model, (path) => {
    required(path.specialty, { message: 'Elegir la especialidad.' });
  });
}

describe('SelectField', () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, select: () => root.querySelector('select')! };
  }

  it('lleva su etiqueta enlazada y, primero, el texto vacío', async () => {
    const { root, select } = await mount();

    const label = root.querySelector('label')!;
    expect(label.getAttribute('for')).toBe(select().id);
    expect(label.textContent!.replace(/\s+/g, ' ').trim()).toBe('Especialidad Falta');
    expect(
      Array.from(select().options).map((option) => [option.value, option.textContent!.trim()]),
    ).toEqual([
      ['', 'Elegir especialidad'],
      ['s-1', 'Cirugía general'],
      ['s-2', 'Urología'],
    ]);
  });

  it('mientras no hay nada elegido se marca como vacío; con algo elegido, no', async () => {
    const { fixture, select } = await mount();
    expect(select().classList.contains('empty')).toBe(true);

    fixture.componentInstance.value.set('s-2');
    await fixture.whenStable();

    expect(select().value).toBe('s-2');
    expect(select().classList.contains('empty')).toBe(false);
  });

  it('al elegir una opción avisa con su valor', async () => {
    const { fixture, select } = await mount();

    select().value = 's-1';
    select().dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('s-1');
  });

  it('elegir de nuevo el texto vacío deja el selector sin elegir', async () => {
    const { fixture, select } = await mount();
    fixture.componentInstance.value.set('s-1');
    await fixture.whenStable();

    select().value = '';
    select().dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('');
  });

  it('avisa cuando pierde el foco', async () => {
    const { fixture, select } = await mount();

    select().dispatchEvent(new Event('blur'));

    expect(fixture.componentInstance.touched).toBe(1);
  });

  it('sin texto de pastilla no hay pastilla', async () => {
    const { fixture, root } = await mount();

    fixture.componentInstance.badge.set('');
    await fixture.whenStable();

    expect(root.querySelector('.badge')).toBeNull();
  });

  it('deshabilitado se ve lo elegido y no se puede cambiar', async () => {
    const { fixture, select } = await mount();
    fixture.componentInstance.value.set('s-2');
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(select().disabled).toBe(true);
    expect(select().value).toBe('s-2');
  });

  it('la flecha es decorativa', async () => {
    const { root } = await mount();

    expect(root.querySelector('.arrow')!.getAttribute('aria-hidden')).toBe('true');
  });

  describe('con Signal Forms', () => {
    it('lleva la elección al modelo y dice el error solo una vez tocado', async () => {
      const fixture = TestBed.createComponent(FormHost);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      const select = root.querySelector('select')!;
      expect(root.querySelector('app-field-error')).toBeNull();

      select.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
      expect(root.querySelector('app-field-error')!.textContent).toContain(
        'Elegir la especialidad.',
      );
      expect(select.getAttribute('aria-invalid')).toBe('true');

      select.value = 's-2';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.whenStable();

      expect(fixture.componentInstance.model().specialty).toBe('s-2');
      expect(root.querySelector('app-field-error')).toBeNull();
    });
  });
});

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { TextareaField } from './textarea-field';

@Component({
  imports: [TextareaField],
  template: `<app-textarea-field
    label="Para qué sirve"
    placeholder="En qué consiste el procedimiento."
    [badge]="badge()"
    [optional]="optional()"
    [readonly]="readonly()"
    [tall]="tall()"
    [(value)]="value"
    (touch)="touched = touched + 1"
  />`,
})
class Host {
  readonly badge = signal('Falta');
  readonly optional = signal(false);
  readonly readonly = signal(false);
  readonly tall = signal(false);
  readonly value = signal('');
  touched = 0;
}

@Component({
  imports: [TextareaField, FormField],
  template: `<app-textarea-field label="Indicaciones" [formField]="technique.indications" />`,
})
class FormHost {
  readonly model = signal({ indications: '' });
  readonly technique = form(this.model);
}

describe('TextareaField', () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, area: () => root.querySelector('textarea')! };
  }

  const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim();

  it('lleva su etiqueta enlazada y su texto de ayuda', async () => {
    const { root, area } = await mount();

    expect(root.querySelector('label')!.getAttribute('for')).toBe(area().id);
    expect(text(root.querySelector('label'))).toBe('Para qué sirve Falta');
    expect(area().placeholder).toBe('En qué consiste el procedimiento.');
  });

  it('sin texto de pastilla no hay pastilla', async () => {
    const { fixture, root } = await mount();

    fixture.componentInstance.badge.set('');
    await fixture.whenStable();

    expect(root.querySelector('.badge')).toBeNull();
  });

  it('«Opcional» es texto, no pastilla, y gana a la pastilla', async () => {
    const { fixture, root } = await mount();

    fixture.componentInstance.optional.set(true);
    await fixture.whenStable();

    expect(root.querySelector('.optional')!.textContent).toBe('Opcional');
    expect(root.querySelector('.badge')).toBeNull();
  });

  it('al escribir avisa con [(value)]', async () => {
    const { fixture, area } = await mount();

    area().value = 'Extirpar la vesícula.\nEn un tiempo.';
    area().dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('Extirpar la vesícula.\nEn un tiempo.');
  });

  it('muestra lo que cambie fuera del campo', async () => {
    const { fixture, area } = await mount();

    fixture.componentInstance.value.set('Desde fuera');
    await fixture.whenStable();

    expect(area().value).toBe('Desde fuera');
  });

  it('avisa cuando pierde el foco', async () => {
    const { fixture, area } = await mount();

    area().dispatchEvent(new Event('blur'));

    expect(fixture.componentInstance.touched).toBe(1);
  });

  it('en solo lectura se ve el texto y no se puede cambiar', async () => {
    const { fixture, area } = await mount();
    fixture.componentInstance.value.set('Texto');

    fixture.componentInstance.readonly.set(true);
    await fixture.whenStable();

    expect(area().readOnly).toBe(true);
    expect(area().value).toBe('Texto');
  });

  it('`tall` pide la caja alta', async () => {
    const { fixture, area } = await mount();
    expect(area().classList.contains('tall')).toBe(false);

    fixture.componentInstance.tall.set(true);
    await fixture.whenStable();

    expect(area().classList.contains('tall')).toBe(true);
  });

  it('con Signal Forms lleva lo escrito al modelo', async () => {
    const fixture = TestBed.createComponent(FormHost);
    await fixture.whenStable();
    const area = (fixture.nativeElement as HTMLElement).querySelector('textarea')!;

    area.value = 'En casos de colelitiasis.';
    area.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.model().indications).toBe('En casos de colelitiasis.');
  });
});

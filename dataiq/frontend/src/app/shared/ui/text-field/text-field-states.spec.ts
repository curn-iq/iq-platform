import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TextField } from './text-field';

@Component({
  imports: [TextField],
  template: `<app-text-field
    label="Código CUPS"
    inputmode="numeric"
    [optional]="optional()"
    [badge]="badge()"
    [readonly]="readonly()"
    [(value)]="value"
  />`,
})
class Host {
  readonly optional = signal(false);
  readonly badge = signal('');
  readonly readonly = signal(false);
  readonly value = signal('511101');
}

describe('TextField, «Opcional», solo lectura y teclado', () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, input: () => root.querySelector('input')! };
  }

  it('«Opcional» es texto junto a la etiqueta, no una pastilla', async () => {
    const { fixture, root } = await mount();

    fixture.componentInstance.optional.set(true);
    await fixture.whenStable();

    expect(root.querySelector('.optional')!.textContent).toBe('Opcional');
    expect(root.querySelector('.badge')).toBeNull();
  });

  it('«Opcional» gana a la pastilla si vienen las dos', async () => {
    const { fixture, root } = await mount();

    fixture.componentInstance.optional.set(true);
    fixture.componentInstance.badge.set('Falta');
    await fixture.whenStable();

    expect(root.querySelector('.optional')).not.toBeNull();
    expect(root.querySelector('.badge')).toBeNull();
  });

  it('en solo lectura se ve el valor y no se puede cambiar', async () => {
    const { fixture, input } = await mount();

    expect(input().readOnly).toBe(false);
    fixture.componentInstance.readonly.set(true);
    await fixture.whenStable();

    expect(input().readOnly).toBe(true);
    expect(input().value).toBe('511101');
  });

  it('pide el teclado que se le dice', async () => {
    const { input } = await mount();

    expect(input().getAttribute('inputmode')).toBe('numeric');
  });
});

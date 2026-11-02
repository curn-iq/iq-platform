import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChipList } from './chip-list';

@Component({
  imports: [ChipList],
  template: `<app-chip-list
    label="Equipos biomédicos"
    inputLabel="Nuevo equipo"
    [names]="names()"
    [readonly]="readonly()"
    (added)="added.push($event)"
    (removed)="removed.push($event)"
  />`,
})
class Host {
  readonly names = signal(['Electrobisturí', 'Torre de laparoscopia']);
  readonly readonly = signal(false);
  readonly added: string[] = [];
  readonly removed: number[] = [];
}

describe('ChipList', () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      chips: () =>
        Array.from(root.querySelectorAll('.chip')).map((chip) =>
          chip.firstChild!.textContent!.trim(),
        ),
      input: () => root.querySelector<HTMLInputElement>('input.new'),
      addButton: () => root.querySelector<HTMLButtonElement>('button.add')!,
    };
  }

  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const key = (input: HTMLInputElement, name: string) =>
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
    );

  it('es un grupo con el nombre de la lista y una ficha por nombre', async () => {
    const { root, chips } = await mount();

    expect(root.querySelector('.label')!.textContent).toBe('Equipos biomédicos');
    expect(root.querySelector('[role="group"]')!.getAttribute('aria-labelledby')).toBe(
      root.querySelector('.label')!.id,
    );
    expect(chips()).toEqual(['Electrobisturí', 'Torre de laparoscopia']);
  });

  it('cada ficha tiene su botón de quitar, con su nombre', async () => {
    const { root } = await mount();

    expect(
      Array.from(root.querySelectorAll('.remove')).map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Quitar Electrobisturí', 'Quitar Torre de laparoscopia']);
  });

  it('quitar avisa con la posición de la ficha', async () => {
    const { root, host } = await mount();

    root.querySelectorAll<HTMLButtonElement>('.remove')[1].click();

    expect(host.removed).toEqual([1]);
  });

  describe('agregar', () => {
    it('«Agregar» abre una ficha para escribir, con su nombre para quien no la ve, y le da el foco', async () => {
      const { fixture, addButton, input } = await mount();
      expect(input()).toBeNull();

      addButton().click();
      await fixture.whenStable();

      expect(input()).not.toBeNull();
      expect(input()!.getAttribute('aria-label')).toBe('Nuevo equipo');
      expect(document.activeElement).toBe(input());
    });

    it('Enter fija lo escrito y avisa, y cierra la ficha', async () => {
      const { fixture, host, addButton, input } = await mount();
      addButton().click();
      await fixture.whenStable();

      type(input()!, '  Aspirador  ');
      key(input()!, 'Enter');
      await fixture.whenStable();

      expect(host.added).toEqual(['  Aspirador  ']);
      expect(input()).toBeNull();
    });

    it('salir del campo también fija lo escrito', async () => {
      const { fixture, host, addButton, input } = await mount();
      addButton().click();
      await fixture.whenStable();

      type(input()!, 'Aspirador');
      input()!.dispatchEvent(new Event('blur'));
      await fixture.whenStable();

      expect(host.added).toEqual(['Aspirador']);
    });

    it('Enter seguido de perder el foco avisa una sola vez', async () => {
      const { fixture, host, addButton, input } = await mount();
      addButton().click();
      await fixture.whenStable();

      type(input()!, 'Aspirador');
      const field = input()!;
      key(field, 'Enter');
      field.dispatchEvent(new Event('blur'));
      await fixture.whenStable();

      expect(host.added).toEqual(['Aspirador']);
    });

    it('Escape descarta lo escrito, aunque después se pierda el foco', async () => {
      const { fixture, host, addButton, input } = await mount();
      addButton().click();
      await fixture.whenStable();

      type(input()!, 'Aspirador');
      const field = input()!;
      key(field, 'Escape');
      field.dispatchEvent(new Event('blur'));
      await fixture.whenStable();

      expect(host.added).toEqual([]);
      expect(input()).toBeNull();
    });

    it('sin nada escrito, o solo espacios, no agrega nada', async () => {
      const { fixture, host, addButton, input } = await mount();
      addButton().click();
      await fixture.whenStable();

      type(input()!, '   ');
      key(input()!, 'Enter');
      await fixture.whenStable();

      expect(host.added).toEqual([]);
      expect(input()).toBeNull();
    });

    it('se puede agregar otro después', async () => {
      const { fixture, host, addButton, input } = await mount();
      for (const name of ['Uno', 'Dos']) {
        addButton().click();
        await fixture.whenStable();
        type(input()!, name);
        key(input()!, 'Enter');
        await fixture.whenStable();
      }

      expect(host.added).toEqual(['Uno', 'Dos']);
    });
  });

  describe('en solo lectura', () => {
    it('se ven las fichas, sin quitar ni agregar', async () => {
      const { fixture, host, root, chips } = await mount();

      host.readonly.set(true);
      await fixture.whenStable();

      expect(chips()).toEqual(['Electrobisturí', 'Torre de laparoscopia']);
      expect(root.querySelector('.remove')).toBeNull();
      expect(root.querySelector('.add')).toBeNull();
    });
  });
});

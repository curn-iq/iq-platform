import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField, validate } from '@angular/forms/signals';
import { TextField } from './text-field';

@Component({
  imports: [TextField, FormField],
  template: `
    <app-text-field
      label="Correo"
      type="email"
      autocomplete="email"
      placeholder="nombre@correo.com"
      [formField]="credentials.email"
    />
    <app-text-field
      label="Contraseña"
      type="password"
      autocomplete="current-password"
      revealable
      [formField]="credentials.password"
    />
  `,
})
class Host {
  readonly model = signal({ email: '', password: '' });
  readonly credentials = form(this.model, (path) => {
    validate(path.email, ({ value }) =>
      value().includes('@') ? undefined : { kind: 'email', message: 'Escribir un correo válido.' },
    );
  });
}

@Component({
  imports: [TextField],
  template: `<app-text-field label="Nombre de la técnica" [badge]="badge()" />`,
})
class BadgeHost {
  readonly badge = signal('Falta');
}

describe('TextField, con pastilla', () => {
  it('la pastilla va junto a la etiqueta, y sin texto no hay pastilla', async () => {
    const fixture = TestBed.createComponent(BadgeHost);
    await fixture.whenStable();
    const label = () => (fixture.nativeElement as HTMLElement).querySelector('label')!;

    expect(label().textContent!.replace(/\s+/g, ' ').trim()).toBe('Nombre de la técnica Falta');
    expect(label().querySelector('.badge')!.textContent).toBe('Falta');

    fixture.componentInstance.badge.set('');
    await fixture.whenStable();
    expect(label().querySelector('.badge')).toBeNull();
    expect(label().textContent!.trim()).toBe('Nombre de la técnica');
  });
});

describe('TextField', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const root = () => fixture.nativeElement as HTMLElement;
  const input = (index: number) => root().querySelectorAll('input')[index];
  const reveal = () => root().querySelector<HTMLButtonElement>('button');

  async function type(element: HTMLInputElement, value: string): Promise<void> {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('cada campo tiene su etiqueta enlazada a su caja, sin repetir ids', () => {
    const labels = Array.from(root().querySelectorAll('label'));

    expect(labels.map((label) => label.textContent!.trim())).toEqual(['Correo', 'Contraseña']);
    expect(labels[0].htmlFor).toBe(input(0).id);
    expect(labels[1].htmlFor).toBe(input(1).id);
    expect(input(0).id).not.toBe(input(1).id);
  });

  it('pasa el tipo, el autocompletado y el texto de ejemplo a la caja', () => {
    expect(input(0).type).toBe('email');
    expect(input(0).getAttribute('autocomplete')).toBe('email');
    expect(input(0).placeholder).toBe('nombre@correo.com');
    expect(input(1).type).toBe('password');
    expect(input(1).getAttribute('autocomplete')).toBe('current-password');
  });

  it('lo que se escribe llega al modelo del formulario', async () => {
    await type(input(0), 'ana@example.com');
    await type(input(1), 'secreta');

    expect(host.model()).toEqual({ email: 'ana@example.com', password: 'secreta' });
  });

  it('lo que cambia en el modelo llega a la caja', async () => {
    host.model.set({ email: 'luis@example.com', password: '' });
    await fixture.whenStable();

    expect(input(0).value).toBe('luis@example.com');
  });

  it('al perder el foco, el formulario marca el campo como tocado', async () => {
    expect(host.credentials.email().touched()).toBe(false);

    input(0).dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(host.credentials.email().touched()).toBe(true);
    expect(host.credentials.password().touched()).toBe(false);
  });

  describe('errores', () => {
    const error = () => root().querySelector('app-field-error');

    it('mientras no se toca el campo no dice nada, aunque no sea válido', () => {
      expect(host.credentials.email().invalid()).toBe(true);
      expect(error()).toBeNull();
      expect(input(0).getAttribute('aria-invalid')).toBeNull();
    });

    it('una vez tocado, dice qué corregir bajo la caja', async () => {
      host.credentials.email().markAsTouched();
      await fixture.whenStable();

      expect(error()!.textContent!.trim()).toBe('Escribir un correo válido.');
      expect(input(0).nextElementSibling).toBe(null);
      expect(root().querySelectorAll('app-text-field')[0].contains(error())).toBe(true);
    });

    it('la caja queda marcada como inválida y enlazada a su mensaje', async () => {
      host.credentials.email().markAsTouched();
      await fixture.whenStable();

      expect(input(0).getAttribute('aria-invalid')).toBe('true');
      expect(input(0).getAttribute('aria-describedby')).toBe(`${input(0).id}-error`);
      expect(error()!.id).toBe(`${input(0).id}-error`);
    });

    it('al corregirlo, el mensaje se va', async () => {
      host.credentials.email().markAsTouched();
      await type(input(0), 'ana@example.com');

      expect(error()).toBeNull();
      expect(input(0).getAttribute('aria-invalid')).toBeNull();
      expect(input(0).getAttribute('aria-describedby')).toBeNull();
    });

    it('un campo sin reglas no muestra nada al tocarlo', async () => {
      host.credentials.password().markAsTouched();
      await fixture.whenStable();

      expect(
        root().querySelectorAll('app-text-field')[1].querySelector('app-field-error'),
      ).toBeNull();
    });
  });

  it('un correo y una contraseña van sin corrector ni mayúscula automática', () => {
    for (const index of [0, 1]) {
      expect(input(index).getAttribute('spellcheck')).toBe('false');
      expect(input(index).getAttribute('autocapitalize')).toBe('none');
    }
  });

  it('no corta lo que se pega: el largo lo dice la validación', () => {
    expect(input(1).hasAttribute('maxlength')).toBe(false);
  });

  describe('mostrar la contraseña', () => {
    it('solo el campo que lo pide lleva el botón', () => {
      expect(root().querySelectorAll('button')).toHaveLength(1);
      expect(input(1).nextElementSibling).toBe(reveal());
    });

    it('«Mostrar» deja ver lo escrito y pasa a decir «Ocultar»', async () => {
      expect(reveal()!.textContent!.trim()).toBe('Mostrar');

      reveal()!.click();
      await fixture.whenStable();

      expect(input(1).type).toBe('text');
      expect(reveal()!.textContent!.trim()).toBe('Ocultar');
    });

    it('«Ocultar» vuelve a esconderla', async () => {
      reveal()!.click();
      await fixture.whenStable();
      reveal()!.click();
      await fixture.whenStable();

      expect(input(1).type).toBe('password');
      expect(reveal()!.textContent!.trim()).toBe('Mostrar');
    });

    it('el botón no envía el formulario y apunta a la caja que descubre', () => {
      expect(reveal()!.type).toBe('button');
      expect(reveal()!.getAttribute('aria-controls')).toBe(input(1).id);
    });

    it('conserva el foco en la caja al mostrar, para seguir escribiendo', async () => {
      input(1).focus();
      reveal()!.click();
      await fixture.whenStable();

      expect(document.activeElement).toBe(input(1));
    });
  });
});

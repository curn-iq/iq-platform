import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SearchField } from './search-field';

@Component({
  imports: [SearchField],
  template: `<app-search-field
    label="Buscar una técnica"
    placeholder="Buscar técnica"
    [(value)]="query"
  />`,
})
class Host {
  query = signal('');
}

@Component({
  imports: [SearchField],
  template: '<app-search-field label="Buscar" size="compact" />',
})
class CompactHost {}

describe('SearchField', () => {
  async function mount() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      root,
      input: () => root.querySelector<HTMLInputElement>('input')!,
      clear: () => root.querySelector<HTMLButtonElement>('.clear'),
    };
  }

  it('es un campo de búsqueda con su etiqueta para quien no lo ve y su marcador', async () => {
    const { root, input } = await mount();
    const label = root.querySelector('label')!;

    expect(input().type).toBe('search');
    expect(input().placeholder).toBe('Buscar técnica');
    expect(label.textContent).toBe('Buscar una técnica');
    expect(label.getAttribute('for')).toBe(input().id);
  });

  it('es grande salvo que se pida compacto', async () => {
    const { root } = await mount();
    expect(root.querySelector('app-search-field')!.classList).not.toContain('compact');

    const compact = TestBed.createComponent(CompactHost);
    await compact.whenStable();
    expect(compact.nativeElement.querySelector('app-search-field').classList).toContain('compact');
  });

  it('cada campo tiene su propio id', async () => {
    const a = await mount();
    const b = await mount();

    expect(a.input().id).not.toBe(b.input().id);
  });

  it('lo que se escribe llega a quien lo usa', async () => {
    const { fixture, input } = await mount();
    input().value = 'cesarea';
    input().dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.componentInstance.query()).toBe('cesarea');
  });

  it('el botón de borrar solo aparece cuando hay algo escrito', async () => {
    const { fixture, input, clear } = await mount();
    expect(clear()).toBeNull();

    input().value = 'a';
    input().dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(clear()).not.toBeNull();
    expect(clear()!.getAttribute('aria-label')).toBe('Borrar la búsqueda');
  });

  it('borrar deja el campo vacío y le devuelve el foco', async () => {
    const { fixture, root, input, clear } = await mount();
    document.body.appendChild(root);
    fixture.componentInstance.query.set('histerectomia');
    await fixture.whenStable();
    expect(input().value).toBe('histerectomia');

    clear()!.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.query()).toBe('');
    expect(input().value).toBe('');
    expect(document.activeElement).toBe(input());
    expect(clear()).toBeNull();
    root.remove();
  });
});

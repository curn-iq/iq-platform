import { TestBed } from '@angular/core/testing';
import type { TechniqueSummary } from '../../data/api/models';
import { CanvasHead } from './canvas-head';

describe('CanvasHead: selector de técnica', () => {
  const techniques = [
    { id: 'colecistectomia', name: 'Colecistectomía' },
    { id: 'mastectomia', name: 'Mastectomía' },
    { id: 'tiroidectomia', name: 'Tiroidectomía' },
  ] as TechniqueSummary[];

  async function render(currentId = 'mastectomia') {
    const fixture = TestBed.createComponent(CanvasHead);
    fixture.componentRef.setInput('title', 'Mastectomía');
    fixture.componentRef.setInput('techniques', techniques);
    fixture.componentRef.setInput('currentId', currentId);
    const chosen: string[] = [];
    fixture.componentInstance.choose.subscribe((id) => chosen.push(id));
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const trigger = () => root.querySelector<HTMLButtonElement>('.trigger')!;
    const options = () => [...root.querySelectorAll<HTMLElement>('[role="option"]')];
    const press = async (key: string) => {
      trigger().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await fixture.whenStable();
    };
    return { fixture, root, trigger, options, press, chosen };
  }

  it('cerrado, dice la técnica abierta; sin técnica, «Elegir técnica»', async () => {
    const { trigger } = await render();
    expect(trigger().textContent).toContain('Mastectomía');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    const none = await render('otra-tecnica');
    expect(none.trigger().textContent).toContain('Elegir técnica');
  });

  it('al tocarlo abre la lista con todas las técnicas y marca la abierta', async () => {
    const { trigger, options, fixture } = await render();
    trigger().click();
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(options().map((o) => o.textContent?.trim())).toEqual([
      'Colecistectomía',
      'Mastectomía',
      'Tiroidectomía',
    ]);
    expect(options().map((o) => o.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(trigger().getAttribute('aria-activedescendant')).toBe('technique-option-1');
  });

  it('elegir una técnica la emite y cierra la lista', async () => {
    const { trigger, options, fixture, chosen } = await render();
    trigger().click();
    await fixture.whenStable();
    options()[2].click();
    await fixture.whenStable();

    expect(chosen).toEqual(['tiroidectomia']);
    expect(options()).toHaveLength(0);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('con el teclado: flechas para moverse, Intro para elegir y Escape para cerrar', async () => {
    const { trigger, options, press, fixture, chosen } = await render();
    await press('ArrowDown');
    expect(options()).toHaveLength(3);
    await press('ArrowDown');
    expect(trigger().getAttribute('aria-activedescendant')).toBe('technique-option-2');
    // No pasa del último
    await press('ArrowDown');
    expect(trigger().getAttribute('aria-activedescendant')).toBe('technique-option-2');
    await press('Home');
    expect(trigger().getAttribute('aria-activedescendant')).toBe('technique-option-0');
    await press('Enter');
    expect(chosen).toEqual(['colecistectomia']);

    await press('ArrowDown');
    expect(options()).toHaveLength(3);
    await press('Escape');
    expect(options()).toHaveLength(0);
    expect(chosen).toHaveLength(1);
    await fixture.whenStable();
  });

  it('tocar fuera de la cabeza cierra la lista', async () => {
    const { trigger, options, fixture } = await render();
    trigger().click();
    await fixture.whenStable();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(options()).toHaveLength(0);
  });
});

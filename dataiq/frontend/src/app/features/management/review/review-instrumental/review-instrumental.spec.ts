import { TestBed } from '@angular/core/testing';
import type { InstrumentalDiff } from '../../../../domain/version-diff';
import { ReviewInstrumental } from './review-instrumental';

describe('ReviewInstrumental', () => {
  let root: HTMLElement;

  function mount(diff: InstrumentalDiff, isNew = false) {
    const fixture = TestBed.createComponent(ReviewInstrumental);
    fixture.componentRef.setInput('diff', diff);
    fixture.componentRef.setInput('isNew', isNew);
    fixture.detectChanges();
    root = fixture.nativeElement;
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const objects = () => Array.from(root.querySelectorAll('.objects li')).map((li) => text(li));

  it('sin cambios lo dice y lista los objetos', () => {
    mount({ objects: ['Bisturí', 'Gasa'], changes: [] });

    expect(text(root.querySelector('.unchanged'))).toBe(
      'Sin cambios frente a la versión publicada.',
    );
    expect(root.querySelector('.changes')).toBeNull();
    expect(objects()).toEqual(['Bisturí', 'Gasa']);
  });

  it('dice qué objetos se quitaron y cuáles se agregaron', () => {
    mount({
      objects: ['Bisturí', 'Tijera Mayo'],
      changes: [
        { kind: 'removed', name: 'Pinza Kelly' },
        { kind: 'added', name: 'Tijera Mayo' },
      ],
    });

    const changes = Array.from(root.querySelectorAll('.changes li')).map(
      (li) => `${text(li.querySelector('.kind'))}: ${text(li.querySelector('strong'))}`,
    );
    expect(changes).toEqual(['Quitado: Pinza Kelly', 'Agregado: Tijera Mayo']);
    expect(root.querySelector('.unchanged')).toBeNull();
    expect(objects()).toEqual(['Bisturí', 'Tijera Mayo']);
  });

  it('«Quitado» no es rojo: va atenuado', () => {
    mount({ objects: [], changes: [{ kind: 'removed', name: 'Pinza Kelly' }] });

    expect(root.querySelector('li')!.getAttribute('data-kind')).toBe('removed');
  });

  it('en una técnica nueva solo lista los objetos, sin hablar de cambios', () => {
    mount({ objects: ['Bisturí'], changes: [] }, true);

    expect(root.querySelector('.unchanged')).toBeNull();
    expect(root.querySelector('.changes')).toBeNull();
    expect(objects()).toEqual(['Bisturí']);
  });

  it('sin objetos lo dice', () => {
    mount({ objects: [], changes: [] }, true);

    expect(text(root.querySelector('.none'))).toBe('Todavía no hay instrumental.');
  });
});

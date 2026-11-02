import { TestBed } from '@angular/core/testing';
import type { ClinicalRow } from '../../../../domain/version-diff';
import { ReviewClinical } from './review-clinical';

const rows: ClinicalRow[] = [
  {
    key: 'description',
    label: 'Para qué sirve',
    published: '',
    proposed: 'Texto.',
    change: 'added',
  },
  {
    key: 'anesthesia',
    label: 'Anestesia',
    published: 'General',
    proposed: 'Regional',
    change: 'modified',
  },
  { key: 'drapes', label: 'Ropa', published: 'Campos', proposed: '', change: 'removed' },
  { key: 'source', label: 'Fuente', published: 'IQ', proposed: 'IQ', change: null },
  {
    key: 'sutures',
    label: 'Suturas',
    published: '',
    proposed: 'Piel · Seda\nFascia · Vicryl',
    change: 'added',
  },
];

describe('ReviewClinical', () => {
  let root: HTMLElement;

  function mount(publishedLabel: string | null = 'Publicada · versión 1') {
    const fixture = TestBed.createComponent(ReviewClinical);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('publishedLabel', publishedLabel);
    fixture.componentRef.setInput('proposedLabel', 'Propuesta · versión 2');
    fixture.detectChanges();
    root = fixture.nativeElement;
  }

  const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();
  const field = (label: string) =>
    Array.from(root.querySelectorAll('.field')).find((f) => text(f.querySelector('dt')) === label)!;

  it('encabeza las columnas con la publicada y la propuesta', () => {
    mount();

    expect(Array.from(root.querySelectorAll('.head span')).map((s) => text(s))).toEqual([
      'Campo',
      'Publicada · versión 1',
      'Propuesta · versión 2',
    ]);
  });

  it('muestra todos los campos, también los que no cambiaron', () => {
    mount();

    expect(Array.from(root.querySelectorAll('dt')).map((dt) => text(dt))).toEqual([
      'Para qué sirve',
      'Anestesia',
      'Ropa',
      'Fuente',
      'Suturas',
    ]);
    expect(root.querySelectorAll('.field.changed')).toHaveLength(4);
  });

  it('marca lo agregado, lo modificado y lo quitado en la propuesta', () => {
    mount();

    expect(text(field('Para qué sirve').querySelector('.tag'))).toBe('+ Agregado');
    expect(text(field('Anestesia').querySelector('.tag'))).toBe('Modificado');
    expect(text(field('Ropa').querySelector('.tag'))).toBe('Quitado');
    expect(field('Fuente').querySelector('.tag')).toBeNull();
  });

  it('un valor vacío dice «Sin dato»', () => {
    mount();

    expect(text(field('Para qué sirve').querySelectorAll('dd')[0])).toContain('Sin dato');
    expect(text(field('Ropa').querySelector('.proposed'))).toContain('Sin dato');
  });

  it('respeta los saltos de línea de las suturas', () => {
    mount();

    const proposed = field('Suturas').querySelector('.proposed')!;
    expect(proposed.textContent).toContain('Piel · Seda\nFascia · Vicryl');
  });

  it('cada valor dice a qué versión pertenece, para quien no ve las columnas', () => {
    mount();

    const [published, proposed] = Array.from(field('Anestesia').querySelectorAll('dd'));
    expect(text(published.querySelector('.sr-only'))).toBe('Publicada:');
    expect(text(proposed.querySelector('.sr-only'))).toBe('Propuesta:');
  });

  it('sin versión publicada solo está la propuesta', () => {
    mount(null);

    expect(Array.from(root.querySelectorAll('.head span')).map((s) => text(s))).toEqual([
      'Campo',
      'Propuesta · versión 2',
    ]);
    expect(field('Anestesia').querySelectorAll('dd')).toHaveLength(1);
    expect(root.querySelector('.fields')!.classList.contains('single')).toBe(true);
  });
});

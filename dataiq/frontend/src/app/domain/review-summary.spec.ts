import { describe, expect, it } from 'vitest';
import { blockReason, reviewSections } from './review-summary';
import type { VersionProgress } from './version-progress';

const complete: VersionProgress = {
  clinical: { status: 'complete', missing: [] },
  instrumental: { status: 'complete', count: 6 },
  mayo: { status: 'complete', total: 4, placed: 4 },
  reserve: { status: 'complete', total: 0, placed: 0 },
  blocking: [],
  canSubmit: true,
};

describe('reviewSections', () => {
  it('lista las cuatro secciones en el orden del editor, con su paso', () => {
    const sections = reviewSections(complete);
    expect(sections.map((s) => [s.name, s.slug])).toEqual([
      ['Datos clínicos', 'datos-clinicos'],
      ['Instrumental', 'instrumental'],
      ['Mesa de Mayo', 'mesa-de-mayo'],
      ['Mesa de reserva', 'mesa-de-reserva'],
    ]);
  });

  it('lo completo dice lo que hay y no bloquea', () => {
    expect(reviewSections(complete).map((s) => [s.blocking, s.text])).toEqual([
      [false, 'Todos los campos obligatorios.'],
      [false, '6 objetos.'],
      [false, '4 de 4 ubicados.'],
      [false, 'No lleva.'],
    ]);
  });

  it('los datos clínicos dicen qué campos faltan, con el nombre de su etiqueta', () => {
    const [clinical] = reviewSections({
      ...complete,
      clinical: { status: 'in_progress', missing: ['description', 'drapes', 'source', 'sutures'] },
      blocking: ['clinical'],
      canSubmit: false,
    });
    expect(clinical.blocking).toBe(true);
    expect(clinical.missing).toEqual(['Para qué sirve', 'Ropa', 'Fuente', 'Suturas']);
    expect(clinical.text).toBe('Falta: Para qué sirve, Ropa, Fuente, Suturas.');
  });

  it('el instrumental pendiente dice «el instrumental»', () => {
    const sections = reviewSections({
      ...complete,
      instrumental: { status: 'pending', count: 0 },
      blocking: ['instrumental'],
      canSubmit: false,
    });
    expect(sections[1].text).toBe('Falta: el instrumental.');
  });

  it('una mesa sin objetos dice «sus objetos»; con objetos sin celda, cuántos', () => {
    const sections = reviewSections({
      ...complete,
      mayo: { status: 'pending', total: 0, placed: 0 },
      reserve: { status: 'in_progress', total: 3, placed: 2 },
      blocking: ['mayo', 'reserve'],
      canSubmit: false,
    });
    expect(sections[2].text).toBe('Falta: sus objetos.');
    expect(sections[3].text).toBe('Falta: 1 objeto sin ubicar.');
    const more = reviewSections({
      ...complete,
      mayo: { status: 'in_progress', total: 5, placed: 1 },
      blocking: ['mayo'],
      canSubmit: false,
    });
    expect(more[2].text).toBe('Falta: 4 objetos sin ubicar.');
  });

  it('una mesa sin arreglo dice «Sin arreglo disponible.» y no bloquea', () => {
    const sections = reviewSections({
      ...complete,
      reserve: { status: 'no_table', total: 0, placed: 0 },
    });
    expect(sections[3]).toMatchObject({
      blocking: false,
      mark: 'no_table',
      text: 'Sin arreglo disponible.',
    });
  });
});

describe('blockReason', () => {
  it('sin nada que bloquee no hay motivo', () => {
    expect(blockReason(reviewSections(complete), false)).toBeNull();
  });

  it('junta lo que falta de cada sección, y dice enviar o publicar', () => {
    const sections = reviewSections({
      ...complete,
      clinical: { status: 'in_progress', missing: ['anesthesia', 'drapes'] },
      mayo: { status: 'in_progress', total: 4, placed: 2 },
      blocking: ['clinical', 'mayo'],
      canSubmit: false,
    });
    expect(blockReason(sections, false)).toBe(
      'Para enviar falta completar Datos clínicos (Anestesia, Ropa); Mesa de Mayo (2 objetos sin ubicar).',
    );
    expect(blockReason(sections, true)).toContain('Para publicar falta completar');
  });
});

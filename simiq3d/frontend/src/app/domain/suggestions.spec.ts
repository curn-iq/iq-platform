import type { TableItem } from './mayo-table';
import { suggestions, withArticle } from './suggestions';

describe('suggestions', () => {
  const item = (name: string, instrumentIds = ['i']): TableItem => ({
    id: name,
    legendNumber: 1,
    name,
    instrumentIds,
    cells: [],
  });

  it('sin técnica abierta, sobre las técnicas que se pueden ver', () => {
    expect(suggestions(['Mastectomía', 'Tiroidectomía', 'Colecistectomía'])).toEqual([
      'Muéstrame la mesa de Mastectomía',
      '¿Para qué sirve la Tiroidectomía?',
      '¿Qué lleva la mesa de Colecistectomía?',
    ]);
  });

  it('con una abierta, sobre su mesa, con objetos de un solo instrumento', () => {
    const items = [
      item('Mango de bisturí N.° 3 y Hoja de bisturí #15', ['m', 'h']),
      item('Pinza Kelly'),
      item('Separador de Farabeuf'),
    ];
    expect(suggestions([], { name: 'Mastectomía', items })).toEqual([
      '¿Dónde va la Pinza Kelly?',
      '¿Qué es el Separador de Farabeuf?',
      '¿Cuáles son las indicaciones de la Mastectomía?',
    ]);
  });

  it('el artículo sale de la primera palabra', () => {
    expect(withArticle('Tijera de Mayo')).toBe('la Tijera de Mayo');
    expect(withArticle('Portaagujas')).toBe('el Portaagujas');
  });
});

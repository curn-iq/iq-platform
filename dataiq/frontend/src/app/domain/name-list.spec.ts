import { addName, removeName } from './name-list';

describe('addName', () => {
  it('suma el nombre al final, sin los espacios de los extremos', () => {
    expect(addName(['Electrobisturí'], '  Aspirador ')).toEqual(['Electrobisturí', 'Aspirador']);
  });

  it('un nombre en blanco no se suma', () => {
    expect(addName(['Electrobisturí'], '   ')).toEqual(['Electrobisturí']);
    expect(addName([], '')).toEqual([]);
  });

  it('un nombre que ya está no se repite, aunque cambien las mayúsculas o las tildes', () => {
    expect(addName(['Electrobisturí'], 'electrobisturi')).toEqual(['Electrobisturí']);
    expect(addName(['Electrobisturí'], ' ELECTROBISTURÍ ')).toEqual(['Electrobisturí']);
  });

  it('un nombre parecido pero distinto sí se suma', () => {
    expect(addName(['Electrobisturí'], 'Electrobisturí bipolar')).toEqual([
      'Electrobisturí',
      'Electrobisturí bipolar',
    ]);
  });

  it('no cambia la lista que recibe', () => {
    const names = ['Electrobisturí'];

    addName(names, 'Aspirador');

    expect(names).toEqual(['Electrobisturí']);
  });
});

describe('removeName', () => {
  it('quita el nombre de esa posición', () => {
    expect(removeName(['A', 'B', 'C'], 1)).toEqual(['A', 'C']);
  });

  it('una posición que no existe deja la lista igual', () => {
    expect(removeName(['A', 'B'], 5)).toEqual(['A', 'B']);
    expect(removeName(['A', 'B'], -1)).toEqual(['A', 'B']);
  });

  it('no cambia la lista que recibe', () => {
    const names = ['A', 'B'];

    removeName(names, 0);

    expect(names).toEqual(['A', 'B']);
  });
});

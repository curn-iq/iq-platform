import { removeAt } from './remove-at';

describe('removeAt', () => {
  it('quita el elemento de esa posición', () => {
    expect(removeAt(['A', 'B', 'C'], 1)).toEqual(['A', 'C']);
  });

  it('una posición que no existe deja la lista igual', () => {
    expect(removeAt(['A', 'B'], 5)).toEqual(['A', 'B']);
    expect(removeAt(['A', 'B'], -1)).toEqual(['A', 'B']);
  });

  it('no cambia la lista que recibe', () => {
    const list = ['A', 'B'];

    removeAt(list, 0);

    expect(list).toEqual(['A', 'B']);
  });
});

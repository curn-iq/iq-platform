import { initials } from './initials';

describe('initials', () => {
  it('toma la primera letra de las dos primeras palabras', () => {
    expect(initials('Daniela Ortiz Pérez')).toBe('DO');
  });

  it('un nombre de una palabra da una letra, y sin nombre, un signo', () => {
    expect(initials('ana')).toBe('A');
    expect(initials('  ')).toBe('?');
  });
});

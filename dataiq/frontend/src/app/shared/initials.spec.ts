import { initials } from './initials';

describe('initials', () => {
  it('toma la inicial de las dos primeras palabras', () => {
    expect(initials('Daniela Ortiz')).toBe('DO');
    expect(initials('Mauricio Lugo Granados')).toBe('ML');
  });

  it('pasa a mayúscula, también con tildes', () => {
    expect(initials('laura pérez')).toBe('LP');
    expect(initials('ángela ñúñez')).toBe('ÁÑ');
  });

  it('con una sola palabra, su inicial', () => {
    expect(initials('Valentina')).toBe('V');
  });

  it('ignora los espacios de sobra', () => {
    expect(initials('  Ana   María  ')).toBe('AM');
  });

  it('sin nombre, un signo de pregunta', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });
});

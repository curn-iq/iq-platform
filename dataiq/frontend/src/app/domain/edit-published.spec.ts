import { inProgressText } from './edit-published';

describe('inProgressText', () => {
  it('una versión propia: «Ya está en curso»', () => {
    expect(inProgressText({ created_by: 'u-1', author: 'Ana Ruiz' }, 'u-1')).toBe(
      'Ya está en curso',
    );
  });

  it('la de otra persona dice quién la tiene', () => {
    expect(inProgressText({ created_by: 'u-2', author: 'Daniela Ortiz' }, 'u-1')).toBe(
      'En curso por Daniela Ortiz',
    );
  });

  it('sin saber quién pregunta, no la toma por propia', () => {
    expect(inProgressText({ created_by: 'u-2', author: 'Daniela Ortiz' }, undefined)).toBe(
      'En curso por Daniela Ortiz',
    );
  });
});

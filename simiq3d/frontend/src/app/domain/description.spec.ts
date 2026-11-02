import { splitLead } from './description';

describe('splitLead', () => {
  it('separa la primera oración del resto', () => {
    expect(
      splitLead('Pinza hemostática curva, de unos 14 cm. Sirve para pinzar vasos. Viene recta.'),
    ).toEqual({
      lead: 'Pinza hemostática curva, de unos 14 cm.',
      rest: 'Sirve para pinzar vasos. Viene recta.',
    });
  });

  it('no corta en una abreviatura ni ante una cifra', () => {
    const text = 'El N.° 3 recibe las hojas pequeñas (N.° 10 y 15). Es de acero.';
    expect(splitLead(text).lead).toBe('El N.° 3 recibe las hojas pequeñas (N.° 10 y 15).');
  });

  it('una sola oración no tiene resto', () => {
    expect(splitLead('Sostiene la hoja.')).toEqual({ lead: 'Sostiene la hoja.', rest: '' });
  });
});

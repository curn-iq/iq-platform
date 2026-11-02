import { sutureRow } from './instrumental-sheet';

describe('sutureRow', () => {
  it('el nombre con su calibre, y la aguja tras una coma', () => {
    expect(
      sutureRow({ plane: 'Piel', name: 'Seda', gauge: '2/0', needleType: 'aguja cortante' }),
    ).toEqual({ plane: 'Piel', text: 'Seda 2/0, aguja cortante' });
  });

  it('sin calibre ni aguja es solo el nombre', () => {
    expect(sutureRow({ plane: 'Fascia', name: 'Vicryl', gauge: null, needleType: null })).toEqual({
      plane: 'Fascia',
      text: 'Vicryl',
    });
  });

  it('una sutura sin plano lo deja en `null`', () => {
    expect(
      sutureRow({ plane: null, name: 'Seda', gauge: '3/0', needleType: null }).plane,
    ).toBeNull();
  });
});

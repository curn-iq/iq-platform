import { plural } from './plural';

describe('plural', () => {
  it('con una, en singular; con cero o más de una, en plural', () => {
    expect(plural(1, 'borrador', 'borradores')).toBe('1 borrador');
    expect(plural(0, 'borrador', 'borradores')).toBe('0 borradores');
    expect(plural(4, 'versión revisada', 'versiones revisadas')).toBe('4 versiones revisadas');
  });
});

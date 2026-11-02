import { isReadyToCreate, newTechniqueTitle, NEW_TECHNIQUE_TITLE } from './new-technique';

describe('newTechniqueTitle', () => {
  it('sin nombre dice «Técnica nueva»', () => {
    expect(newTechniqueTitle('')).toBe(NEW_TECHNIQUE_TITLE);
    expect(newTechniqueTitle('   ')).toBe('Técnica nueva');
  });

  it('con nombre sigue lo que se escribe, sin los espacios de los extremos', () => {
    expect(newTechniqueTitle('  Tiroidectomía ')).toBe('Tiroidectomía');
  });
});

describe('isReadyToCreate', () => {
  it('pide un nombre y una especialidad', () => {
    expect(isReadyToCreate('Tiroidectomía', 's-1')).toBe(true);
  });

  it('falta la especialidad', () => {
    expect(isReadyToCreate('Tiroidectomía', '')).toBe(false);
  });

  it('falta el nombre, o es solo espacios', () => {
    expect(isReadyToCreate('', 's-1')).toBe(false);
    expect(isReadyToCreate('  \n ', 's-1')).toBe(false);
  });
});

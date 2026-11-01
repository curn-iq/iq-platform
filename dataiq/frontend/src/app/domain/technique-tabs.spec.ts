import { DEFAULT_TECHNIQUE_TAB, findTechniqueTab, TECHNIQUE_TABS } from './technique-tabs';

describe('TECHNIQUE_TABS', () => {
  it('son cuatro, en el orden del detalle, con slugs distintos', () => {
    expect(TECHNIQUE_TABS.map((tab) => tab.label)).toEqual([
      'Datos clínicos',
      'Instrumental',
      'Mesa de Mayo',
      'Mesa de reserva',
    ]);
    expect(new Set(TECHNIQUE_TABS.map((tab) => tab.slug)).size).toBe(4);
  });

  it('solo los datos clínicos se ven sin cuenta', () => {
    expect(TECHNIQUE_TABS.filter((tab) => !tab.requiresAccount).map((tab) => tab.slug)).toEqual([
      'datos-clinicos',
    ]);
  });

  it('abre en los datos clínicos', () => {
    expect(DEFAULT_TECHNIQUE_TAB).toBe('datos-clinicos');
  });
});

describe('findTechniqueTab', () => {
  it('encuentra la pestaña por su slug', () => {
    expect(findTechniqueTab('mesa-de-mayo')?.label).toBe('Mesa de Mayo');
  });

  it('un slug desconocido o vacío no es una pestaña', () => {
    expect(findTechniqueTab('mayo')).toBeUndefined();
    expect(findTechniqueTab('')).toBeUndefined();
    expect(findTechniqueTab(null)).toBeUndefined();
    expect(findTechniqueTab(undefined)).toBeUndefined();
  });
});

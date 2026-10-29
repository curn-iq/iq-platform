import { NAV_MENUS, NavOption } from './nav-menus';

const options = (): NavOption[] => NAV_MENUS.flatMap((menu) => [...(menu.options ?? [])]);

describe('NAV_MENUS', () => {
  it('los enlaces al inicio van solo a las secciones que existen en el inicio', () => {
    const fragments = options()
      .filter((option) => option.target.fragment)
      .map((option) => [option.label, option.target.route, option.target.fragment]);

    expect(fragments).toEqual([
      ['Cómo funciona', '/', 'camino'],
      ['La investigación', '/', 'investigacion'],
      ['Preguntas frecuentes', '/', 'preguntas'],
      ['Guía para estudiantes', '/', 'quien'],
      ['Para docentes', '/', 'quien'],
    ]);
  });

  it('no hay «Quiénes somos» ni «Términos de uso»: no tienen texto en el MVP', () => {
    const labels = options().map((option) => option.label);

    expect(labels).not.toContain('Quiénes somos');
    expect(labels).not.toContain('Términos de uso');
  });

  it('SIMIQ3D y SIVRI son enlaces a otra app, con navegación completa', () => {
    const external = options()
      .filter((option) => option.target.href)
      .map((option) => [option.label, option.target.href, option.target.route]);

    expect(external).toEqual([
      ['SIMIQ3D', '/simiq3d/', undefined],
      ['SIVRI', '/sivri/', undefined],
    ]);
  });

  it('toda opción lleva a una ruta propia o a otra app, nunca a las dos', () => {
    for (const option of options()) {
      expect(Boolean(option.target.route) !== Boolean(option.target.href), option.label).toBe(true);
    }
  });
});

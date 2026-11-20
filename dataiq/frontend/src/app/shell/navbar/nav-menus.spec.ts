import { isCurrentLink, NAV_LINKS, NAV_MENUS, NavOption } from './nav-menus';

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

  it('no hay «Quiénes somos» ni «Términos de uso»: la página se llama «Nosotros» y no es una opción de un menú', () => {
    const labels = options().map((option) => option.label);

    expect(labels).not.toContain('Quiénes somos');
    expect(labels).not.toContain('Términos de uso');
    expect(labels).not.toContain('Nosotros');
  });

  it('«Nosotros» es un enlace directo a /nosotros que el pie pone en «¿Por qué IQ Platform?»', () => {
    expect(NAV_LINKS).toEqual([
      { id: 'about', label: 'Nosotros', target: { route: '/nosotros' }, footerColumn: 'why' },
    ]);
  });

  it('un enlace directo es el actual solo en su ruta, con o sin parámetros ni fragmento', () => {
    const [about] = NAV_LINKS;

    expect(isCurrentLink(about, '/nosotros')).toBe(true);
    expect(isCurrentLink(about, '/nosotros?x=1#equipo')).toBe(true);
    expect(isCurrentLink(about, '/')).toBe(false);
    expect(isCurrentLink(about, '/nosotros/otra')).toBe(false);
    expect(isCurrentLink(about, '')).toBe(false);
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

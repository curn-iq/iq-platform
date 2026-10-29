import { managementLinks } from './management-links';

describe('managementLinks', () => {
  const labels = (role: Parameters<typeof managementLinks>[0]) =>
    managementLinks(role).map((link) => link.label);

  it('un usuario no ve ninguna gestión', () => {
    expect(labels('user')).toEqual([]);
  });

  it('un colaborador ve sus borradores', () => {
    expect(labels('contributor')).toEqual(['Mis borradores']);
  });

  it('un revisor suma por revisar e instrumental', () => {
    expect(labels('reviewer')).toEqual(['Mis borradores', 'Por revisar', 'Instrumental']);
  });

  it('un admin suma usuarios y roles', () => {
    expect(labels('admin')).toEqual([
      'Mis borradores',
      'Por revisar',
      'Instrumental',
      'Usuarios y roles',
    ]);
  });

  it('cada acceso lleva a su ruta de gestión', () => {
    expect(managementLinks('admin').map((link) => link.route)).toEqual([
      '/gestion/borradores',
      '/gestion/revision',
      '/gestion/instrumental',
      '/gestion/usuarios',
    ]);
  });
});

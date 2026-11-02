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

  it('solo «Por revisar» lleva cifra: las versiones que esperan revisión', () => {
    expect(managementLinks('admin').map((link) => [link.label, link.counter])).toEqual([
      ['Mis borradores', undefined],
      ['Por revisar', 'pending_reviews'],
      ['Instrumental', undefined],
      ['Usuarios y roles', undefined],
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

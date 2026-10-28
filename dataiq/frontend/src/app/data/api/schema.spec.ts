import type { components } from './schema';

type Role = components['schemas']['Role'];
type VersionState = components['schemas']['VersionState'];

// Un Record exige todas las claves y rechaza las que sobran: si el backend
// agrega o quita un rol o un estado y no se corrió `npm run api:types`, o si
// cambia lo documentado en CLAUDE.md, esta prueba deja de compilar.
const roles: Record<Role, true> = { user: true, contributor: true, reviewer: true, admin: true };
const states: Record<VersionState, true> = {
  draft: true,
  in_review: true,
  published: true,
  superseded: true,
  archived: true,
};

describe('tipos generados de la API', () => {
  it('traen los roles del modelo de roles', () => {
    expect(Object.keys(roles)).toEqual(['user', 'contributor', 'reviewer', 'admin']);
  });

  it('traen los estados de una versión', () => {
    expect(Object.keys(states)).toEqual([
      'draft',
      'in_review',
      'published',
      'superseded',
      'archived',
    ]);
  });
});

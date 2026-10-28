import type { components } from './schema';

type Role = components['schemas']['Role'];
type VersionState = components['schemas']['VersionState'];

// La comprobación es de tipos: si el backend agrega o quita un rol o un estado
// y se regeneró schema.d.ts, esta prueba deja de compilar hasta que el frontend
// lo tenga en cuenta. Que schema.d.ts esté al día con el backend lo revisa el CI
// (.github/workflows/dataiq-frontend.yml).
describe('tipos generados de la API', () => {
  it('traen los roles del modelo de roles', () => {
    expectTypeOf<Role>().toEqualTypeOf<'user' | 'contributor' | 'reviewer' | 'admin'>();
  });

  it('traen los estados de una versión', () => {
    expectTypeOf<VersionState>().toEqualTypeOf<
      'draft' | 'in_review' | 'published' | 'superseded' | 'archived'
    >();
  });
});

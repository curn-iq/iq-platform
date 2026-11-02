import { canEditVersion } from './edit-version';

describe('canEditVersion', () => {
  it('un borrador se edita', () => {
    expect(canEditVersion('draft')).toBe(true);
  });

  it('una versión en revisión no: se abre en solo lectura', () => {
    expect(canEditVersion('in_review')).toBe(false);
  });

  it('lo publicado, lo reemplazado y lo archivado tampoco', () => {
    for (const state of ['published', 'superseded', 'archived'] as const) {
      expect(canEditVersion(state)).toBe(false);
    }
  });
});

import { ALLOWED_TRANSITIONS, canTransition, VersionState } from './version-state';

const STATES: VersionState[] = ['draft', 'in_review', 'published', 'superseded', 'archived'];

describe('canTransition', () => {
  it('permite las transiciones del ciclo de una versión', () => {
    expect(canTransition('draft', 'in_review')).toBe(true);
    expect(canTransition('in_review', 'draft')).toBe(true); // rechazo
    expect(canTransition('in_review', 'published')).toBe(true);
    expect(canTransition('published', 'superseded')).toBe(true);
    expect(canTransition('published', 'archived')).toBe(true);
    expect(canTransition('draft', 'published')).toBe(true); // publica lo suyo sin revisión
  });

  it('no permite salir de reemplazada ni de archivada', () => {
    for (const to of STATES) {
      expect(canTransition('superseded', to)).toBe(false);
      expect(canTransition('archived', to)).toBe(false);
    }
  });

  it('no permite volver atrás desde publicada', () => {
    expect(canTransition('published', 'draft')).toBe(false);
    expect(canTransition('published', 'in_review')).toBe(false);
  });

  it('no permite pasar a sí mismo', () => {
    for (const state of STATES) {
      expect(canTransition(state, state)).toBe(false);
    }
  });

  it('define las transiciones de todos los estados', () => {
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual([...STATES].sort());
  });
});

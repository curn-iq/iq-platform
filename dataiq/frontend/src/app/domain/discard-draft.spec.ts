import { canDiscard, discardDeletesTechnique } from './discard-draft';

describe('canDiscard', () => {
  it('solo un borrador se descarta', () => {
    expect(canDiscard('draft')).toBe(true);
  });

  it('una versión en revisión no', () => {
    expect(canDiscard('in_review')).toBe(false);
  });

  it('lo publicado, lo reemplazado y lo archivado tampoco: no se borra, se archiva', () => {
    for (const state of ['published', 'superseded', 'archived'] as const) {
      expect(canDiscard(state)).toBe(false);
    }
  });
});

describe('discardDeletesTechnique', () => {
  it('la versión 1 en borrador es de una técnica que nunca se publicó: se borra también la técnica', () => {
    expect(discardDeletesTechnique({ number: 1, state: 'draft' })).toBe(true);
  });

  it('una versión posterior solo borra el borrador: la técnica ya tiene una publicada', () => {
    expect(discardDeletesTechnique({ number: 2, state: 'draft' })).toBe(false);
    expect(discardDeletesTechnique({ number: 5, state: 'draft' })).toBe(false);
  });

  it('lo que no es un borrador no se descarta, así que no borra nada', () => {
    expect(discardDeletesTechnique({ number: 1, state: 'in_review' })).toBe(false);
    expect(discardDeletesTechnique({ number: 1, state: 'published' })).toBe(false);
  });
});

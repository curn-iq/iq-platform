import { describe, expect, it } from 'vitest';
import { EDIT_LABEL, editAction } from './edit-action';

const version = (state: string, createdBy = 'u-1') => ({
  id: 'v-1',
  state,
  created_by: createdBy,
  author: 'Daniela Ortiz',
});

describe('editAction', () => {
  it('sin versión en curso ofrece «Editar técnica»', () => {
    expect(editAction(undefined, 'u-1')).toEqual({
      kind: 'edit',
      label: EDIT_LABEL,
      icon: 'pencil',
    });
    expect(EDIT_LABEL).toBe('Editar técnica');
  });

  it('un borrador propio ofrece «Continuar borrador», con su versión', () => {
    expect(editAction(version('draft'), 'u-1')).toEqual({
      kind: 'continue',
      label: 'Continuar borrador',
      icon: 'pencil',
      versionId: 'v-1',
    });
  });

  it('una versión propia en revisión ofrece «Ver versión en revisión», con su versión', () => {
    expect(editAction(version('in_review'), 'u-1')).toEqual({
      kind: 'view',
      label: 'Ver versión en revisión',
      icon: 'clock',
      versionId: 'v-1',
    });
  });

  it('la de otra persona dice «En curso por …», sin versión a la que ir, sea borrador o esté en revisión', () => {
    for (const state of ['draft', 'in_review']) {
      expect(editAction(version(state, 'u-2'), 'u-1')).toEqual({
        kind: 'busy',
        label: 'En curso por Daniela Ortiz',
        icon: 'clock',
      });
    }
  });

  it('una versión que no está en curso no impide editar', () => {
    expect(editAction(version('published'), 'u-1').kind).toBe('edit');
  });
});

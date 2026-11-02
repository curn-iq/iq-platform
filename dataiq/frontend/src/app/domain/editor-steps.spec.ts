import { EDITOR_STEPS, findEditorStep, FIRST_EDITOR_STEP } from './editor-steps';

describe('EDITOR_STEPS', () => {
  it('son cinco, en el orden del editor, con slugs distintos', () => {
    expect(EDITOR_STEPS.map((step) => step.slug)).toEqual([
      'datos-clinicos',
      'instrumental',
      'mesa-de-mayo',
      'mesa-de-reserva',
      'revisar',
    ]);
    expect(new Set(EDITOR_STEPS.map((step) => step.slug)).size).toBe(5);
  });

  it('abre en los datos clínicos', () => {
    expect(FIRST_EDITOR_STEP).toBe('datos-clinicos');
  });

  it('encuentra un paso por su slug y no inventa los que no existen', () => {
    expect(findEditorStep('mesa-de-mayo')?.label).toBe('Mesa de Mayo');
    expect(findEditorStep('paso-9')).toBeUndefined();
    expect(findEditorStep(null)).toBeUndefined();
  });
});

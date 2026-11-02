import {
  EDITOR_STEPS,
  findEditorStep,
  FIRST_EDITOR_STEP,
  nextStep,
  previousStep,
  stepLabel,
} from './editor-steps';

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

describe('stepLabel', () => {
  const step = (slug: string) => findEditorStep(slug)!;

  it('el último paso es «Revisar y enviar» para el colaborador', () => {
    expect(stepLabel(step('revisar'), false)).toBe('Revisar y enviar');
  });

  it('y «Revisar y publicar» para quien publica lo suyo', () => {
    expect(stepLabel(step('revisar'), true)).toBe('Revisar y publicar');
  });

  it('los demás pasos dicen lo mismo para todos', () => {
    for (const slug of ['datos-clinicos', 'instrumental', 'mesa-de-mayo', 'mesa-de-reserva']) {
      expect(stepLabel(step(slug), true)).toBe(stepLabel(step(slug), false));
    }
  });
});

describe('previousStep y nextStep', () => {
  it('cada paso tiene el anterior y el siguiente de la lista', () => {
    expect(previousStep('instrumental')?.slug).toBe('datos-clinicos');
    expect(nextStep('instrumental')?.slug).toBe('mesa-de-mayo');
    expect(nextStep('mesa-de-reserva')?.slug).toBe('revisar');
  });

  it('el primero no tiene anterior y el último no tiene siguiente', () => {
    expect(previousStep('datos-clinicos')).toBeUndefined();
    expect(nextStep('revisar')).toBeUndefined();
  });

  it('un paso que no existe no tiene vecinos', () => {
    expect(previousStep('paso-9')).toBeUndefined();
    expect(nextStep('paso-9')).toBeUndefined();
  });
});

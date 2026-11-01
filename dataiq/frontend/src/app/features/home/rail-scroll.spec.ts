import { currentStep, railOffset, railProgress, stepFill } from './rail-scroll';

describe('railProgress', () => {
  it('es 0 antes de llegar a la sección y 1 al pasarla', () => {
    expect(railProgress(300, 1000)).toBe(0);
    expect(railProgress(0, 1000)).toBe(0);
    expect(railProgress(-500, 1000)).toBe(0.5);
    expect(railProgress(-1000, 1000)).toBe(1);
    expect(railProgress(-1800, 1000)).toBe(1);
  });

  it('sin nada que recorrer, es 0', () => {
    expect(railProgress(-200, 0)).toBe(0);
    expect(railProgress(-200, -50)).toBe(0);
  });
});

describe('stepFill', () => {
  it('cada herramienta se llena en su tercio del recorrido', () => {
    expect(stepFill(0, 0)).toBe(0);
    expect(stepFill(1 / 6, 0)).toBeCloseTo(0.5);
    expect(stepFill(1 / 3, 0)).toBe(1);
    expect(stepFill(1 / 3, 1)).toBe(0);
    expect(stepFill(0.5, 1)).toBeCloseTo(0.5);
    expect(stepFill(1, 2)).toBe(1);
    expect(stepFill(0.5, 2)).toBe(0);
  });
});

describe('currentStep', () => {
  it('es la herramienta en que va, y la última al terminar', () => {
    expect(currentStep(0)).toBe(0);
    expect(currentStep(0.33)).toBe(0);
    expect(currentStep(0.34)).toBe(1);
    expect(currentStep(0.67)).toBe(2);
    expect(currentStep(1)).toBe(2);
  });
});

describe('railOffset', () => {
  it('traslada el carril en proporción a lo recorrido', () => {
    expect(railOffset(0, 900)).toBe(0);
    expect(railOffset(0.5, 900)).toBe(450);
    expect(railOffset(1, 900)).toBe(900);
  });

  it('si el carril cabe en la ventana, no se mueve', () => {
    expect(railOffset(1, -40)).toBe(0);
  });
});

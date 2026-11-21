import { SWIPE_THRESHOLD_PX, swipeStep, wrapIndex } from './carousel';

describe('wrapIndex', () => {
  it('avanza y retrocede dando la vuelta por los dos extremos', () => {
    expect(wrapIndex(4, 4)).toBe(0);
    expect(wrapIndex(-1, 4)).toBe(3);
    expect(wrapIndex(2, 4)).toBe(2);
    expect(wrapIndex(9, 4)).toBe(1);
  });

  it('sin fotos queda en 0', () => {
    expect(wrapIndex(3, 0)).toBe(0);
  });
});

describe('swipeStep', () => {
  it('arrastrar hacia la izquierda trae la siguiente y hacia la derecha, la anterior', () => {
    expect(swipeStep(-120)).toBe(1);
    expect(swipeStep(120)).toBe(-1);
    expect(SWIPE_THRESHOLD_PX).toBe(80);
  });

  it('un arrastre corto no cambia de foto', () => {
    expect(swipeStep(SWIPE_THRESHOLD_PX - 1)).toBe(0);
    expect(swipeStep(-(SWIPE_THRESHOLD_PX - 1))).toBe(0);
    expect(swipeStep(0)).toBe(0);
  });

  it('justo el umbral ya cambia', () => {
    expect(swipeStep(-SWIPE_THRESHOLD_PX)).toBe(1);
    expect(swipeStep(SWIPE_THRESHOLD_PX)).toBe(-1);
  });

  it('el umbral se puede cambiar', () => {
    expect(swipeStep(-10, 5)).toBe(1);
    expect(swipeStep(-10, 20)).toBe(0);
  });
});

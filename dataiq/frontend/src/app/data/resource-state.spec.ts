import { hasFailed } from './resource-state';

const state = (hasValue: boolean, isLoading: boolean, error: unknown) => ({
  hasValue: () => hasValue,
  isLoading: () => isLoading,
  error: () => error,
});

describe('hasFailed', () => {
  it('falló: sin valor, sin otra petición en curso y con error', () => {
    expect(hasFailed(state(false, false, new Error('500')))).toBe(true);
  });

  it.each([
    ['tiene valor', state(true, false, new Error('500'))],
    ['se está volviendo a pedir', state(false, true, new Error('500'))],
    ['no hay error', state(false, false, undefined)],
  ])('no falló si %s', (_case, resource) => {
    expect(hasFailed(resource)).toBe(false);
  });
});

import { canArchive, hasVersionInProgress } from './archive-technique';

describe('canArchive', () => {
  it.each([
    ['reviewer', true],
    ['admin', true],
    ['contributor', false],
    ['user', false],
  ] as const)('un %s: %s', (role, expected) => {
    expect(canArchive(role)).toBe(expected);
  });

  it('sin cuenta no', () => {
    expect(canArchive(null)).toBe(false);
  });
});

describe('hasVersionInProgress', () => {
  const versions = [{ technique_id: 't-1' }, { technique_id: 't-2' }];

  it('dice si la técnica tiene una versión en curso entre las que recibe', () => {
    expect(hasVersionInProgress(versions, 't-2')).toBe(true);
    expect(hasVersionInProgress(versions, 't-3')).toBe(false);
  });

  it('sin versiones en curso, ninguna técnica tiene una', () => {
    expect(hasVersionInProgress([], 't-1')).toBe(false);
  });
});

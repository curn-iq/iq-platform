import { SentFrames } from './sent-frames';

const captured = (tag: string) => ({ blob: new Blob([tag]), width: 640, height: 360 });

describe('SentFrames', () => {
  it('devuelve el cuadro que se mandó con el número del resultado', () => {
    const frames = new SentFrames();
    const first = frames.add(1, captured('uno'));
    frames.add(2, captured('dos'));
    expect(frames.get(1)).toBe(first);
    expect(frames.get(1)).toMatchObject({ number: 1, width: 640, height: 360 });
    expect(frames.get(3)).toBeNull();
  });

  it('guarda solo los últimos: el resultado de uno muy viejo ya no tiene imagen', () => {
    const frames = new SentFrames(3);
    for (let n = 1; n <= 5; n++) frames.add(n, captured(String(n)));
    expect(frames.get(1)).toBeNull();
    expect(frames.get(2)).toBeNull();
    expect(frames.get(3)).not.toBeNull();
    expect(frames.get(5)).not.toBeNull();
  });

  it('al empezar otra conexión se olvida todo: los números vuelven a empezar en 1', () => {
    const frames = new SentFrames();
    frames.add(1, captured('viejo'));
    frames.clear();
    expect(frames.get(1)).toBeNull();
    const again = frames.add(1, captured('nuevo'));
    expect(frames.get(1)).toBe(again);
  });
});

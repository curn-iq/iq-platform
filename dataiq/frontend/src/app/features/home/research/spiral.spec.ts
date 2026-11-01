import {
  ACHIEVEMENTS,
  BEAM_LENGTH,
  COMPLETE_AT,
  createMotes,
  CYCLE,
  FADE_AT,
  GEOMETRY,
  LAPS,
  motePosition,
  segment,
  spiralFrame,
  stepMotes,
} from './spiral';

describe('spiralFrame', () => {
  it('al empezar no hay luz, ningún logro y el pulso espera abajo', () => {
    const frame = spiralFrame(0);

    expect(frame.theta).toBe(0);
    expect(frame.lightBack).toBe('');
    expect(frame.lightFront).toBe('');
    expect(frame.tail).toBe('');
    expect(frame.lap).toBe(0);
    expect(frame.achieved).toEqual([false, false, false, false]);
    expect(frame.lit.some(Boolean)).toBe(false);
    expect(frame.pulse.visible).toBe(true);
    expect(frame.beamOffset).toBe(BEAM_LENGTH);
    expect(frame.complete).toBe(false);
    expect(frame.fading).toBe(false);
  });

  it('el pulso arranca tras una pausa y avanza sin retroceder', () => {
    expect(spiralFrame(400).theta).toBe(0);
    let previous = 0;
    for (let t = 500; t <= 5100; t += 100) {
      const { theta } = spiralFrame(t);
      expect(theta).toBeGreaterThanOrEqual(previous);
      previous = theta;
    }
    expect(previous).toBeGreaterThan(0);
  });

  it('cada vuelta tarda menos que la anterior: el pulso acelera', () => {
    const lapEnds: number[] = [];
    let lap = 0;
    for (let t = 500; t <= 5100 && lap < LAPS; t += 1) {
      if (spiralFrame(t).lap > lap) {
        lap = spiralFrame(t).lap;
        lapEnds.push(t);
      }
    }
    expect(lapEnds.length).toBe(LAPS);
    const durations = [lapEnds[0] - 500, lapEnds[1] - lapEnds[0], lapEnds[2] - lapEnds[1]];
    expect(durations[1]).toBeLessThan(durations[0]);
    expect(durations[2]).toBeLessThan(durations[1]);
  });

  it('un logro aparece al cerrar cada vuelta y el último cuando el haz sube', () => {
    let achievedAt = [-1, -1, -1, -1];
    for (let t = 0; t <= COMPLETE_AT; t += 5) {
      spiralFrame(t).achieved.forEach((done, index) => {
        if (done && achievedAt[index] < 0) achievedAt[index] = t;
      });
    }
    expect(achievedAt.every((t) => t >= 0)).toBe(true);
    expect(achievedAt).toEqual([...achievedAt].sort((a, b) => a - b));
    expect(spiralFrame(COMPLETE_AT).achieved).toEqual([true, true, true, true]);
  });

  it('las estaciones se encienden de a una, en orden, al paso del pulso', () => {
    expect(GEOMETRY.stations.length).toBe(LAPS * 3);
    const thetas = GEOMETRY.stations.map((station) => station.theta);
    expect(thetas).toEqual([...thetas].sort((a, b) => a - b));
    expect(spiralFrame(COMPLETE_AT).lit.every(Boolean)).toBe(true);
  });

  it('al terminar el recorrido la espiral está completa y el haz sube del todo', () => {
    const end = spiralFrame(COMPLETE_AT);

    expect(end.complete).toBe(true);
    expect(end.progress).toBe(1);
    expect(end.lap).toBe(LAPS);
    expect(end.beamOffset).toBe(0);
    expect(end.pulse.visible).toBe(false);
    expect(end.tail).toBe('');
    expect(end.ambient).toBeCloseTo(1);
  });

  it('el pulso sube por el haz cuando termina el recorrido', () => {
    const before = spiralFrame(500 + 4600);
    const after = spiralFrame(500 + 4600 + 350);

    expect(after.pulse.y).toBeLessThan(before.pulse.y);
  });

  it('se apaga antes de volver a empezar', () => {
    expect(spiralFrame(FADE_AT).fading).toBe(false);
    expect(spiralFrame(FADE_AT + 1).fading).toBe(true);
    expect(FADE_AT).toBeLessThan(CYCLE);
  });

  it('deja una cola detrás del pulso mientras viaja', () => {
    expect(spiralFrame(3000).tail.startsWith('M')).toBe(true);
  });
});

describe('segment', () => {
  it('traza solo los tramos de adelante o de atrás', () => {
    // Entre 0 y π la espiral viene hacia adelante; entre π y 2π, por detrás
    const eps = 0.1;
    expect(segment(eps, Math.PI - eps, true).startsWith('M')).toBe(true);
    expect(segment(eps, Math.PI - eps, false)).toBe('');
    expect(segment(Math.PI + eps, 2 * Math.PI - eps, true)).toBe('');
    expect(segment(Math.PI + eps, 2 * Math.PI - eps, false).startsWith('M')).toBe(true);
  });
});

describe('GEOMETRY', () => {
  it('hay un anillo por vuelta y un logro más: el último junto al haz', () => {
    expect(GEOMETRY.levels.length).toBe(LAPS);
    expect(GEOMETRY.achievements.map((a) => a.text)).toEqual([...ACHIEVEMENTS]);
    expect(GEOMETRY.achievements.map((a) => a.final)).toEqual([false, false, false, true]);
  });

  it('cada logro es tan ancho como su texto', () => {
    const [first, , third] = GEOMETRY.achievements;
    expect(third.width).toBeGreaterThan(first.width);
  });

  it('cada nivel sube más que el anterior', () => {
    const ys = GEOMETRY.levels.map((level) => level.cy);
    expect(ys).toEqual([...ys].sort((a, b) => b - a));
  });
});

describe('motas', () => {
  it('son 34 y siempre las mismas', () => {
    expect(createMotes().length).toBe(34);
    expect(createMotes()).toEqual(createMotes());
  });

  it('suben con el tiempo y más rápido con el impulso', () => {
    const [mote] = createMotes(1);
    const slow = stepMotes([mote], 100, 0)[0];
    const fast = stepMotes([mote], 100, 1)[0];

    expect(slow.y).toBeLessThan(mote.y);
    expect(fast.y).toBeLessThan(slow.y);
  });

  it('al salir por arriba vuelven a entrar por abajo', () => {
    const [mote] = createMotes(1);
    const next = stepMotes([{ ...mote, y: -9.9 }], 1000, 0)[0];

    expect(next.y).toBeGreaterThan(600);
  });

  it('son más tenues hacia los bordes y se mecen de lado a lado', () => {
    const [mote] = createMotes(1);
    const middle = stepMotes([{ ...mote, y: 340 }], 0, 0)[0];
    const edge = stepMotes([{ ...mote, y: 20 }], 0, 0)[0];

    expect(middle.opacity).toBeGreaterThan(edge.opacity);
    expect(motePosition({ ...mote, phase: 0 })[0]).toBe(mote.x);
    expect(motePosition({ ...mote, phase: Math.PI / 2 })[0]).toBeCloseTo(mote.x + 6);
  });
});

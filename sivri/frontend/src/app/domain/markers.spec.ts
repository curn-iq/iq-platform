import { boardAxes, estimateMissingMarker, markerStatus } from './markers';
import { ALL_MARKERS } from './testing';

const without = (...ids: number[]) => ALL_MARKERS.filter((m) => !ids.includes(m.id));

describe('markerStatus', () => {
  it('con los cuatro está completo y no dice nada', () => {
    const status = markerStatus(ALL_MARKERS);
    expect(status).toMatchObject({ seen: 4, complete: true, phrase: null, hint: null });
  });

  it('con uno que falta dice cuál, como en el mockup', () => {
    const status = markerStatus(without(2));
    expect(status.seen).toBe(3);
    expect(status.complete).toBe(false);
    expect(status.missing).toEqual([2]);
    expect(status.phrase).toBe('Falta el de abajo a la derecha.');
    expect(status.hint).toBe('Revisa que no lo tape la mano ni el instrumental.');
  });

  it('con dos o tres que faltan las junta con «y» y pone el verbo en plural', () => {
    expect(markerStatus(without(0, 2)).phrase).toBe(
      'Faltan el de arriba a la izquierda y el de abajo a la derecha.',
    );
    expect(markerStatus(without(1, 2, 3)).phrase).toBe(
      'Faltan el de arriba a la derecha, el de abajo a la derecha y el de abajo a la izquierda.',
    );
    expect(markerStatus(without(0, 2)).hint).toBe(
      'Revisa que no los tape la mano ni el instrumental.',
    );
  });

  it('sin ninguno lo dice aparte', () => {
    const status = markerStatus([]);
    expect(status.seen).toBe(0);
    expect(status.phrase).toBe('No se ve ninguno de los cuatro marcadores.');
  });

  it('cuenta cada id una vez y ignora los que no son de la mesa', () => {
    const status = markerStatus([{ id: 0 }, { id: 0 }, { id: 7 }, { id: 1 }]);
    expect(status.seen).toBe(2);
    expect(status.missing).toEqual([2, 3]);
  });
});

describe('estimateMissingMarker', () => {
  it('calcula la esquina que falta con las otras tres', () => {
    for (const id of [0, 1, 2, 3]) {
      const real = ALL_MARKERS.find((m) => m.id === id)!;
      const estimate = estimateMissingMarker(without(id))!;
      expect(estimate.id).toBe(id);
      expect(estimate.x).toBeCloseTo(real.x);
      expect(estimate.y).toBeCloseTo(real.y);
    }
  });

  it('con otra cantidad de marcadores no puede saberlo', () => {
    expect(estimateMissingMarker(ALL_MARKERS)).toBeNull();
    expect(estimateMissingMarker(without(0, 1))).toBeNull();
  });
});

describe('boardAxes', () => {
  it('con la cámara paralela a la mesa, los ejes son los del cuadro', () => {
    const axes = boardAxes(ALL_MARKERS)!;
    expect(axes.columns).toEqual({ x: 1, y: 0 });
    expect(axes.rows).toEqual({ x: 0, y: 1 });
  });

  it('con el celular girado un cuarto de vuelta, los ejes giran con él', () => {
    // La mesa girada 90°: la esquina 0 queda arriba a la derecha y la 1 abajo a la derecha
    const rotated = [
      { id: 0, x: 0.9, y: 0.1 },
      { id: 1, x: 0.9, y: 0.9 },
      { id: 2, x: 0.1, y: 0.9 },
      { id: 3, x: 0.1, y: 0.1 },
    ];
    const axes = boardAxes(rotated)!;
    expect(axes.columns.x).toBeCloseTo(0);
    expect(axes.columns.y).toBeCloseTo(1);
    expect(axes.rows.x).toBeCloseTo(-1);
    expect(axes.rows.y).toBeCloseTo(0);
  });

  it('sin los cuatro marcadores no hay ejes', () => {
    expect(boardAxes(without(3))).toBeNull();
  });
});

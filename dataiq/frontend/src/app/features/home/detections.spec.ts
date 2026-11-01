import { detectionLabel, labelSize, overlap, placeLabels, type Box } from './detections';

const box = (x: number, y: number, width: number, height: number): Box => ({
  x,
  y,
  width,
  height,
});

describe('overlap', () => {
  it('es el área compartida de dos rectángulos', () => {
    expect(overlap(box(0, 0, 10, 10), box(5, 5, 10, 10))).toBe(25);
  });

  it('es 0 si solo se tocan por el borde o están lejos', () => {
    expect(overlap(box(0, 0, 10, 10), box(10, 0, 10, 10))).toBe(0);
    expect(overlap(box(0, 0, 10, 10), box(40, 40, 10, 10))).toBe(0);
  });
});

describe('detectionLabel', () => {
  it('dice el nombre y la confianza', () => {
    expect(detectionLabel('Allis', '0,97', false)).toBe('Allis 0,97');
  });

  it('en celular dice solo el nombre', () => {
    expect(detectionLabel('Allis', '0,97', true)).toBe('Allis');
  });
});

describe('labelSize', () => {
  it('crece con el texto y con el tamaño de la letra', () => {
    expect(labelSize('Allis 0,97', 14).width).toBeGreaterThan(labelSize('Allis', 14).width);
    expect(labelSize('Allis', 26).width).toBeGreaterThan(labelSize('Allis', 14).width);
    expect(labelSize('Allis', 14).height).toBe(24);
  });
});

describe('placeLabels', () => {
  const size = { width: 100, height: 24 };

  it('pone la etiqueta arriba a la izquierda de su caja si cabe', () => {
    const [label] = placeLabels([box(300, 300, 60, 60)], [size]);
    expect(label).toEqual({ x: 300, y: 300 - 24 - 3, width: 100, height: 24 });
  });

  it('la baja a la caja si arriba no hay sitio', () => {
    const [label] = placeLabels([box(300, 0, 60, 60)], [size]);
    expect(label.y).toBeGreaterThanOrEqual(0);
    expect(overlap(label, box(300, 0, 60, 60))).toBeLessThan(100 * 24);
  });

  it('no pone dos etiquetas una sobre otra', () => {
    const boxes = [box(300, 300, 60, 60), box(310, 300, 60, 60)];
    const labels = placeLabels(boxes, [size, size]);
    expect(overlap(labels[0], labels[1])).toBe(0);
  });

  it('respeta lo reservado', () => {
    const reserved = box(300, 273, 100, 24);
    const [label] = placeLabels([box(300, 300, 60, 60)], [size], [reserved]);
    expect(overlap(label, reserved)).toBe(0);
  });

  it('no se sale del dibujo', () => {
    const [label] = placeLabels([box(650, 650, 40, 40)], [size], [], 700);
    expect(label.x + label.width).toBeLessThanOrEqual(698);
    expect(label.y + label.height).toBeLessThanOrEqual(698);
    expect(label.x).toBeGreaterThanOrEqual(2);
  });
});

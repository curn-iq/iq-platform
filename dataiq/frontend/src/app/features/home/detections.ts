/** Un rectángulo en las unidades del dibujo de la mesa. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** El tamaño de una etiqueta de detección, antes de ponerla. */
export interface LabelSize {
  width: number;
  height: number;
}

/** Margen que se deja entre la caja de una pieza y la caja de su etiqueta. */
const GAP = 3;

/** Separación mínima de la etiqueta al borde del dibujo. */
const EDGE = 2;

/**
 * Ancho de un carácter de Martian Mono, en veces el tamaño de la letra. La
 * etiqueta se dimensiona antes de pintarla, así que se estima; el relleno de la
 * etiqueta absorbe la diferencia.
 */
const MONO_ADVANCE = 0.72;

/** Lo que dice la etiqueta de una detección: «Allis 0,97»; en celular, solo el nombre. */
export function detectionLabel(short: string, confidence: string, narrow: boolean): string {
  return narrow ? short : `${short} ${confidence}`;
}

/** Lo que mide un texto en Martian Mono a un tamaño de letra. */
export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * MONO_ADVANCE;
}

/** El tamaño de la etiqueta de un texto a un tamaño de letra, como lo calcula la cámara. */
export function labelSize(text: string, fontSize: number): LabelSize {
  return { width: textWidth(text, fontSize) + fontSize * 1.1, height: fontSize + 10 };
}

/** El área en que se solapan dos rectángulos; 0 si no se tocan. */
export function overlap(a: Box, b: Box): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

/**
 * Dónde pone la cámara la etiqueta de cada caja: arriba a la izquierda, arriba a
 * la derecha, abajo, a los lados y, de último, dentro. Cada una toma el sitio
 * que menos choca con las etiquetas ya puestas (pesan más), con las demás cajas
 * y con lo `reserved` (p. ej. el rótulo «Va aquí»), y que queda más arriba en esa
 * lista cuando hay empate. `bounds` es el lado del dibujo, que la etiqueta no
 * puede pasar.
 */
export function placeLabels(
  boxes: readonly Box[],
  sizes: readonly LabelSize[],
  reserved: readonly Box[] = [],
  bounds = 700,
): Box[] {
  const placed: Box[] = [...reserved];
  return boxes.map((box, index) => {
    const { width, height } = sizes[index];
    const right = box.x + box.width - width;
    const candidates: [number, number][] = [
      [box.x, box.y - height - GAP],
      [right, box.y - height - GAP],
      [box.x, box.y + box.height + GAP],
      [right, box.y + box.height + GAP],
      [box.x - width - GAP, box.y],
      [box.x + box.width + GAP, box.y],
      [box.x + GAP, box.y + GAP],
    ];
    let best: Box | null = null;
    let lowest = Infinity;
    candidates.forEach(([x, y], rank) => {
      const label: Box = {
        x: Math.min(Math.max(x, EDGE), bounds - EDGE - width),
        y: Math.min(Math.max(y, EDGE), bounds - EDGE - height),
        width,
        height,
      };
      let cost = rank * 4;
      for (const other of placed) cost += overlap(label, other) * 6;
      boxes.forEach((otherBox, otherIndex) => {
        if (otherIndex !== index) cost += overlap(label, otherBox);
      });
      if (cost < lowest) {
        lowest = cost;
        best = label;
      }
    });
    placed.push(best!);
    return best!;
  });
}

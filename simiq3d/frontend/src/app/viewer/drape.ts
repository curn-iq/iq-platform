import { BufferGeometry, Float32BufferAttribute } from 'three';

/**
 * La funda de la mesa de Mayo, como las reales (`DESIGN.md`, «Bandeja y funda»):
 * una sola tela tensa sobre la bandeja que pasa redondeada por los bordes, baja
 * unos centímetros por tres lados y cae por el extremo libre, el contrario al
 * poste, con pliegues que crecen hacia abajo. Medidas en metros.
 */
export interface DrapeShape {
  /** Lo que cubre: el ancho (X) y el fondo (Z) de la bandeja por fuera. */
  width: number;
  depth: number;
  /** El alto de la cara de arriba de la funda. */
  top: number;
  /** El radio con que la tela pasa por los bordes. */
  edge: number;
  /** Cuánto baja por los lados y por el extremo del poste. */
  wrap: number;
  /** Cuánto cae por el extremo libre (+X). */
  fall: number;
}

/** Un punto del perfil: dónde va (horizontal, alto) y cuánto bajó desde el borde. */
interface ProfilePoint {
  along: number;
  height: number;
  drop: number;
}

/**
 * El perfil de la tela en un corte: baja por un lado, pasa redondeada por el
 * borde, cruza la bandeja, vuelve a pasar por el otro borde y baja. `steps` son
 * los puntos de cada tramo recto vertical; la curva y el plano llevan los suyos.
 */
function profile(
  half: number,
  edge: number,
  top: number,
  startDrop: number,
  endDrop: number,
  startSteps: number,
  endSteps: number,
): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  const side = half + edge;
  for (let i = 0; i < startSteps; i++) {
    const drop = startDrop - ((startDrop - edge) * i) / startSteps;
    points.push({ along: -side, height: top - drop, drop });
  }
  const ARC = 8;
  for (let i = 0; i <= ARC; i++) {
    const angle = Math.PI - (Math.PI / 2) * (i / ARC);
    points.push({
      along: -half + edge * Math.cos(angle),
      height: top - edge + edge * Math.sin(angle),
      drop: 0,
    });
  }
  const FLAT = 24;
  for (let i = 1; i < FLAT; i++) {
    points.push({ along: -half + (2 * half * i) / FLAT, height: top, drop: 0 });
  }
  for (let i = 0; i <= ARC; i++) {
    const angle = (Math.PI / 2) * (1 - i / ARC);
    points.push({
      along: half + edge * Math.cos(angle),
      height: top - edge + edge * Math.sin(angle),
      drop: 0,
    });
  }
  for (let i = 1; i <= endSteps; i++) {
    const drop = edge + ((endDrop - edge) * i) / endSteps;
    points.push({ along: side, height: top - drop, drop });
  }
  return points;
}

/** La geometría de la funda, con normales suaves para que se vea como tela. */
export function drapeGeometry(shape: DrapeShape): BufferGeometry {
  const { width, depth, top, edge, wrap, fall } = shape;
  // A lo largo (X): el extremo del poste baja poco; el libre cae
  const alongX = profile(width / 2, edge, top, wrap, fall, 4, 40);
  // A lo ancho (Z): baja poco por los dos lados
  const alongZ = profile(depth / 2, edge, top, wrap, wrap, 4, 4);

  const positions: number[] = [];
  const uvs: number[] = [];
  alongX.forEach((x, i) => {
    alongZ.forEach((z, j) => {
      // Lo que cae por el extremo libre forma pliegues que crecen hacia abajo y se
      // separa un poco de la mesa, como una tela que cuelga
      const hanging = x.along > 0 && x.drop > edge ? (x.drop - edge) / (fall - edge) : 0;
      const fold = 0.012 * Math.pow(hanging, 0.7) * Math.sin((2 * Math.PI * z.along) / 0.085 + 0.6);
      const flare = 0.025 * hanging * hanging;
      // Por los lados la tela ondula apenas
      const sideWave = z.drop > 0 ? 0.0015 * Math.sin((2 * Math.PI * x.along) / 0.11) : 0;
      positions.push(
        x.along + fold + flare,
        // Donde bajan los dos perfiles (las esquinas), la tela cae más
        x.height + z.height - top,
        z.along + Math.sign(z.along) * sideWave,
      );
      // Por posición sobre la bandeja: los dobleces del empaque quedan en el mismo lugar
      uvs.push((x.along + width / 2) / width, (z.along + depth / 2) / depth);
    });
  });

  const indices: number[] = [];
  const columns = alongZ.length;
  for (let i = 0; i < alongX.length - 1; i++) {
    for (let j = 0; j < columns - 1; j++) {
      const a = i * columns + j;
      const b = a + columns;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

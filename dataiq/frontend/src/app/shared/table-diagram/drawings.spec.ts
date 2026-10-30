import { DRAWINGS, type DrawingKey } from './drawings';

const STEEL: DrawingKey[] = [
  'scalpel',
  'metzenbaum',
  'mayo',
  'dissecting',
  'farabeuf',
  'senn',
  'allis',
  'lahey',
  'rochester',
  'mosquito',
  'kelly',
  'cystic',
  'towelClamp',
  'energy',
  'needleHolder',
  'frazier',
];
const FLAT: DrawingKey[] = ['drapePack', 'sponges', 'tray', 'suctionTubing', 'threadedSponge'];

describe('DRAWINGS', () => {
  it('tiene los dieciséis instrumentos de acero y los cinco objetos planos de los mockups', () => {
    for (const key of STEEL) expect(DRAWINGS[key].kind, key).toBe('steel');
    for (const key of FLAT) expect(DRAWINGS[key].kind, key).toBe('flat');
    expect(Object.keys(DRAWINGS)).toHaveLength(STEEL.length + FLAT.length);
  });

  it('cada dibujo tiene partes y cada parte lleva su forma', () => {
    for (const [key, drawing] of Object.entries(DRAWINGS)) {
      expect(drawing.parts.length, key).toBeGreaterThan(0);
      for (const part of drawing.parts) {
        if (part.shape === 'path') expect(part.d, key).toMatch(/^M/);
        if (part.shape === 'rect') expect(part.width, key).toBeGreaterThan(0);
        if (part.shape === 'circle') expect(part.r, key).toBeGreaterThan(0);
      }
    }
  });

  it('el acero se dibuja vertical: la punta en y = 0 y el mango en y = 100', () => {
    // La pinza Kelly: el cuerpo arranca en la punta (y ≈ 4–8) y los anillos están sobre y = 92
    const kelly = DRAWINGS.kelly.parts.filter((part) => part.shape === 'path');
    expect(kelly.some((part) => part.d.includes('92a'))).toBe(true);
  });

  it('el objeto plano está centrado en el origen, para ponerlo en el centro de su celda', () => {
    const tray = DRAWINGS.tray.parts;
    expect(tray[0]).toMatchObject({ shape: 'rect', x: -38, y: -28, width: 76, height: 56 });
  });

  it('las tijeras comparten el mismo mecanismo y difieren en sus medidas', () => {
    const mayo = JSON.stringify(DRAWINGS.mayo.parts);
    const metzenbaum = JSON.stringify(DRAWINGS.metzenbaum.parts);
    expect(mayo).not.toBe(metzenbaum);
  });
});

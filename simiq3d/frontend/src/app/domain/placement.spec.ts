import type { MayoTable, TableItem } from './mayo-table';
import { placeItems } from './placement';

describe('placeItems', () => {
  const MODELS: Record<string, string> = {
    'i-kelly': 'kelly_forceps.glb',
    'i-mango': 'scalpel_handle_4.glb',
    'i-hoja': 'scalpel_blade_20.glb',
    'i-allis': 'allis_forceps.glb',
  };
  const modelFor = (id: string) => MODELS[id];
  const item = (
    id: string,
    instrumentIds: string[],
    cells = [{ row: 1, column: 1 }],
  ): TableItem => ({
    id,
    legendNumber: 1,
    name: id,
    instrumentIds,
    cells,
  });
  const table = (items: TableItem[]): MayoTable => ({ rows: 4, columns: 7, items });

  it('cada objeto va al centro de sus celdas, con su modelo', () => {
    const [kelly] = placeItems(table([item('kelly', ['i-kelly'])]), modelFor);
    expect(kelly.itemId).toBe('kelly');
    expect(kelly.x).toBeCloseTo(-0.24);
    expect(kelly.z).toBeCloseTo(-0.15);
    expect(kelly.models).toEqual([{ file: 'kelly_forceps.glb', mountOn: null }]);
  });

  it('la hoja de bisturí se monta en el mango del mismo objeto', () => {
    const [scalpel] = placeItems(table([item('bisturi', ['i-mango', 'i-hoja'])]), modelFor);
    expect(scalpel.models).toEqual([
      { file: 'scalpel_handle_4.glb', mountOn: null },
      { file: 'scalpel_blade_20.glb', mountOn: 0 },
    ]);
  });

  it('sin mango, la hoja va suelta sobre la mesa', () => {
    const [blade] = placeItems(table([item('hoja', ['i-hoja'])]), modelFor);
    expect(blade.models).toEqual([{ file: 'scalpel_blade_20.glb', mountOn: null }]);
  });

  it('dos instrumentos independientes en un objeto van los dos sueltos', () => {
    const [pair] = placeItems(table([item('par', ['i-kelly', 'i-allis'])]), modelFor);
    expect(pair.models.map((m) => m.mountOn)).toEqual([null, null]);
  });

  it('lo que no tiene modelo 3D no se dibuja, y un objeto sin celdas no tiene dónde ir', () => {
    const placed = placeItems(
      table([
        item('compresa', ['i-compresa']),
        item('sin-lugar', ['i-kelly'], []),
        item('kelly', ['i-kelly', 'i-compresa']),
      ]),
      modelFor,
    );
    expect(placed.map((p) => p.itemId)).toEqual(['kelly']);
    expect(placed[0].models).toEqual([{ file: 'kelly_forceps.glb', mountOn: null }]);
  });
});

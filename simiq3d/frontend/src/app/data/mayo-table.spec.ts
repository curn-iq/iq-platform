import type { TechniqueInstruments } from './api/models';
import { MAYO_ZONE, toMayoTable } from './mayo-table';

describe('toMayoTable', () => {
  const zones = [
    { zone_id: 'z-mayo', zone: MAYO_ZONE, used: true, rows: 4, columns: 7 },
    { zone_id: 'z-reserva', zone: 'Mesa de reserva', used: true, rows: 3, columns: 5 },
  ];
  const item = (
    id: string,
    zone: string,
    components: TechniqueInstruments['items'][number]['components'],
  ) => ({
    id,
    zone_id: zone,
    zone: null,
    legend_number: 1,
    source_text: 'texto de la fuente',
    components,
    cells: [{ row: 2, column: 3 }],
  });
  const technique = (overrides: Partial<TechniqueInstruments> = {}): TechniqueInstruments => ({
    zones,
    items: [
      item('kelly', 'z-mayo', [{ instrument_id: 'i-kelly', suture_id: null, name: 'Pinza Kelly' }]),
      item('bisturi', 'z-mayo', [
        { instrument_id: 'i-mango', suture_id: null, name: 'Mango de bisturí N.° 4' },
        { instrument_id: 'i-hoja', suture_id: null, name: 'Hoja de bisturí #20' },
      ]),
      item('compresa', 'z-reserva', [
        { instrument_id: 'i-compresa', suture_id: null, name: 'Compresa' },
      ]),
    ],
    sutures: [],
    equipment: [],
    devices: [],
    ...overrides,
  });

  it('trae la mesa de Mayo con su tamaño y solo sus objetos', () => {
    const table = toMayoTable(technique());
    expect(table?.rows).toBe(4);
    expect(table?.columns).toBe(7);
    expect(table?.items.map((i) => i.id)).toEqual(['kelly', 'bisturi']);
  });

  it('cada objeto lleva el nombre de la leyenda, sus instrumentos en orden y sus celdas', () => {
    const [, scalpel] = toMayoTable(technique())!.items;
    expect(scalpel.name).toBe('Mango de bisturí N.° 4 y Hoja de bisturí #20');
    expect(scalpel.instrumentIds).toEqual(['i-mango', 'i-hoja']);
    expect(scalpel.cells).toEqual([{ row: 2, column: 3 }]);
  });

  it('las suturas de un objeto no son instrumentos que se dibujen', () => {
    const table = toMayoTable(
      technique({
        items: [
          item('compresa-sutura', 'z-mayo', [
            { instrument_id: 'i-compresa', suture_id: null, name: 'Compresa' },
            { instrument_id: null, suture_id: 's-seda', name: 'Seda 2/0' },
          ]),
        ],
      }),
    );
    expect(table?.items[0].instrumentIds).toEqual(['i-compresa']);
  });

  it('sin mesa de Mayo, o sin su tamaño, no hay mesa que dibujar', () => {
    const notUsed = [{ ...zones[0], used: false, rows: null, columns: null }];
    const noSize = [{ ...zones[0], rows: null, columns: null }];
    expect(toMayoTable(technique({ zones: notUsed }))).toBeNull();
    expect(toMayoTable(technique({ zones: noSize }))).toBeNull();
    expect(toMayoTable(technique({ zones: [zones[1]] }))).toBeNull();
  });
});

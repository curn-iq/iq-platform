import { instrumentalSheet, type InstrumentalSource, type PlaneSuture } from './instrumental-sheet';

const EMPTY: InstrumentalSource = { items: [], sutures: [], equipment: [], devices: [] };

const item = (sourceText: string, ...names: string[]) => ({
  source_text: sourceText,
  components: names.map((name) => ({ name })),
});

describe('instrumentalSheet', () => {
  describe('objetos', () => {
    it('cada objeto lleva el nombre de la leyenda, en el orden de la API', () => {
      const sheet = instrumentalSheet({
        ...EMPTY,
        items: [
          item('Pinza Kelly', 'Pinza Kelly'),
          item('Mango y hoja', 'Mango de bisturí N.° 3', 'Hoja de bisturí #15'),
        ],
      });

      expect(sheet.objects).toEqual([
        'Pinza Kelly',
        'Mango de bisturí N.° 3 y Hoja de bisturí #15',
      ]);
    });

    it('un objeto sin componentes dice lo que escribió la fuente', () => {
      expect(instrumentalSheet({ ...EMPTY, items: [item('Gasas')] }).objects).toEqual(['Gasas']);
    });
  });

  describe('suturas', () => {
    const suture = (overrides: Partial<PlaneSuture> = {}): PlaneSuture => ({
      plane: 'Piel',
      name: 'Seda',
      gauge: '2/0',
      needleType: 'aguja cortante de 3/8 de círculo',
      ...overrides,
    });

    it('lleva la sutura con su calibre y, tras una coma, su aguja', () => {
      const sheet = instrumentalSheet({ ...EMPTY, sutures: [suture()] });

      expect(sheet.sutures).toEqual([
        { plane: 'Piel', text: 'Seda 2/0, aguja cortante de 3/8 de círculo' },
      ]);
    });

    it('lo que falta en la sutura no deja comas ni espacios de más', () => {
      const sheet = instrumentalSheet({
        ...EMPTY,
        sutures: [
          suture({ gauge: null }),
          suture({ needleType: null }),
          suture({ gauge: null, needleType: null }),
        ],
      });

      expect(sheet.sutures.map((row) => row.text)).toEqual([
        'Seda, aguja cortante de 3/8 de círculo',
        'Seda 2/0',
        'Seda',
      ]);
    });

    it('una sutura sin plano va en una fila sin plano', () => {
      const sheet = instrumentalSheet({ ...EMPTY, sutures: [suture({ plane: null })] });

      expect(sheet.sutures).toEqual([
        { plane: null, text: 'Seda 2/0, aguja cortante de 3/8 de círculo' },
      ]);
    });

    it('conserva el orden de las suturas de la API', () => {
      const sheet = instrumentalSheet({
        ...EMPTY,
        sutures: [suture({ name: 'Vicryl', plane: 'Músculo' }), suture({ plane: 'Piel' })],
      });

      expect(sheet.sutures.map((row) => row.plane)).toEqual(['Músculo', 'Piel']);
    });
  });

  it('los equipos y el equipo médico-quirúrgico van por su nombre', () => {
    const sheet = instrumentalSheet({
      ...EMPTY,
      equipment: [{ name: 'Electrobisturí' }, { name: 'Bisturí armónico' }],
      devices: [{ name: 'Campo adhesivo' }],
    });

    expect(sheet.equipment).toEqual(['Electrobisturí', 'Bisturí armónico']);
    expect(sheet.devices).toEqual(['Campo adhesivo']);
  });

  it('sin nada, todo queda vacío', () => {
    expect(instrumentalSheet(EMPTY)).toEqual({
      objects: [],
      sutures: [],
      equipment: [],
      devices: [],
    });
  });
});

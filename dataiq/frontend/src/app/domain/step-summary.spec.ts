import { stepSummaries } from './step-summary';
import { versionProgress, type ProgressSource } from './version-progress';

const MAYO = { zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true };
const RESERVE = { zone_id: 'z-reserva', zone: 'Mesa de reserva', used: true };
const placed = (zoneId: string) => ({ zone_id: zoneId, cells: [{ row: 1, column: 1 }] });
const unplaced = (zoneId: string) => ({ zone_id: zoneId, cells: [] });

const COMPLETE: ProgressSource = {
  description: 'a',
  indications: 'a',
  anesthesia: 'a',
  drapes: 'a',
  patient_position: 'a',
  source: 'a',
  zones: [MAYO, RESERVE],
  items: [placed('z-mayo'), placed('z-reserva')],
  sutures: [{ name: 'Seda' }],
};

const summaries = (source: ProgressSource, publishesOwn = false) =>
  stepSummaries(versionProgress(source), publishesOwn);
const bySlug = (list: ReturnType<typeof summaries>, slug: string) =>
  list.find((step) => step.slug === slug)!;

describe('stepSummaries', () => {
  it('son los cinco pasos del editor, en su orden', () => {
    expect(summaries(COMPLETE).map((step) => step.slug)).toEqual([
      'datos-clinicos',
      'instrumental',
      'mesa-de-mayo',
      'mesa-de-reserva',
      'revisar',
    ]);
  });

  describe('datos clínicos', () => {
    it('completos', () => {
      expect(bySlug(summaries(COMPLETE), 'datos-clinicos')).toMatchObject({
        mark: 'complete',
        hint: 'Completo',
        stateName: 'completo',
      });
    });

    it('falta un campo, en singular', () => {
      const step = bySlug(summaries({ ...COMPLETE, drapes: null }), 'datos-clinicos');

      expect(step).toMatchObject({
        mark: 'in_progress',
        hint: 'Falta 1 campo',
        stateName: 'en curso',
      });
    });

    it('faltan varios, en plural; la sutura cuenta como un campo', () => {
      const step = bySlug(
        summaries({ ...COMPLETE, drapes: null, anesthesia: '', sutures: [] }),
        'datos-clinicos',
      );

      expect(step.hint).toBe('Faltan 3 campos');
    });

    it('sin nada, pendientes y con los siete campos por llenar', () => {
      const step = bySlug(
        summaries({
          zones: [],
          items: [],
          sutures: [],
        }),
        'datos-clinicos',
      );

      expect(step).toMatchObject({
        mark: 'pending',
        hint: 'Faltan 7 campos',
        stateName: 'pendiente',
      });
    });
  });

  describe('instrumental', () => {
    it('sin objetos', () => {
      expect(bySlug(summaries({ ...COMPLETE, items: [] }), 'instrumental')).toMatchObject({
        mark: 'pending',
        hint: 'Sin instrumental',
      });
    });

    it('un objeto, en singular', () => {
      const step = bySlug(summaries({ ...COMPLETE, items: [placed('z-mayo')] }), 'instrumental');

      expect(step).toMatchObject({ mark: 'complete', hint: '1 objeto' });
    });

    it('varios objetos, en plural', () => {
      expect(bySlug(summaries(COMPLETE), 'instrumental').hint).toBe('2 objetos');
    });
  });

  describe('mesas', () => {
    it('cuántos objetos están ubicados', () => {
      const step = bySlug(
        summaries({
          ...COMPLETE,
          items: [placed('z-mayo'), unplaced('z-mayo'), unplaced('z-mayo')],
        }),
        'mesa-de-mayo',
      );

      expect(step).toMatchObject({ mark: 'in_progress', hint: '1 de 3 ubicados' });
    });

    it('todos ubicados', () => {
      expect(bySlug(summaries(COMPLETE), 'mesa-de-mayo')).toMatchObject({
        mark: 'complete',
        hint: '1 de 1 ubicados',
      });
    });

    it('la mesa que se lleva y no tiene objetos', () => {
      const step = bySlug(summaries({ ...COMPLETE, items: [placed('z-reserva')] }), 'mesa-de-mayo');

      expect(step).toMatchObject({ mark: 'pending', hint: 'Sin objetos' });
    });

    it('la mesa que la versión dice que no lleva', () => {
      const step = bySlug(
        summaries({ ...COMPLETE, zones: [MAYO, { ...RESERVE, used: false }] }),
        'mesa-de-reserva',
      );

      expect(step).toMatchObject({ mark: 'complete', hint: 'No lleva' });
    });

    it('la mesa de la que la versión no dice nada: «sin arreglo disponible»', () => {
      const step = bySlug(summaries({ ...COMPLETE, zones: [MAYO] }), 'mesa-de-reserva');

      expect(step).toMatchObject({
        mark: 'no_table',
        hint: 'Sin arreglo disponible',
        stateName: 'sin arreglo',
      });
    });
  });

  describe('revisar', () => {
    it('con todo completo es la flecha, y dice si se envía o se publica', () => {
      expect(bySlug(summaries(COMPLETE, false), 'revisar')).toMatchObject({
        mark: 'ready',
        hint: 'Lista para enviar',
        stateName: 'listo',
      });
      expect(bySlug(summaries(COMPLETE, true), 'revisar').hint).toBe('Lista para publicar');
    });

    it('«sin mesa» no bloquea', () => {
      const step = bySlug(summaries({ ...COMPLETE, zones: [MAYO] }), 'revisar');

      expect(step.mark).toBe('ready');
    });

    it('con una sección sin completar es el candado y dice cuántas faltan', () => {
      expect(bySlug(summaries({ ...COMPLETE, drapes: null }), 'revisar')).toMatchObject({
        mark: 'locked',
        hint: 'Falta 1 paso',
        stateName: 'bloqueado',
      });
      expect(bySlug(summaries({ ...COMPLETE, drapes: null, items: [] }), 'revisar').hint).toBe(
        'Faltan 4 pasos',
      );
    });
  });
});

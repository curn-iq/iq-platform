import { versionProgress, type ProgressSource } from './version-progress';

const MAYO = { zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true };
const RESERVE = { zone_id: 'z-reserva', zone: 'Mesa de reserva', used: true };

const placed = (zoneId: string | null) => ({
  zone_id: zoneId,
  cells: [{ row: 1, column: 1 }],
});
const unplaced = (zoneId: string | null) => ({ zone_id: zoneId, cells: [] });

/** Una versión con todo lo obligatorio lleno y las dos mesas armadas. */
const COMPLETE: ProgressSource = {
  description: 'Extirpar la glándula tiroides.',
  indications: 'Bocio multinodular.',
  anesthesia: 'General.',
  drapes: 'Campos estériles.',
  patient_position: 'Decúbito supino.',
  source: 'Documento de IQ, 2026.',
  zones: [MAYO, RESERVE],
  items: [placed('z-mayo'), placed('z-reserva')],
  sutures: [{}],
};

const without = (...fields: (keyof ProgressSource)[]): ProgressSource => {
  const copy: Record<string, unknown> = { ...COMPLETE };
  for (const field of fields) copy[field] = field === 'sutures' ? [] : null;
  return copy as unknown as ProgressSource;
};

describe('versionProgress', () => {
  describe('datos clínicos', () => {
    it('completos con los seis campos y al menos una sutura', () => {
      expect(versionProgress(COMPLETE).clinical).toEqual({ status: 'complete', missing: [] });
    });

    it('en curso si falta alguno, y dice cuáles', () => {
      const clinical = versionProgress(without('anesthesia', 'source')).clinical;

      expect(clinical.status).toBe('in_progress');
      expect(clinical.missing).toEqual(['anesthesia', 'source']);
    });

    it('sin ninguna sutura están en curso: la sutura es un faltante más', () => {
      const clinical = versionProgress(without('sutures')).clinical;

      expect(clinical.status).toBe('in_progress');
      expect(clinical.missing).toEqual(['sutures']);
    });

    it('pendientes si no hay nada de lo obligatorio', () => {
      const clinical = versionProgress({
        ...COMPLETE,
        description: null,
        indications: '',
        anesthesia: undefined,
        drapes: null,
        patient_position: null,
        source: null,
        sutures: [],
      }).clinical;

      expect(clinical.status).toBe('pending');
      expect(clinical.missing).toEqual([
        'description',
        'indications',
        'anesthesia',
        'drapes',
        'patient_position',
        'source',
        'sutures',
      ]);
    });

    it('un texto en blanco cuenta como vacío', () => {
      const clinical = versionProgress({ ...COMPLETE, drapes: '  \n ' }).clinical;

      expect(clinical.missing).toEqual(['drapes']);
    });

    it('complicaciones, técnica quirúrgica y CUPS son opcionales', () => {
      const progress = versionProgress({
        ...COMPLETE,
        complications: null,
        surgical_technique: '',
        cups_code: null,
      });

      expect(progress.clinical.status).toBe('complete');
    });

    it('sin lo opcional ni lo obligatorio, sigue pendiente (lo opcional no cuenta como avance)', () => {
      const progress = versionProgress({
        ...without('description', 'indications', 'anesthesia', 'drapes', 'patient_position'),
        source: null,
        sutures: [],
        complications: 'Hemorragia.',
        cups_code: '061100',
      });

      expect(progress.clinical.status).toBe('pending');
    });
  });

  describe('instrumental', () => {
    it('completo con al menos un objeto', () => {
      const progress = versionProgress({ ...COMPLETE, items: [unplaced(null)] });

      expect(progress.instrumental).toEqual({ status: 'complete', count: 1 });
    });

    it('un objeto sin mesa cuenta: el instrumental no es la mesa', () => {
      const progress = versionProgress({ ...COMPLETE, zones: [], items: [unplaced(null)] });

      expect(progress.instrumental.status).toBe('complete');
    });

    it('pendiente sin objetos', () => {
      expect(versionProgress({ ...COMPLETE, items: [] }).instrumental).toEqual({
        status: 'pending',
        count: 0,
      });
    });
  });

  describe('mesas', () => {
    it('completa si la lleva y todos sus objetos tienen celda', () => {
      const progress = versionProgress({
        ...COMPLETE,
        items: [placed('z-mayo'), placed('z-mayo'), placed('z-reserva')],
      });

      expect(progress.mayo).toEqual({ status: 'complete', total: 2, placed: 2 });
      expect(progress.reserve).toEqual({ status: 'complete', total: 1, placed: 1 });
    });

    it('en curso si unos tienen celda y otros no', () => {
      const progress = versionProgress({
        ...COMPLETE,
        items: [placed('z-mayo'), unplaced('z-mayo'), unplaced('z-mayo')],
      });

      expect(progress.mayo).toEqual({ status: 'in_progress', total: 3, placed: 1 });
    });

    it('pendiente si ninguno tiene celda', () => {
      const progress = versionProgress({
        ...COMPLETE,
        items: [unplaced('z-mayo'), unplaced('z-mayo')],
      });

      expect(progress.mayo).toEqual({ status: 'pending', total: 2, placed: 0 });
    });

    it('pendiente si la lleva y todavía no tiene objetos', () => {
      const progress = versionProgress({ ...COMPLETE, items: [placed('z-reserva')] });

      expect(progress.mayo).toEqual({ status: 'pending', total: 0, placed: 0 });
    });

    it('completa si la versión dice que no la lleva (`used: false`), aunque no tenga objetos', () => {
      const progress = versionProgress({
        ...COMPLETE,
        zones: [MAYO, { ...RESERVE, used: false }],
        items: [placed('z-mayo')],
      });

      expect(progress.reserve).toEqual({ status: 'complete', total: 0, placed: 0 });
    });

    it('«sin mesa» si la versión no dice nada de ella (no hay fila en `zones`)', () => {
      const progress = versionProgress({
        ...COMPLETE,
        zones: [MAYO],
        items: [placed('z-mayo')],
      });

      expect(progress.reserve).toEqual({ status: 'no_table', total: 0, placed: 0 });
    });

    it('«sin mesa» en las dos si `zones` viene vacío', () => {
      const progress = versionProgress({ ...COMPLETE, zones: [], items: [] });

      expect(progress.mayo.status).toBe('no_table');
      expect(progress.reserve.status).toBe('no_table');
    });

    it('cada mesa cuenta solo sus objetos y no los de la otra ni los que no tienen mesa', () => {
      const progress = versionProgress({
        ...COMPLETE,
        items: [placed('z-mayo'), unplaced('z-reserva'), unplaced(null)],
      });

      expect(progress.mayo).toEqual({ status: 'complete', total: 1, placed: 1 });
      expect(progress.reserve).toEqual({ status: 'pending', total: 1, placed: 0 });
    });

    it('una mesa usada sin tamaño, sin objetos, sigue pendiente: no se inventa un tamaño', () => {
      const progress = versionProgress({
        ...COMPLETE,
        zones: [{ ...MAYO, rows: null, columns: null }, RESERVE],
        items: [placed('z-reserva')],
      });

      expect(progress.mayo.status).toBe('pending');
    });
  });

  describe('enviar y publicar', () => {
    it('se puede con las cuatro secciones completas', () => {
      const progress = versionProgress(COMPLETE);

      expect(progress.blocking).toEqual([]);
      expect(progress.canSubmit).toBe(true);
    });

    it('una sección en curso o pendiente bloquea, y dice cuáles, en el orden del editor', () => {
      const progress = versionProgress({
        ...without('anesthesia'),
        items: [placed('z-mayo'), unplaced('z-mayo')],
      });

      expect(progress.blocking).toEqual(['clinical', 'mayo', 'reserve']);
      expect(progress.canSubmit).toBe(false);
    });

    it('«sin mesa» no bloquea', () => {
      const progress = versionProgress({
        ...COMPLETE,
        zones: [MAYO],
        items: [placed('z-mayo')],
      });

      expect(progress.reserve.status).toBe('no_table');
      expect(progress.blocking).toEqual([]);
      expect(progress.canSubmit).toBe(true);
    });

    it('una técnica sin instrumental no se puede enviar', () => {
      const progress = versionProgress({ ...COMPLETE, items: [] });

      expect(progress.blocking).toContain('instrumental');
      expect(progress.canSubmit).toBe(false);
    });

    it('una técnica recién creada (todo vacío) tiene bloqueadas las secciones obligatorias', () => {
      const progress = versionProgress({
        description: null,
        indications: null,
        anesthesia: null,
        drapes: null,
        patient_position: null,
        source: null,
        zones: [{ ...MAYO, rows: 4, columns: 6 }],
        items: [],
        sutures: [],
      });

      expect(progress.clinical.status).toBe('pending');
      expect(progress.instrumental.status).toBe('pending');
      expect(progress.mayo.status).toBe('pending');
      expect(progress.reserve.status).toBe('no_table');
      expect(progress.blocking).toEqual(['clinical', 'instrumental', 'mayo']);
    });
  });
});

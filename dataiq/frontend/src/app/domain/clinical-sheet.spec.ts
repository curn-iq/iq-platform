import { clinicalSheet, type ClinicalFields } from './clinical-sheet';

const EMPTY: ClinicalFields = {
  description: null,
  anesthesia: null,
  drapes: null,
  patient_position: null,
  cups_code: null,
  indications: null,
  complications: null,
  surgical_technique: null,
  source: null,
};

const FULL: ClinicalFields = {
  description: 'Extirpación de la glándula tiroides.',
  anesthesia: 'General',
  drapes: 'Paquete de ropa general',
  patient_position: 'Decúbito supino con hiperextensión de cuello',
  cups_code: '061100',
  indications: 'Cáncer de tiroides.',
  complications: 'Lesión del nervio laríngeo recurrente.',
  surgical_technique: 'Incisión cervical, disección por planos.',
  source: 'Documento de IQ',
};

describe('clinicalSheet', () => {
  it('«Para qué sirve» es la descripción', () => {
    expect(clinicalSheet(FULL).purpose).toBe('Extirpación de la glándula tiroides.');
  });

  it('las fichas van en su orden, y la posición del paciente y el CUPS ocupan la fila entera', () => {
    expect(clinicalSheet(FULL).facts).toEqual([
      { label: 'Anestesia', value: 'General', wide: false },
      { label: 'Ropa', value: 'Paquete de ropa general', wide: false },
      {
        label: 'Posición del paciente',
        value: 'Decúbito supino con hiperextensión de cuello',
        wide: true,
      },
      { label: 'Código CUPS', value: '061100', wide: true },
    ]);
  });

  it('los textos largos van en su orden', () => {
    expect(clinicalSheet(FULL).notes).toEqual([
      { label: 'Indicaciones', text: 'Cáncer de tiroides.' },
      { label: 'Complicaciones', text: 'Lesión del nervio laríngeo recurrente.' },
      { label: 'Técnica quirúrgica', text: 'Incisión cervical, disección por planos.' },
    ]);
  });

  it('lleva la fuente de la versión', () => {
    expect(clinicalSheet(FULL).source).toBe('Documento de IQ');
  });

  it('lo que falta no se muestra ni se rellena', () => {
    expect(clinicalSheet(EMPTY)).toEqual({ purpose: null, facts: [], notes: [], source: null });
    const partial = clinicalSheet({ ...EMPTY, anesthesia: 'Local', complications: 'Sangrado.' });

    expect(partial.facts.map((fact) => fact.label)).toEqual(['Anestesia']);
    expect(partial.notes.map((note) => note.label)).toEqual(['Complicaciones']);
  });

  it('un campo en blanco es un campo que falta, y los espacios de los lados se quitan', () => {
    const sheet = clinicalSheet({
      ...FULL,
      anesthesia: '   ',
      description: '  Algo.  ',
      source: '',
    });

    expect(sheet.facts.map((fact) => fact.label)).not.toContain('Anestesia');
    expect(sheet.purpose).toBe('Algo.');
    expect(sheet.source).toBeNull();
  });
});

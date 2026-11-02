import type { EditorContent } from '../domain/editor-content';
import type { VersionDetail } from './api/models';
import { toContentIn, toEditorContent } from './version-content';

type ApiContent = VersionDetail['content'];

const API_CONTENT: ApiContent = {
  id: 't-1',
  name: 'Colecistectomía',
  specialty: 'Cirugía general',
  version_number: 2,
  cups_code: '511101',
  anesthesia: 'General.',
  patient_position: 'Supino.',
  drapes: 'Campos.',
  description: 'Extirpar la vesícula.',
  indications: 'Colelitiasis.',
  complications: null,
  surgical_technique: null,
  source: 'Documento de IQ.',
  zones: [
    { zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 4, columns: 6 },
    { zone_id: 'z-reserva', zone: 'Mesa de reserva', used: false, rows: null, columns: null },
  ],
  items: [
    {
      id: 'i-1',
      zone_id: 'z-mayo',
      zone: 'Mesa de Mayo',
      legend_number: 1,
      source_text: 'Mango n.° 3 con hoja 15',
      components: [
        { instrument_id: 'in-1', suture_id: null, name: 'Mango de bisturí N.° 3' },
        { instrument_id: 'in-2', suture_id: null, name: 'Hoja de bisturí #15' },
      ],
      cells: [{ row: 1, column: 2 }],
    },
    {
      id: 'i-2',
      zone_id: null,
      zone: null,
      legend_number: null,
      source_text: 'Seda 2/0',
      components: [{ instrument_id: null, suture_id: 's-1', name: 'Seda' }],
      cells: [],
    },
  ],
  sutures: [
    { id: 's-1', name: 'Seda', gauge: '2/0', needle_type: 'Cortante', usage: 'Piel; Fascia' },
  ],
  equipment: [{ id: 'e-1', name: 'Electrobisturí', description: 'Corta y coagula.' }],
  devices: [{ id: 'd-1', name: 'Trocar', description: null }],
} as ApiContent;

describe('toEditorContent', () => {
  const content = toEditorContent(API_CONTENT);

  it('conserva los datos clínicos tal cual', () => {
    expect(content).toMatchObject({
      cups_code: '511101',
      anesthesia: 'General.',
      patient_position: 'Supino.',
      drapes: 'Campos.',
      description: 'Extirpar la vesícula.',
      indications: 'Colelitiasis.',
      complications: null,
      surgical_technique: null,
      source: 'Documento de IQ.',
    });
  });

  it('no arrastra lo que el editor no usa: la identidad de la técnica ni los ids de los objetos', () => {
    expect(content).not.toHaveProperty('id');
    expect(content).not.toHaveProperty('name');
    expect(content.items[0]).not.toHaveProperty('id');
    expect(content.items[0]).not.toHaveProperty('zone');
  });

  it('las mesas llevan su nombre y su tamaño', () => {
    expect(content.zones).toEqual([
      { zone_id: 'z-mayo', zone: 'Mesa de Mayo', used: true, rows: 4, columns: 6 },
      { zone_id: 'z-reserva', zone: 'Mesa de reserva', used: false, rows: null, columns: null },
    ]);
  });

  it('los objetos llevan sus componentes con su nombre y sus celdas', () => {
    expect(content.items[0]).toEqual({
      zone_id: 'z-mayo',
      legend_number: 1,
      source_text: 'Mango n.° 3 con hoja 15',
      components: [
        { instrument_id: 'in-1', suture_id: null, name: 'Mango de bisturí N.° 3' },
        { instrument_id: 'in-2', suture_id: null, name: 'Hoja de bisturí #15' },
      ],
      cells: [{ row: 1, column: 2 }],
    });
    expect(content.items[1]?.zone_id).toBeNull();
  });

  it('las suturas pasan como llegan, con sus planos en `usage`', () => {
    expect(content.sutures).toEqual([
      { name: 'Seda', gauge: '2/0', needle_type: 'Cortante', usage: 'Piel; Fascia' },
    ]);
  });

  it('los equipos y dispositivos van por nombre, sin descripción', () => {
    expect(content.equipment).toEqual(['Electrobisturí']);
    expect(content.devices).toEqual(['Trocar']);
  });
});

describe('toContentIn', () => {
  it('lo que sale de la API y vuelve a ella no pierde nada de lo que la API acepta', () => {
    expect(toContentIn(toEditorContent(API_CONTENT))).toEqual({
      cups_code: '511101',
      anesthesia: 'General.',
      patient_position: 'Supino.',
      drapes: 'Campos.',
      description: 'Extirpar la vesícula.',
      indications: 'Colelitiasis.',
      complications: null,
      surgical_technique: null,
      source: 'Documento de IQ.',
      zones: [
        { zone_id: 'z-mayo', used: true, rows: 4, columns: 6 },
        { zone_id: 'z-reserva', used: false, rows: null, columns: null },
      ],
      items: [
        {
          zone_id: 'z-mayo',
          legend_number: 1,
          source_text: 'Mango n.° 3 con hoja 15',
          components: [
            { instrument_id: 'in-1', suture_id: null },
            { instrument_id: 'in-2', suture_id: null },
          ],
          cells: [{ row: 1, column: 2 }],
        },
        {
          zone_id: null,
          legend_number: null,
          source_text: 'Seda 2/0',
          components: [{ instrument_id: null, suture_id: 's-1' }],
          cells: [],
        },
      ],
      sutures: [{ name: 'Seda', gauge: '2/0', needle_type: 'Cortante', usage: 'Piel; Fascia' }],
      equipment: ['Electrobisturí'],
      devices: ['Trocar'],
    });
  });

  describe('lo que la API rechaza por vacío no se manda', () => {
    const edited = (changes: Partial<EditorContent>): EditorContent => ({
      ...toEditorContent(API_CONTENT),
      ...changes,
    });

    it('un texto en blanco va como `null`', () => {
      const body = toContentIn(
        edited({ description: '   \n ', anesthesia: '', drapes: 'Campos.' }),
      );

      expect(body.description).toBeNull();
      expect(body.anesthesia).toBeNull();
      expect(body.drapes).toBe('Campos.');
    });

    it('un texto con contenido se manda tal cual, sin recortarlo', () => {
      expect(toContentIn(edited({ indications: '  Colelitiasis.  ' })).indications).toBe(
        '  Colelitiasis.  ',
      );
    });

    it('un equipo o un dispositivo en blanco se descarta, y los demás van sin espacios de más', () => {
      const body = toContentIn(
        edited({ equipment: ['  Electrobisturí ', '', '  '], devices: [' '] }),
      );

      expect(body.equipment).toEqual(['Electrobisturí']);
      expect(body.devices).toEqual([]);
    });

    it('una sutura sin nombre se descarta', () => {
      const body = toContentIn(
        edited({
          sutures: [
            { name: '', gauge: '2/0', needle_type: null, usage: 'Piel' },
            { name: 'Seda', gauge: null, needle_type: null, usage: null },
          ],
        }),
      );

      expect(body.sutures).toEqual([{ name: 'Seda', gauge: null, needle_type: null, usage: null }]);
    });
  });
});

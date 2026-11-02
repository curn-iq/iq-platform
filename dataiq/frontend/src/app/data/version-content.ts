import type { EditorContent } from '../domain/editor-content';
import type { VersionContent, VersionDetail } from './api/models';

/** El contenido de una versión, como lo entrega `GET /versions/{id}`. */
type ApiContent = VersionDetail['content'];

/** Una lista de nombres que la API exige sin vacíos: lo escrito a medias no se manda. */
function names(values: readonly string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value !== '');
}

/** Un texto en blanco se guarda como «sin dato», no como una cadena vacía. */
function text(value: string | null): string | null {
  return value === null || value.trim() === '' ? null : value;
}

/**
 * Lo que el editor tiene en pantalla a partir de una versión de la API: sin los ids de los objetos
 * ni las descripciones de los equipos, que el editor no usa, y con los equipos y dispositivos por
 * nombre. Es lo contrario de `toContentIn()`.
 */
export function toEditorContent(content: ApiContent): EditorContent {
  return {
    cups_code: content.cups_code,
    anesthesia: content.anesthesia,
    patient_position: content.patient_position,
    drapes: content.drapes,
    description: content.description,
    indications: content.indications,
    complications: content.complications,
    surgical_technique: content.surgical_technique,
    source: content.source,
    zones: content.zones.map(({ zone_id, zone, used, rows, columns }) => ({
      zone_id,
      zone,
      used,
      rows,
      columns,
    })),
    items: content.items.map((item) => ({
      zone_id: item.zone_id,
      legend_number: item.legend_number,
      source_text: item.source_text,
      components: item.components.map(({ instrument_id, suture_id, name }) => ({
        instrument_id,
        suture_id,
        name,
      })),
      cells: item.cells.map(({ row, column }) => ({ row, column })),
    })),
    sutures: content.sutures.map(({ name, gauge, needle_type, usage }) => ({
      name,
      gauge,
      needle_type,
      usage,
    })),
    equipment: content.equipment.map((element) => element.name),
    devices: content.devices.map((element) => element.name),
  };
}

/**
 * Lo que `PUT /versions/{id}` recibe: todo el contenido, que reemplaza el que había. Un texto en
 * blanco va como `null`, y lo que la API rechaza por vacío (un equipo, un dispositivo o una sutura
 * sin nombre) no se manda: una fila recién agregada y aún sin escribir no debe tumbar el guardado
 * de todo lo demás.
 */
export function toContentIn(content: EditorContent): VersionContent {
  return {
    cups_code: text(content.cups_code),
    anesthesia: text(content.anesthesia),
    patient_position: text(content.patient_position),
    drapes: text(content.drapes),
    description: text(content.description),
    indications: text(content.indications),
    complications: text(content.complications),
    surgical_technique: text(content.surgical_technique),
    source: text(content.source),
    zones: content.zones.map(({ zone_id, used, rows, columns }) => ({
      zone_id,
      used,
      rows,
      columns,
    })),
    items: content.items.map((item) => ({
      zone_id: item.zone_id,
      legend_number: item.legend_number,
      source_text: item.source_text,
      components: item.components.map(({ instrument_id, suture_id }) => ({
        instrument_id,
        suture_id,
      })),
      cells: item.cells.map(({ row, column }) => ({ row, column })),
    })),
    sutures: content.sutures
      .filter((suture) => suture.name.trim() !== '')
      .map(({ name, gauge, needle_type, usage }) => ({ name, gauge, needle_type, usage })),
    equipment: names(content.equipment),
    devices: names(content.devices),
  };
}

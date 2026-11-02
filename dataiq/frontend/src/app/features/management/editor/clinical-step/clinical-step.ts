import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toPlaneSutures } from '../../../../data/sutures';
import type { ClinicalTextField } from '../../../../domain/editor-content';
import { sutureRow } from '../../../../domain/instrumental-sheet';
import { addName, removeName } from '../../../../domain/name-list';
import { ChipList } from '../../../../shared/ui/chip-list/chip-list';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { EditorState } from '../editor-state';

/** Lo que dice la pastilla de un campo obligatorio que aún está vacío. */
const MISSING = 'Falta';

/**
 * El paso «Datos clínicos» del editor, según «Editor de técnica (página)» de `DESIGN.md`: dos tarjetas
 * (Descripción: para qué sirve, indicaciones, complicaciones, técnica quirúrgica y la fuente; Preparación:
 * CUPS, anestesia, ropa, posición del paciente, equipos biomédicos, suturas y equipo médico-quirúrgico).
 * Los obligatorios vacíos llevan la pastilla «Falta» y los demás dicen «Opcional» (la regla es la de
 * Resuelto 22: `REQUIRED_CLINICAL_FIELDS` en `domain/version-progress.ts`). El nombre y la especialidad
 * van arriba, de solo lectura (Resuelto 28): se eligen al crear la técnica y desde ahí no cambian.
 *
 * Lo que se escribe pasa por `EditorState.edit()`, que lo guarda. Con la versión en solo lectura (en
 * revisión) todo se ve y nada se cambia. Las suturas se ven pero aún no se editan: llegan en su casilla.
 */
@Component({
  selector: 'app-clinical-step',
  imports: [ChipList, TextField, TextareaField],
  templateUrl: './clinical-step.html',
  styleUrl: './clinical-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClinicalStep {
  /** El nombre y la especialidad de la técnica, de solo lectura. */
  readonly technique = input.required<string>();
  readonly specialty = input.required<string>();

  private readonly state = inject(EditorState);

  protected readonly content = this.state.content;
  protected readonly readonly = computed(() => !this.state.editable());
  protected readonly missing = MISSING;

  /** Las suturas, una fila por plano, para verlas. */
  protected readonly sutures = computed(() =>
    toPlaneSutures(this.content()?.sutures ?? []).map(sutureRow),
  );

  /** El texto de un campo, vacío si la versión no lo trae. */
  protected text(field: ClinicalTextField): string {
    return this.content()?.[field] ?? '';
  }

  /** La pastilla de un campo obligatorio: «Falta» mientras esté en blanco. */
  protected badge(field: ClinicalTextField): string {
    return this.text(field).trim() === '' ? MISSING : '';
  }

  protected set(field: ClinicalTextField, value: string): void {
    this.state.edit((content) => ({ ...content, [field]: value }));
  }

  protected add(list: 'equipment' | 'devices', name: string): void {
    this.state.edit((content) => ({ ...content, [list]: addName(content[list], name) }));
  }

  protected remove(list: 'equipment' | 'devices', index: number): void {
    this.state.edit((content) => ({ ...content, [list]: removeName(content[list], index) }));
  }
}

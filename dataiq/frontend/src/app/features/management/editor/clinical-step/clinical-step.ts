import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { ClinicalTextField } from '../../../../domain/editor-content';
import { addName } from '../../../../domain/name-list';
import { removeAt } from '../../../../domain/remove-at';
import { emptySutureRow, hasSutureName, withSutureField } from '../../../../domain/suture-rows';
import { ChipList } from '../../../../shared/ui/chip-list/chip-list';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { EditorState } from '../editor-state';
import { MISSING_BADGE } from '../missing-badge';
import { SutureRowChange, SutureRows } from '../suture-rows/suture-rows';

/**
 * El paso «Datos clínicos» del editor, según «Editor de técnica (página)» de `DESIGN.md`: dos tarjetas
 * (Descripción: para qué sirve, indicaciones, complicaciones, técnica quirúrgica y la fuente; Preparación:
 * CUPS, anestesia, ropa, posición del paciente, equipos biomédicos, suturas y equipo médico-quirúrgico).
 * Los obligatorios vacíos llevan la pastilla «Falta» y los demás dicen «Opcional» (la regla es la de
 * Resuelto 22: `REQUIRED_CLINICAL_FIELDS` en `domain/version-progress.ts`). El nombre y la especialidad
 * van arriba, de solo lectura (Resuelto 28): se eligen al crear la técnica y desde ahí no cambian.
 *
 * Lo que se escribe pasa por `EditorState.edit()`, que lo guarda. Con la versión en solo lectura (en
 * revisión) todo se ve y nada se cambia. Las suturas son una fila por plano (`SutureRows`, Resuelto 29).
 */
@Component({
  selector: 'app-clinical-step',
  imports: [ChipList, SutureRows, TextField, TextareaField],
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

  /** Todavía no hay ninguna sutura con nombre. */
  protected readonly suturesMissing = computed(
    () => !(this.content()?.sutures ?? []).some(hasSutureName),
  );

  /** El texto de un campo, vacío si la versión no lo trae. */
  protected text(field: ClinicalTextField): string {
    return this.content()?.[field] ?? '';
  }

  /** La pastilla de un campo obligatorio: «Falta» mientras esté en blanco. */
  protected badge(field: ClinicalTextField): string {
    return this.text(field).trim() === '' ? MISSING_BADGE : '';
  }

  protected set(field: ClinicalTextField, value: string): void {
    this.state.edit((content) => ({ ...content, [field]: value }));
  }

  /** Un nombre en blanco o repetido no se suma: el contenido queda igual y no hay nada que guardar. */
  protected add(list: 'equipment' | 'devices', name: string): void {
    this.state.edit((content) => {
      const names = addName(content[list], name);
      return names.length === content[list].length ? content : { ...content, [list]: names };
    });
  }

  protected editSuture({ index, field, value }: SutureRowChange): void {
    this.state.edit((content) => ({
      ...content,
      sutures: content.sutures.map((row, position) =>
        position === index ? withSutureField(row, field, value) : row,
      ),
    }));
  }

  protected addSuture(): void {
    this.state.edit((content) => ({ ...content, sutures: [...content.sutures, emptySutureRow()] }));
  }

  protected removeSuture(index: number): void {
    this.state.edit((content) => ({
      ...content,
      sutures: removeAt(content.sutures, index),
    }));
  }

  protected remove(list: 'equipment' | 'devices', index: number): void {
    this.state.edit((content) => ({ ...content, [list]: removeAt(content[list], index) }));
  }
}

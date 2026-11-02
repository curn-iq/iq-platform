import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TechniquesRepository } from '../../../../data/techniques.repository';
import { FIRST_EDITOR_STEP } from '../../../../domain/editor-steps';
import {
  isReadyToCreate,
  newTechniqueTitle,
  TECHNIQUE_NAME_TAKEN,
} from '../../../../domain/new-technique';
import { SelectField, type SelectOption } from '../../../../shared/ui/select-field/select-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';

/** Lo que dice la pastilla de un campo obligatorio que aún está vacío. */
const MISSING = 'Falta';

/**
 * «Técnica nueva», lo primero del editor (`/gestion/editor/nueva`, `editor.html`): pide el nombre
 * y la especialidad y crea la técnica con su versión 1 en borrador (`POST /techniques`) en cuanto
 * tiene los dos. Desde ahí los dos son de solo lectura (Resuelto 28 de
 * `dataiq/docs/checklist-frontend.md`), así que no se crea mientras se escribe: el nombre se
 * confirma al salir del campo o con Enter, y la especialidad, al elegirla. Al crearla, lleva a la
 * versión 1.
 *
 * Un 409 es que ya hay una técnica con ese nombre en la especialidad: se dice bajo el nombre y no
 * se vuelve a pedir lo mismo hasta que cambie el nombre o la especialidad. El resto de errores los
 * avisa el interceptor.
 */
@Component({
  selector: 'app-new-technique',
  imports: [RouterLink, SelectField, TextField],
  templateUrl: './new-technique.html',
  styleUrl: './new-technique.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewTechnique {
  private readonly router = inject(Router);
  private readonly repository = inject(TechniquesRepository);
  private readonly specialtiesResource = this.repository.specialties();

  // Dos campos que se confirman al salir de ellos, no con un envío: signals simples y no un formulario.
  protected readonly name = signal('');
  protected readonly specialtyId = signal('');
  protected readonly creating = signal(false);
  /** La API dijo que ya hay una técnica con este nombre en esta especialidad. */
  private readonly rejected = signal<string | undefined>(undefined);

  protected readonly missing = MISSING;
  protected readonly title = computed(() => newTechniqueTitle(this.name()));
  protected readonly specialties = computed<SelectOption[]>(() =>
    this.specialtiesResource.hasValue()
      ? (this.specialtiesResource.value() ?? []).map(({ id, name }) => ({ value: id, label: name }))
      : [],
  );

  /** El error bajo el nombre: solo el 409, y solo mientras no cambie lo que lo causó. */
  protected readonly nameErrors = computed(() =>
    this.rejected() !== undefined && this.rejected() === this.pair()
      ? [{ kind: 'conflict', message: TECHNIQUE_NAME_TAKEN }]
      : [],
  );

  protected chooseName(name: string): void {
    this.name.set(name);
  }

  protected chooseSpecialty(id: string): void {
    this.specialtyId.set(id);
    this.create();
  }

  /** Crea la técnica si ya tiene nombre y especialidad. Un segundo intento mientras va el primero no hace nada. */
  protected create(): void {
    if (this.creating() || !isReadyToCreate(this.name(), this.specialtyId())) return;
    // Lo que la API ya rechazó no se vuelve a pedir: el error sigue a la vista.
    if (this.pair() === this.rejected()) return;

    this.creating.set(true);
    const sent = this.pair();
    this.repository
      .create({ name: this.name().trim(), specialty_id: this.specialtyId() })
      .subscribe({
        next: (version) =>
          void this.router.navigate(['/gestion/editor', version.summary.id, FIRST_EDITOR_STEP]),
        error: (error: unknown) => {
          this.creating.set(false);
          if (error instanceof HttpErrorResponse && error.status === 409) this.rejected.set(sent);
        },
      });
  }

  /** El nombre (sin los espacios de los extremos) y la especialidad, para saber si es lo mismo que ya se pidió. */
  private pair(): string {
    return `${this.name().trim()}|${this.specialtyId()}`;
  }
}

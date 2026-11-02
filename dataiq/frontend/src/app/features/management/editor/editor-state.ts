import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import type { VersionDetail } from '../../../data/api/models';
import { toContentIn, toEditorContent } from '../../../data/version-content';
import { VersionsRepository } from '../../../data/versions.repository';
import { canEditVersion } from '../../../domain/edit-version';
import type { EditorContent } from '../../../domain/editor-content';

/**
 * Cuánto se espera, tras el último cambio, para guardar: lo que se escribe de corrido sale en una
 * sola petición (Resuelto 50 de `dataiq/docs/checklist-frontend.md`).
 */
export const AUTOSAVE_DELAY_MS = 1000;

/**
 * Cómo va el guardado: `unchanged` (todavía no se cambió nada en esta visita), `saving` (hay algo por
 * guardar o yendo), `saved` y `failed` (la API no lo guardó; sigue pendiente).
 */
export type SaveStatus = 'unchanged' | 'saving' | 'saved' | 'failed';

/**
 * El contenido de la versión que el editor tiene abierta y su autoguardado (`PUT /versions/{id}`,
 * que reemplaza todo el contenido). Se provee en `Editor`: vive lo que dura la pantalla.
 *
 * - Cada cambio (`edit()`) se guarda `AUTOSAVE_DELAY_MS` después del último.
 * - Nunca hay dos guardados a la vez: si llegan cambios mientras uno va, se guardan al terminar.
 * - La respuesta de la API no vuelve a la pantalla: no pisa lo que se está escribiendo.
 * - Si falla, lo pendiente se queda (`failed`): se reintenta con `retry()` o con el siguiente cambio.
 * - Al salir de la pantalla se manda lo pendiente al momento (`flush()`).
 * - Una versión que no es un borrador (en revisión) no se edita ni se guarda.
 */
@Injectable()
export class EditorState implements OnDestroy {
  private readonly versions = inject(VersionsRepository);

  private versionId: string | undefined;
  private readonly contentState = signal<EditorContent | undefined>(undefined);
  private readonly editableState = signal(false);
  private readonly statusState = signal<SaveStatus>('unchanged');

  private dirty = false;
  private inFlight = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private abandoned = false;

  /** Lo que hay en pantalla, o `undefined` mientras no llega la versión. */
  readonly content = this.contentState.asReadonly();
  /** Si se puede editar: solo un borrador. */
  readonly editable = this.editableState.asReadonly();
  readonly saveStatus = this.statusState.asReadonly();

  /** Carga la versión que llegó de la API. Con la misma versión otra vez no pisa lo editado. */
  load(version: VersionDetail): void {
    if (this.versionId === version.summary.id) return;
    this.flush();
    this.versionId = version.summary.id;
    this.abandoned = false;
    this.dirty = false;
    this.contentState.set(toEditorContent(version.content));
    this.editableState.set(canEditVersion(version.summary.state));
    this.statusState.set('unchanged');
  }

  /** Cambia el contenido y programa el guardado. En una versión que no es un borrador no hace nada. */
  edit(change: (content: EditorContent) => EditorContent): void {
    const content = this.contentState();
    if (!content || !this.editableState() || this.abandoned) return;
    this.contentState.set(change(content));
    this.dirty = true;
    this.statusState.set('saving');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), AUTOSAVE_DELAY_MS);
  }

  /** Vuelve a guardar lo que no se pudo. */
  retry(): void {
    if (this.statusState() === 'failed') this.save();
  }

  /** Manda lo pendiente ya, sin esperar. */
  flush(): void {
    if (this.dirty) this.save();
  }

  /** Si hay algo sin guardar: por mandar, yendo o rechazado. */
  hasUnsaved(): boolean {
    return this.dirty || this.inFlight;
  }

  /** Deja de guardar: la versión ya no existe (se descartó) y un `PUT` daría 404. */
  abandon(): void {
    this.abandoned = true;
    this.dirty = false;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  ngOnDestroy(): void {
    this.flush();
  }

  private save(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    const content = this.contentState();
    if (this.inFlight || !this.dirty || this.abandoned || !content || !this.versionId) return;

    const id = this.versionId;
    this.inFlight = true;
    this.dirty = false;
    this.statusState.set('saving');
    this.versions.update(id, toContentIn(content)).subscribe({
      next: () => {
        this.inFlight = false;
        // La respuesta de una versión que ya no está abierta no dice nada de la de ahora
        if (this.versionId === id && !this.dirty) this.statusState.set('saved');
        // Hubo cambios mientras iba: salen ya, salvo que su espera siga corriendo
        else if (this.dirty && this.timer === undefined) this.save();
      },
      error: () => {
        this.inFlight = false;
        if (this.abandoned || this.versionId !== id) return;
        this.dirty = true;
        this.statusState.set('failed');
      },
    });
  }
}

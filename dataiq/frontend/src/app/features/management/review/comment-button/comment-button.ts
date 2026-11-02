import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * El botón «Comentar» de la revisión (junto a cada cambio, a cada campo cambiado y al pie de cada
 * sección): un botón con filete `filete-2`, de 34 px. Se pone en un `<button>`:
 * `<button app-comment-button type="button">Comentar</button>`. Ver «Versiones por revisar
 * (página)» en `DESIGN.md`.
 */
@Component({
  selector: 'button[app-comment-button]',
  template: '<ng-content />',
  styleUrl: './comment-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentButton {}

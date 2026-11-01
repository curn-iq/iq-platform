import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import privacyText from '../../../../../../docs/privacidad.md';
import type { Inline } from '../../domain/markdown';
import { readPrivacyDocument } from './privacy-document';

/**
 * El aviso de privacidad (`/politica-de-datos`). El texto es `docs/privacidad.md`,
 * que el build importa tal cual: no se copia en la plantilla, así que cambiar el
 * documento cambia la página. Ver «Aviso de privacidad (página)» en `DESIGN.md`.
 */
@Component({
  selector: 'app-privacy',
  imports: [NgTemplateOutlet],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Privacy {
  protected readonly document = readPrivacyDocument(privacyText);

  /** El texto de una celda sin formato: en celular cada celda dice a qué columna pertenece. */
  protected plain(inlines: readonly Inline[] | undefined): string {
    return (inlines ?? []).map((inline) => inline.text).join('');
  }
}

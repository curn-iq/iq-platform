import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NotFound as NotFoundMessage } from '../../shared/ui/not-found/not-found';

/** La página de una ruta que no existe (`**`). El aviso lo dibuja `shared/ui`, que la fase 4 reutiliza. */
@Component({
  selector: 'app-not-found-page',
  imports: [NotFoundMessage],
  template: '<app-not-found />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}

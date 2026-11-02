import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../shared/ui/button/button';

/**
 * El aviso de que no se pudo comprobar la sesión (sin conexión, un error del servidor o un
 * tiempo agotado), con «Reintentar». Lo muestra `App` mientras una ruta protegida espera, así
 * que ninguna pantalla tiene que resolverlo por su cuenta. No dice que la sesión haya vencido:
 * no se sabe. Ver «Sesión sin comprobar» en `DESIGN.md`.
 */
@Component({
  selector: 'app-session-unavailable',
  imports: [Button],
  templateUrl: './session-unavailable.html',
  styleUrl: './session-unavailable.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
})
export class SessionUnavailable {
  /** Se está volviendo a comprobar. */
  readonly busy = input(false);
  /** La persona pidió volver a comprobar. */
  readonly retry = output<void>();
}

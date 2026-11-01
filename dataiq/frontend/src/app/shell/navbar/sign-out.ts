import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../core/session/session.service';

/**
 * Salir (`POST /auth/logout`) desde «Mi cuenta», en el panel de escritorio y en el menú de celular,
 * y llevar al inicio, como en los mockups: desde una pantalla de gestión no se puede quedar, porque
 * ya no es de quien salió. Si no se pudo cerrar la sesión (sin conexión, un error del servidor) el
 * interceptor ya lo avisó, la cuenta sigue —la cookie sigue— y se queda donde está, para intentarlo
 * de nuevo. Un 401 es una sesión que ya había vencido: también sale.
 */
@Injectable({ providedIn: 'root' })
export class SignOut {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly pending = signal(false);

  /** Se está cerrando la sesión: un segundo toque no pide otra vez. */
  readonly busy = this.pending.asReadonly();

  async run(): Promise<void> {
    if (this.pending()) return;
    this.pending.set(true);
    try {
      await firstValueFrom(this.session.logout());
    } catch {
      return;
    } finally {
      this.pending.set(false);
    }
    await this.router.navigateByUrl('/');
  }
}

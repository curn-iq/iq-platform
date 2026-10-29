import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NoticeService } from '../notice/notice.service';
import { LOGIN_PATH } from '../session/login-path';
import { SessionService } from '../session/session.service';
import { describeApiError } from './error-message';

const ACCOUNT_PREFIX = '/cuenta';

// Un 401 de estas rutas no es una sesión vencida: en `/auth/me` es un visitante
// y en `/auth/login`, una contraseña mal puesta. Cada pantalla lo trata.
const SILENT_401_PATHS = ['/auth/me', '/auth/login'];

/** Cómo estaba la sesión cuando salió la petición. */
interface SentWith {
  readonly loggedIn: boolean;
  readonly generation: number;
}

/**
 * Traduce los errores de la API a un aviso (401, 403, 409, 422, sin conexión y
 * errores del servidor) y deja pasar el error para que quien llamó lo conozca.
 * Un 401 además olvida la cuenta y lleva a ingresar, si la petición salió con
 * sesión y la sesión no cambió desde entonces. Los demás códigos (p. ej. el 404)
 * no se avisan.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notices = inject(NoticeService);
  const router = inject(Router);
  const session = inject(SessionService);
  const sent: SentWith = { loggedIn: session.isLoggedIn(), generation: session.generation };

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !isSilent(req.url, error.status, sent, session)) {
        const messages = describeApiError(error.status, error.error);
        if (messages) {
          notices.show('error', messages);
          if (error.status === 401) {
            session.clear();
            goToLogin(router);
          }
        }
      }
      return throwError(() => error);
    }),
  );
};

/**
 * Un 401 que no es una sesión vencida no se avisa ni olvida la cuenta:
 * - el de `/auth/me` y `/auth/login` (ver `SILENT_401_PATHS`);
 * - el de un visitante: una página pública que pide algo que exige cuenta (la
 *   vista previa de la puerta de cuenta) no lo saca de ahí;
 * - el de una petición que salió antes de ingresar o salir: viene de la cookie
 *   vieja y no dice nada de la sesión de ahora.
 */
function isSilent(url: string, status: number, sent: SentWith, session: SessionService): boolean {
  if (status !== 401) return false;
  if (!sent.loggedIn || sent.generation !== session.generation) return true;
  const path = url.split('?')[0];
  return SILENT_401_PATHS.some((silent) => path.endsWith(silent));
}

function goToLogin(router: Router): void {
  // Varias peticiones pueden fallar a la vez, o la sesión vencer mientras se
  // está en la cuenta: no se vuelve a enviar a quien ya está ingresando.
  if (router.url.startsWith(ACCOUNT_PREFIX)) return;
  // Si no se puede navegar, se queda donde está: el aviso ya se mostró y la
  // cuenta ya se olvidó.
  router.navigate([LOGIN_PATH], { queryParams: { volver: router.url } }).catch(() => undefined);
}

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NoticeService } from '../notice/notice.service';
import { describeApiError } from './error-message';

/** Pantalla de ingreso; `?volver=` lleva la ruta a la que se iba. */
export const LOGIN_PATH = '/cuenta/ingresar';
const ACCOUNT_PREFIX = '/cuenta';

// Un 401 de estas rutas no es una sesión vencida: en `/auth/me` es un visitante
// y en `/auth/login`, una contraseña mal puesta. Cada pantalla lo trata.
const SILENT_401_PATHS = ['/auth/me', '/auth/login'];

/**
 * Traduce los errores de la API a un aviso (401, 403, 409, 422, sin conexión y
 * errores del servidor) y deja pasar el error para que quien llamó lo conozca.
 * Un 401 además lleva a ingresar. Los demás códigos (p. ej. el 404) no se avisan.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notices = inject(NoticeService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !isSilent(req.url, error.status)) {
        const messages = describeApiError(error.status, error.error);
        if (messages) {
          notices.show('error', messages);
          if (error.status === 401) goToLogin(router);
        }
      }
      return throwError(() => error);
    }),
  );
};

function isSilent(url: string, status: number): boolean {
  if (status !== 401) return false;
  const path = url.split('?')[0];
  return SILENT_401_PATHS.some((silent) => path.endsWith(silent));
}

function goToLogin(router: Router): void {
  // Varias peticiones pueden fallar a la vez, o la sesión vencer mientras se
  // está en la cuenta: no se vuelve a enviar a quien ya está ingresando.
  if (router.url.startsWith(ACCOUNT_PREFIX)) return;
  void router.navigate([LOGIN_PATH], { queryParams: { volver: router.url } });
}

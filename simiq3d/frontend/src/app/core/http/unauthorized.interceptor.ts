import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../session/session.service';
import { ShellNavigation } from '../session/shell';

/**
 * Un 401 de cualquiera de las dos APIs mientras se usa la app es que la sesión
 * venció (dura 2 horas y no se renueva): se da por cerrada y se va al ingreso del
 * shell, para volver a donde se estaba. El 401 de `GET /auth/me` no pasa por
 * aquí: ese lo responde `SessionService`. Los demás errores siguen hasta quien
 * hizo la petición, que los dice en su sitio (el chat, la escena).
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const shell = inject(ShellNavigation);
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.endsWith('/auth/me') &&
        session.status() === 'authenticated'
      ) {
        session.expire();
        shell.goToLogin(router.url);
      }
      return throwError(() => error);
    }),
  );
};

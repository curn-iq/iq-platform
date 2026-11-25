import { Routes } from '@angular/router';
import { notDesktopGuard } from './core/session/desktop.guard';
import { sessionGuard } from './core/session/session.guard';

/**
 * Relativas a `/sivri/`. La entrada es pública. La cámara pide cuenta y no se abre desde un
 * computador (`design/README.md`, «SIVRI: celular y computador (mockups)»).
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./entry/entry-page').then((m) => m.EntryPage),
  },
  {
    path: 'camara',
    canActivate: [notDesktopGuard, sessionGuard],
    loadComponent: () => import('./check/check-page').then((m) => m.CheckPage),
  },
  { path: '**', redirectTo: '' },
];

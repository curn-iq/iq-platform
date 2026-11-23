import { Routes } from '@angular/router';

/**
 * Relativas a `/sivri/`. La entrada es pública y la cámara pide cuenta (se agrega con su
 * pantalla).
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./entry/entry-page').then((m) => m.EntryPage),
  },
  { path: '**', redirectTo: '' },
];

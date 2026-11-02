import { Routes } from '@angular/router';
import { sessionGuard } from './core/session/session.guard';

/** Relativas a `/simiq3d/`. Las dos piden cuenta (`sessionGuard`). */
export const routes: Routes = [
  {
    path: '',
    canActivate: [sessionGuard],
    loadComponent: () => import('./explore/explore-page').then((m) => m.ExplorePage),
  },
  {
    // El destino de «Ver en 3D» en el detalle de DataIQ
    path: 'tecnicas/:id',
    canActivate: [sessionGuard],
    loadComponent: () => import('./explore/explore-page').then((m) => m.ExplorePage),
  },
  { path: '**', redirectTo: '' },
];

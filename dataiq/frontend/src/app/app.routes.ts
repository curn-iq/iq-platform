import { Routes } from '@angular/router';
import { roleGuard } from './core/session/session.guards';

// Las URL van en español (son parte de la interfaz) y cada pantalla se carga
// al visitarla. Los títulos son los de los mockups, sin el « · IQ Platform»
// que pone `PageTitleStrategy`; el inicio no lleva. Las rutas con dato (técnica,
// editor, revisión) llevan un título genérico hasta que su fase ponga el nombre.
// Tabla de rutas y accesos: README del frontend, «Rutas».
const contributor = roleGuard('contributor');
const reviewer = roleGuard('reviewer');
const admin = roleGuard('admin');

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  {
    path: 'tecnicas',
    title: 'Catálogo de técnicas',
    loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: 'tecnicas/:id/:pestana',
    title: 'Técnica',
    loadComponent: () => import('./features/technique/technique').then((m) => m.TechniqueDetail),
  },
  {
    path: 'cuenta/ingresar',
    title: 'Ingresar',
    loadComponent: () => import('./features/account/account').then((m) => m.AccountEntry),
  },
  {
    path: 'cuenta/crear',
    title: 'Crear cuenta',
    loadComponent: () => import('./features/account/account').then((m) => m.AccountEntry),
  },
  {
    path: 'gestion/borradores',
    title: 'Mis borradores',
    canActivate: [contributor],
    loadComponent: () => import('./features/management/drafts/drafts').then((m) => m.Drafts),
  },
  {
    path: 'gestion/editor/nueva',
    title: 'Técnica nueva',
    canActivate: [contributor],
    loadComponent: () => import('./features/management/editor/editor').then((m) => m.Editor),
  },
  {
    path: 'gestion/editor/:versionId/:paso',
    title: 'Editar técnica',
    canActivate: [contributor],
    loadComponent: () => import('./features/management/editor/editor').then((m) => m.Editor),
  },
  {
    path: 'gestion/revision',
    title: 'Por revisar',
    canActivate: [reviewer],
    loadComponent: () => import('./features/management/review/review').then((m) => m.Review),
  },
  {
    path: 'gestion/revision/:versionId',
    title: 'Revisar versión',
    canActivate: [reviewer],
    loadComponent: () => import('./features/management/review/review').then((m) => m.Review),
  },
  {
    path: 'gestion/instrumental',
    title: 'Instrumental',
    canActivate: [reviewer],
    loadComponent: () =>
      import('./features/management/instruments/instruments').then((m) => m.Instruments),
  },
  {
    path: 'gestion/instrumental/:id',
    title: 'Instrumental',
    canActivate: [reviewer],
    loadComponent: () =>
      import('./features/management/instruments/instruments').then((m) => m.Instruments),
  },
  {
    path: 'gestion/usuarios',
    title: 'Usuarios y roles',
    canActivate: [admin],
    loadComponent: () => import('./features/management/users/users').then((m) => m.Users),
  },
];

import { CanMatchFn, ResolveFn, Routes } from '@angular/router';
import { guestGuard, roleGuard } from './core/session/session.guards';
import { accountModeOf } from './domain/account-entry';
import { DEFAULT_TECHNIQUE_TAB } from './domain/technique-tabs';

// Las URL van en español (son parte de la interfaz) y cada pantalla se carga
// al visitarla. Los títulos son los de los mockups, sin el « · IQ Platform»
// que pone `PageTitleStrategy`; el inicio no lleva. Las rutas con dato (técnica,
// editor, revisión) llevan un título genérico hasta que su fase ponga el nombre (el
// detalle de técnica ya lo pone).
// Tabla de rutas y accesos: README del frontend, «Rutas».
/** Solo `/cuenta/ingresar` y `/cuenta/crear` son de la cuenta; cualquier otro segmento es «No encontrada». */
const accountMatch: CanMatchFn = (_route, segments) =>
  accountModeOf(segments[1]?.path) !== undefined;
const accountTitle: ResolveFn<string> = (route) =>
  accountModeOf(route.paramMap.get('modo')) === 'register' ? 'Crear cuenta' : 'Ingresar';

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
  { path: 'tecnicas/:id', pathMatch: 'full', redirectTo: `tecnicas/:id/${DEFAULT_TECHNIQUE_TAB}` },
  {
    path: 'tecnicas/:id/:pestana',
    title: 'Técnica',
    loadComponent: () => import('./features/technique/technique').then((m) => m.TechniqueDetail),
  },
  {
    // Ingresar y crear la cuenta son una sola ruta con un parámetro: así pasar de una a otra
    // no vuelve a crear la pantalla, y la raya de las pestañas y el cambio de lado se animan.
    path: 'cuenta/:modo',
    title: accountTitle,
    canMatch: [accountMatch],
    canActivate: [guestGuard],
    loadComponent: () => import('./features/account/account').then((m) => m.AccountEntry),
  },
  {
    path: 'politica-de-datos',
    title: 'Aviso de privacidad',
    loadComponent: () => import('./features/privacy/privacy').then((m) => m.Privacy),
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
    loadComponent: () =>
      import('./features/management/review/review-list/review-list').then((m) => m.ReviewList),
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
  {
    path: '**',
    title: 'No encontrada',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFoundPage),
  },
];

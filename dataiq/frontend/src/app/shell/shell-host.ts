import { LocationStrategy } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { computed, inject, Injector, type Provider } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { CATALOG_ROUTE, type NavMenuId, type NavTarget } from '../../shared-shell/navbar/nav-menus';
import { SHELL_HOST, type ShellHost } from '../../shared-shell/shell-host';
import { PendingReviews } from '../core/pending-reviews/pending-reviews';
import { SessionService } from '../core/session/session.service';
import { SignOut } from './navbar/sign-out';
import { SpecialtiesNav } from './navbar/specialties-nav';

/**
 * Lo que la barra compartida (`shared/shell/`) le pide a DataIQ: su sesión, sus rutas, sus
 * especialidades y las revisiones pendientes. SIMIQ3D hace lo mismo con lo suyo
 * (`simiq3d/frontend/src/app/shell/shell-host.ts`).
 */
function dataiqShellHost(): ShellHost {
  const session = inject(SessionService);
  const pending = inject(PendingReviews);
  const signOut = inject(SignOut);
  const injector = inject(Injector);
  // Las especialidades se piden al usarlas por primera vez, no al crear la barra
  const specialties = () => injector.get(SpecialtiesNav);
  const router = inject(Router);
  const locationStrategy = inject(LocationStrategy);

  const url = toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: router.url },
  );

  const tree = (target: NavTarget) => {
    const { route, fragment, queryParams } = target;
    return route === undefined ? null : router.createUrlTree([route], { fragment, queryParams });
  };

  return {
    brand: { label: 'IQ Platform', target: { route: '/' } },
    currentMenu: computed<NavMenuId | null>(() => {
      const path = url().split(/[?#]/)[0];
      return path === CATALOG_ROUTE || path.startsWith(`${CATALOG_ROUTE}/`) ? 'specialties' : null;
    }),
    currentUrl: url,
    loaded: session.loaded,
    account: session.account,
    pendingCount: pending.count,
    refreshPending: () => pending.refresh(),
    signOut: () => signOut.run(),
    signingOut: signOut.busy,
    specialties: computed(() => specialties().entries()),
    specialtiesLoading: computed(() => specialties().loading()),
    retrySpecialties: () => specialties().retry(),
    href(target) {
      const t = tree(target);
      return t === null
        ? (target.href ?? null)
        : locationStrategy.prepareExternalUrl(router.serializeUrl(t));
    },
    navigate(target) {
      const t = tree(target);
      if (t === null) return false;
      void router.navigateByUrl(t);
      return true;
    },
  };
}

/** Provee la barra compartida con la sesión y las rutas de DataIQ. */
export function provideShellHost(): Provider {
  return { provide: SHELL_HOST, useFactory: dataiqShellHost };
}

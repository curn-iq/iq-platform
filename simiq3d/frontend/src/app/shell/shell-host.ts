import {
  computed,
  inject,
  Injector,
  runInInjectionContext,
  signal,
  type Provider,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import type { NavMenuId } from '../../shared-shell/navbar/nav-menus';
import { SHELL_HOST, type ShellHost, type SpecialtyEntry } from '../../shared-shell/shell-host';
import { SessionService } from '../core/session/session.service';
import { ShellNavigation } from '../core/session/shell';
import { DataIQRepository } from '../data/dataiq.repository';

type SpecialtiesResource = ReturnType<DataIQRepository['specialties']>;
type TechniquesResource = ReturnType<DataIQRepository['techniques']>;

/**
 * Lo que la barra compartida (`shared/shell/`) le pide a SIMIQ3D. Todo lo que no es de esta
 * pantalla (inicio, catálogo, gestión) es del shell de DataIQ: son otra app, así que cada enlace
 * se abre con navegación completa y `navigate` nunca lo atiende el router. DataIQ hace lo mismo con
 * lo suyo (`dataiq/frontend/src/app/shell/shell-host.ts`).
 */
function simiq3dShellHost(): ShellHost {
  const session = inject(SessionService);
  const shell = inject(ShellNavigation);
  const injector = inject(Injector);
  const signingOut = signal(false);

  // Las especialidades y sus técnicas se piden al abrir ese menú, no al cargar la pantalla
  let cache: { specialties: SpecialtiesResource; techniques: TechniquesResource } | undefined;
  const lists = () => {
    if (cache === undefined) {
      const dataiq = injector.get(DataIQRepository);
      // Un recurso necesita un contexto de inyección para crearse
      cache = runInInjectionContext(injector, () => ({
        specialties: dataiq.specialties(),
        techniques: dataiq.techniques(),
      }));
    }
    return cache;
  };

  return {
    brand: { label: 'SIMIQ3D', target: { route: '/' } },
    // SIMIQ3D es una de las herramientas
    currentMenu: signal<NavMenuId | null>('tools').asReadonly(),
    currentUrl: signal('').asReadonly(),
    loaded: computed(() => session.status() !== 'loading'),
    account: session.account,
    // La cifra de «Por revisar» es de DataIQ: aquí no se muestra
    pendingCount: signal<number | null>(null).asReadonly(),
    refreshPending: () => undefined,
    async signOut() {
      if (signingOut()) return;
      signingOut.set(true);
      try {
        await firstValueFrom(session.logout());
      } catch {
        return;
      } finally {
        signingOut.set(false);
      }
      shell.goToHome();
    },
    signingOut: signingOut.asReadonly(),
    specialties: computed<readonly SpecialtyEntry[]>(() => {
      const { specialties, techniques } = lists();
      const all = techniques.hasValue() ? (techniques.value() ?? []) : [];
      return (specialties.hasValue() ? (specialties.value() ?? []) : []).map((s) => ({
        id: s.id,
        name: s.name,
        techniques: all.filter((t) => t.specialty === s.name).map((t) => t.name),
      }));
    }),
    specialtiesLoading: computed(() => {
      const { specialties, techniques } = lists();
      return specialties.isLoading() || techniques.isLoading();
    }),
    retrySpecialties() {
      const { specialties, techniques } = lists();
      if (specialties.status() === 'error') specialties.reload();
      if (techniques.status() === 'error') techniques.reload();
    },
    href({ route, fragment, queryParams, href }) {
      if (route === undefined) return href ?? null;
      const query = new URLSearchParams(queryParams).toString();
      return `${environment.shellUrl}${route}${query ? `?${query}` : ''}${fragment ? `#${fragment}` : ''}`;
    },
    navigate: () => false,
  };
}

/** Provee la barra compartida con la sesión de SIMIQ3D y los destinos del shell. */
export function provideShellHost(): Provider {
  return { provide: SHELL_HOST, useFactory: simiq3dShellHost };
}

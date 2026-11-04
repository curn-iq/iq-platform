import { inject, Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { isModuleUrl } from '../../domain/module-links';
import { FullNavigation } from '../router/full-navigation';
import { returnTarget } from './login-path';

/**
 * A dónde va quien ya tiene sesión, en un solo lugar para `guestGuard` y para la pantalla de la
 * cuenta (al ingresar, al crear la cuenta o cuando la sesión se confirma con la pantalla abierta).
 * El destino es `returnTarget()`: el `?volver=` si es de este origen y no de la cuenta, o el
 * catálogo.
 */
@Injectable({ providedIn: 'root' })
export class ReturnNavigation {
  private readonly router = inject(Router);
  private readonly fullNavigation = inject(FullNavigation);

  /**
   * Una ruta de esta app vuelve como `UrlTree`, para el router. Una de SIMIQ3D o SIVRI sale con
   * navegación completa y devuelve `false`: el router no la conoce y mostraría «No encontrada».
   */
  resolve(volver: string | null): UrlTree | false {
    const target = returnTarget(volver);
    if (!isModuleUrl(target)) return this.router.parseUrl(target);
    this.fullNavigation.assign(target);
    return false;
  }
}

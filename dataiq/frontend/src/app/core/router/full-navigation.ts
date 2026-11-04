import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/**
 * Navegación completa: le pide la página al servidor en lugar de al router. Es como se entra a
 * SIMIQ3D y SIVRI, apps aparte servidas en el mismo origen (Resuelto 17 de
 * `dataiq/docs/checklist-frontend.md`). Es un servicio para poder cambiarlo en las pruebas, donde
 * el navegador de prueba no navega.
 */
@Injectable({ providedIn: 'root' })
export class FullNavigation {
  private readonly location = inject(DOCUMENT).location;

  assign(url: string): void {
    this.location.assign(url);
  }
}

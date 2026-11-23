import { Injectable, signal } from '@angular/core';

/**
 * Cómo se arma la página alrededor de la pantalla abierta. La cámara va sin la barra del shell:
 * lleva su propia barra de estado («Salir» y «EN VIVO») y el video aprovecha el alto.
 */
@Injectable({ providedIn: 'root' })
export class Layout {
  /** Sin la barra del shell: la pantalla abierta ocupa todo. */
  readonly immersive = signal(false);
}

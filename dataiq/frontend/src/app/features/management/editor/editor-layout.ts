import { InjectionToken } from '@angular/core';

/**
 * Lo que un paso necesita saber del armado de la pantalla del editor: dónde está su barra de abajo
 * (Anterior y Siguiente, pegada al borde de la ventana) y lo que va justo antes de ella. Lo provee
 * `Editor`; así un paso no busca la barra en el documento ni depende de cómo está armada la página.
 */
export interface EditorLayout {
  /** La barra de abajo y el contenido que la precede, o `undefined` si todavía no está en pantalla. */
  bottomBar(): { bar: HTMLElement; content: HTMLElement } | undefined;
}

export const EDITOR_LAYOUT = new InjectionToken<EditorLayout>('EDITOR_LAYOUT');

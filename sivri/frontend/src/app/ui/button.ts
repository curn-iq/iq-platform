import { Component } from '@angular/core';

/**
 * El botón de SIVRI (`design/README.md`, «SIVRI: celular y computador (mockups)»): tinta con texto
 * blanco, 56 px de alto y 12 px de radio; desactivado, filete con texto `tinta-3`. Sin verde:
 * en SIVRI lo que en el resto del ecosistema va en `marca` va en tinta.
 *
 * Se usa sobre `<button appButton>` y `<a appButton>`.
 */
@Component({
  selector: 'button[appButton], a[appButton]',
  template: '<ng-content />',
  styleUrl: './button.scss',
})
export class AppButton {}

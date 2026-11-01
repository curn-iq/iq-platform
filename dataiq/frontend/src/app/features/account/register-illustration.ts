import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * La ilustración de «Crear cuenta» en el ingreso directo: una estudiante aprende con la
 * app, frente a una mesa en cuadrícula (la formación). Plana, en SVG y sin rostro, del
 * mockup `cuenta.html`; ver «Ingresar / Crear cuenta (página)» en `DESIGN.md`. Es decorativa.
 */
@Component({
  selector: 'figure[app-register-illustration]',
  templateUrl: './register-illustration.html',
  styleUrl: './illustration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterIllustration {}

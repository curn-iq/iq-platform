import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * La ilustración de «Ingresar» en el ingreso directo: una instrumentadora toma una pieza
 * de la mesa de Mayo bajo la lámpara (la práctica). Plana, en SVG y sin rostro, del mockup
 * `cuenta.html`; ver «Ingresar / Crear cuenta (página)» en `DESIGN.md`. Es decorativa.
 */
@Component({
  selector: 'figure[app-login-illustration]',
  templateUrl: './login-illustration.html',
  styleUrl: './illustration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginIllustration {}

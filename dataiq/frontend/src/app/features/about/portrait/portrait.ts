import { IMAGE_LOADER, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { aboutImageLoader, PORTRAIT_SRCSET, TeamMember } from '../about-photos';

/**
 * El retrato de una persona del equipo (componente «Integrante» del Figma): la foto 4:5 con radio 16, el
 * nombre y la carrera, sin tarjeta, borde ni sombra. No es un enlace. Con un puntero fino, al señalarlo
 * la foto se acerca a 1.04 dentro del recorte y el nombre pasa a `marca-hondo`; en pantallas táctiles no
 * cambia nada. Ver «Nosotros (página)» en `design/README.md`.
 */
@Component({
  selector: 'app-portrait',
  imports: [NgOptimizedImage],
  templateUrl: './portrait.html',
  styleUrl: './portrait.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: IMAGE_LOADER, useValue: aboutImageLoader(840) }],
})
export class Portrait {
  readonly member = input.required<TeamMember>();

  protected readonly srcset = PORTRAIT_SRCSET;
}

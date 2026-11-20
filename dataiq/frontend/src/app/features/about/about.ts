import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLink } from '../../shared/ui/arrow-link/arrow-link';

/**
 * La página «Nosotros» (`/nosotros`): quiénes hacen IQ Platform. Pública y sin API. Va, de arriba
 * abajo, la presentación (titular, entradilla y «Ver cómo funciona»), el carrusel, «Los dos
 * programas» y «Conoce al equipo»; cada sección entra en su casilla de la fase 10 de
 * `dataiq/docs/checklist-frontend.md`. Ver «Nosotros (página)» en `DESIGN.md`.
 */
@Component({
  selector: 'app-about',
  imports: [ArrowLink, RouterLink],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {}

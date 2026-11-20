import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * La página «Nosotros» (`/nosotros`): quiénes hacen IQ Platform. Pública y sin API. Las secciones
 * (presentación, carrusel, «Los dos programas» y «Conoce al equipo») se agregan en las casillas de la
 * fase 10 de `dataiq/docs/checklist-frontend.md`.
 */
@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {}

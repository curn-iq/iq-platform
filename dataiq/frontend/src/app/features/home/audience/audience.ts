import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * «Para quien estudia y para quien enseña.» (id `quien`): dos perfiles pequeños,
 * Estudiantes y Docentes, cada uno con su pictograma. A este perfil llevan «Guía
 * para estudiantes» y «Para docentes» (Resuelto 26 de
 * `dataiq/docs/checklist-frontend.md`). Ver «Titular Lateral» en `DESIGN.md`.
 */
@Component({
  selector: 'app-home-audience',
  templateUrl: './audience.html',
  styleUrl: './audience.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeAudience {}

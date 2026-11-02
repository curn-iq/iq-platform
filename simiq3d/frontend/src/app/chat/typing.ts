import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Tres puntos que laten uno tras otro mientras llega la respuesta de SIMIQ3D:
 * en el historial y, en celular, en lugar de la última respuesta («Mientras
 * llega la respuesta» en `DESIGN.md`).
 */
@Component({
  selector: 'app-typing',
  templateUrl: './typing.html',
  styleUrl: './typing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', 'aria-label': 'SIMIQ3D está respondiendo' },
})
export class Typing {}

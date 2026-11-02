import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import type { SceneView } from '../../viewer/mayo-scene';

/**
 * Los controles de vista, abajo a la derecha: «3D · Arriba», y acercar, alejar y
 * centrar la mesa («Controles de vista» en `DESIGN.md`).
 */
@Component({
  selector: 'app-view-controls',
  templateUrl: './view-controls.html',
  styleUrl: './view-controls.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'toolbar', 'aria-label': 'Vista de la escena' },
})
export class ViewControls {
  readonly view = model<SceneView>('3d');
  readonly zoom = output<1 | -1>();
  readonly center = output<void>();
}

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { SceneView } from '../../viewer/mayo-scene';

/**
 * Los controles de vista, abajo a la derecha: «3D · Arriba», y acercar, alejar y
 * centrar la mesa, todos con ícono. En celular (y con la pantalla baja) son un solo botón
 * que despliega los íconos de ubicar en posición original, 3D y arriba; el zoom lo hace
 * el pellizco («Controles de vista» en `DESIGN.md`).
 */
@Component({
  selector: 'app-view-controls',
  imports: [NgTemplateOutlet],
  templateUrl: './view-controls.html',
  styleUrl: './view-controls.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'toolbar',
    'aria-label': 'Vista de la escena',
    '(document:keydown.escape)': 'open.set(false)',
    '(document:pointerdown)': 'outside($event)',
  },
})
export class ViewControls {
  readonly view = model<SceneView>('3d');
  /** Un solo botón con un menú, en vez de los botones sueltos. */
  readonly menu = input(false);
  readonly zoom = output<1 | -1>();
  readonly center = output<void>();

  protected readonly open = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected outside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node))
      this.open.set(false);
  }

  protected pick(view: SceneView): void {
    this.view.set(view);
    this.open.set(false);
  }

  protected reset(): void {
    this.center.emit();
    this.open.set(false);
  }
}

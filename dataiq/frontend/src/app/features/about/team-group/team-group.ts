import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { mediaQuery, MOBILE_QUERY } from '../../../shared/media-query';
import { TeamGroup } from '../about-photos';
import { Portrait } from '../portrait/portrait';

/**
 * Un grupo de «Conoce al equipo»: el rótulo (filete de 2 px, programa y lema) y los tres retratos. En
 * escritorio y tablet van en 3 columnas; en celular, en un carril horizontal con `scroll-snap`, con un
 * trazo de 3 px que marca por cuál retrato va el carril (decorativo). Ver «Nosotros (página)» en
 * `design/README.md`.
 */
@Component({
  selector: 'app-team-group',
  imports: [Portrait],
  templateUrl: './team-group.html',
  styleUrl: './team-group.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamGroupSection {
  readonly group = input.required<TeamGroup>();

  /** En celular los retratos van en un carril con scroll. */
  protected readonly mobile = mediaQuery(MOBILE_QUERY);

  /** El retrato al que llegó el carril en celular. */
  protected readonly current = signal(0);

  /** El carril se desplazó: el retrato actual es el que quedó más cerca del inicio. */
  protected onLaneScroll(lane: HTMLElement): void {
    const first = lane.firstElementChild as HTMLElement | null;
    if (!first) return;
    const step = first.offsetWidth + (parseFloat(getComputedStyle(lane).columnGap) || 0);
    const last = this.group().members.length - 1;
    // Al llegar al final, el último cuenta como actual aunque no quepa al inicio del carril
    const atEnd = lane.scrollLeft + lane.clientWidth >= lane.scrollWidth - 2;
    this.current.set(atEnd ? last : Math.min(last, Math.round(lane.scrollLeft / step)));
  }
}

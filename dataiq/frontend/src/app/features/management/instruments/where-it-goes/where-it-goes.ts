import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { placementsBySpecialty, type Placement } from '../../../../domain/instrument-catalog';
import { TECHNIQUE_TABS } from '../../../../domain/technique-tabs';
import { TableMiniature } from '../../../../shared/table-diagram/table-miniature';

/** Una fila de «Dónde va»: el lugar, el turno de su miniatura y a qué hoja de la técnica lleva. */
interface Row {
  placement: Placement;
  /** El turno de la fila entre todas, para que las celdas se enciendan una tras otra. */
  turn: number;
  /** La pestaña de la técnica que muestra esa mesa. */
  tab: string;
}

/**
 * «Dónde va» de un instrumento (`DESIGN.md`, «Catálogo de instrumental (página)»; Resuelto 19 de
 * `dataiq/docs/checklist-frontend.md`): cada técnica publicada que lo lleva en una mesa, agrupada por
 * especialidad, con la mesa y el número y la mesa en miniatura con su celda encendida. Una mesa de más de
 * 10 columnas ocupa la fila entera; en tableta y celular va una columna. Cada fila lleva a la hoja de esa
 * mesa en la técnica.
 */
@Component({
  selector: 'app-where-it-goes',
  imports: [RouterLink, TableMiniature],
  templateUrl: './where-it-goes.html',
  styleUrl: './where-it-goes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhereItGoes {
  readonly placements = input.required<readonly Placement[]>();
  /** Las especialidades en el orden en que se muestran. */
  readonly specialties = input.required<readonly string[]>();

  protected readonly groups = computed(() => {
    let turn = 0;
    return placementsBySpecialty(this.placements(), this.specialties()).map((group) => ({
      specialty: group.specialty,
      rows: group.placements.map((placement): Row => ({
        placement,
        turn: turn++,
        tab:
          TECHNIQUE_TABS.find((tab) => tab.zone === placement.table.name)?.slug ?? 'datos-clinicos',
      })),
    }));
  });
}

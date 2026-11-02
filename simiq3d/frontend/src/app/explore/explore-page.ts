import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { DataIQRepository } from '../data/dataiq.repository';
import { toMayoTable } from '../data/mayo-table';
import { Simiq3dRepository } from '../data/simiq3d.repository';
import { placeItems } from '../domain/placement';
import { Viewer } from '../viewer/viewer';

/**
 * La pantalla de exploración: `/simiq3d` y `/simiq3d/tecnicas/:id`. Por ahora,
 * la versión técnica de la fase 2 del frontend: la lista de técnicas, el visor y
 * una leyenda para señalar cada pieza. La pantalla final (chat, ficha, barra del
 * shell) es la fase 4.
 */
@Component({
  selector: 'app-explore-page',
  imports: [RouterLink, Viewer],
  templateUrl: './explore-page.html',
  styleUrl: './explore-page.scss',
})
export class ExplorePage {
  /** La técnica de la ruta (`:id`); sin ella, la mesa queda vacía. */
  readonly id = input<string>();

  private readonly dataiq = inject(DataIQRepository);
  private readonly simiq3d = inject(Simiq3dRepository);
  protected readonly techniques = this.dataiq.techniques();
  protected readonly tables = this.dataiq.tables(() => this.id());
  private readonly models = this.simiq3d.models();

  protected readonly technique = computed(() =>
    this.techniques.value()?.find((technique) => technique.id === this.id()),
  );
  /** La mesa de Mayo; `null` si la técnica no la lleva o DataIQ no trae su tamaño. */
  protected readonly mayo = computed(() => {
    const tables = this.tables.value();
    return tables === undefined ? undefined : toMayoTable(tables);
  });
  /** Lo que dibuja el visor; `undefined` mientras llegan la mesa y el mapeo de modelos. */
  protected readonly placed = computed(() => {
    const mayo = this.mayo();
    const models = this.models.value();
    if (mayo === undefined || models === undefined) return undefined;
    if (mayo === null) return [];
    const byInstrument = new Map(models.map((m) => [m.instrument_id, m.model_file]));
    return placeItems(mayo, (instrumentId) => byInstrument.get(instrumentId));
  });
  /** El objeto señalado; al cambiar de técnica, ninguno. */
  protected readonly selected = linkedSignal<string | undefined, string | null>({
    source: () => this.id(),
    computation: () => null,
  });
  /** La mesa de esta técnica en DataIQ, para el aviso sin 3D. */
  protected readonly dataiqUrl = computed(
    () => `${environment.shellUrl}/tecnicas/${encodeURIComponent(this.id() ?? '')}/mesa-de-mayo`,
  );
}

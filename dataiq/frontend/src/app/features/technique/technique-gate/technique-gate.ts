import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Table } from '../../../domain/table';
import { TableDiagram } from '../../../shared/table-diagram/table-diagram';
import { Button } from '../../../shared/ui/button/button';

/** Lo que se ve de fondo: la lista de instrumental o una mesa. */
export type GatePreview = 'objects' | 'table';

/**
 * Una mesa vacía de 7 columnas: sin sesión no hay datos de la mesa de la técnica (la API
 * los entrega solo con cuenta, Resuelto 27), así que se dibuja la cuadrícula sin objetos.
 * Con la variante `preview` solo se ven sus dos filas y media de arriba, difuminadas.
 */
const BLANK_TABLE: Table = { zoneId: '', name: '', rows: 6, columns: 7, items: [] };

/** Cuántas filas de barras muestra el vistazo del instrumental: dos filas de tres. */
const PLACEHOLDER_ROWS = 6;

/**
 * La puerta de cuenta de las pestañas Instrumental, Mesa de Mayo y Mesa de reserva sin
 * sesión (ver «Puerta de cuenta» en `DESIGN.md`): un vistazo difuminado hacia abajo y,
 * debajo, la tarjeta con «Crear cuenta gratis» y «Ya tengo cuenta». Los dos llevan a la
 * cuenta con la técnica, y al ingresar se vuelve a ella (`?volver=`).
 *
 * El vistazo es el mismo para toda técnica, tenga o no esa mesa: nunca dice si falta una.
 * Es decorativo para los lectores de pantalla (`aria-hidden`): la tarjeta es la que dice
 * qué abre la cuenta.
 */
@Component({
  selector: 'app-technique-gate',
  imports: [Button, RouterLink, TableDiagram],
  templateUrl: './technique-gate.html',
  styleUrl: './technique-gate.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueGate {
  readonly preview = input.required<GatePreview>();
  /** Lo que abre la cuenta: «Ver la mesa de Mayo». */
  readonly title = input.required<string>();
  /** Una línea de lo que abre la cuenta; no promete contenido. */
  readonly text = input.required<string>();
  /** La ruta a la que volver al ingresar: la pestaña que se quería abrir. */
  readonly returnTo = input.required<string>();

  protected readonly blankTable = BLANK_TABLE;
  protected readonly placeholders = Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index);
}

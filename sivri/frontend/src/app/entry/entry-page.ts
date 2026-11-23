import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { MARKERS_PDF_URL, TECHNIQUES_URL } from '../links';
import { DESKTOP_QUERY, mediaQuery } from '../shared/media-query';
import { AppButton } from '../ui/button';
import { ArrowLink } from '../ui/arrow-link';
import { Group } from '../ui/group';
import { SiteFooter } from '../ui/site-footer';

/**
 * La entrada a SIVRI. Es pública: no pide cuenta, y es el destino de «Comprobar con la cámara»
 * de DataIQ. En el celular explica qué hace falta y lleva a la cámara. En el computador solo
 * explica y lleva al celular, con la dirección y un código QR: la cámara del computador no ve
 * la mesa desde arriba (`DESIGN.md`, «SIVRI: celular y computador (mockups)»).
 */
@Component({
  selector: 'app-entry-page',
  imports: [AppButton, ArrowLink, Group, RouterLink, SiteFooter],
  templateUrl: './entry-page.html',
  styleUrl: './entry-page.scss',
})
export class EntryPage {
  /** Un computador: explica y lleva al celular, sin camino a la cámara. */
  protected readonly desktop = mediaQuery(DESKTOP_QUERY);
  protected readonly markersUrl = MARKERS_PDF_URL;
  protected readonly techniquesUrl = TECHNIQUES_URL;
  /** La dirección a la que lleva el código QR, sin el protocolo, como se escribe en el celular. */
  protected readonly address = environment.publicUrl.replace(/^https?:\/\//, '');
}

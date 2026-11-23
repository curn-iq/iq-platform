import { Component } from '@angular/core';
import { SOURCE_URL } from '../links';

/**
 * El pie oscuro: lo que pasa con las imágenes y el enlace al código fuente. La AGPL-3.0 obliga
 * a ofrecer el código a quien usa SIVRI por internet (`sivri/README.md`, «Licencia»).
 */
@Component({
  selector: 'app-site-footer',
  template: `
    <footer class="footer">
      <p class="note">Las imágenes se procesan y no se guardan.</p>
      <a class="source" [href]="sourceUrl" target="_blank" rel="noopener"
        >Código fuente (AGPL-3.0)</a
      >
    </footer>
  `,
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly sourceUrl = SOURCE_URL;
}

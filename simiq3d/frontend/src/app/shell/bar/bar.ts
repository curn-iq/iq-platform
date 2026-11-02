import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SessionService } from '../../core/session/session.service';
import { initials } from '../../shared/initials';

/**
 * La barra del shell en SIMIQ3D: la marca, la etiqueta del módulo, «Técnicas»
 * y «Herramientas» (páginas del shell, con navegación completa porque es otra
 * app), «Explorar en 3D» (esta) y la cuenta. Ver «SIMIQ3D: explorar en 3D» en
 * `DESIGN.md`.
 */
@Component({
  selector: 'app-bar',
  imports: [RouterLink],
  templateUrl: './bar.html',
  styleUrl: './bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bar {
  protected readonly session = inject(SessionService);
  protected readonly shell = environment.shellUrl;
  protected readonly letters = computed(() => {
    const account = this.session.account();
    return account ? initials(account.name) : '';
  });
}

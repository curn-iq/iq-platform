import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../shared-shell/navbar/navbar';
import { Layout } from './core/layout/layout';
import { SessionService } from './core/session/session.service';

@Component({
  imports: [Navbar, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly layout = inject(Layout);

  constructor() {
    // La entrada y la página del computador son públicas y no pasan por `sessionGuard`: la
    // barra necesita saber si hay sesión para mostrar «Ingresar» o «Mi cuenta».
    void inject(SessionService).check();
  }
}

import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoticeService } from './core/notice/notice.service';
import { SessionService } from './core/session/session.service';
import { Footer } from './shell/footer/footer';
import { Navbar } from './shell/navbar/navbar';
import { SessionUnavailable } from './shell/session-unavailable/session-unavailable';
import { NoticeStack } from './shared/ui/notice-stack/notice-stack';

@Component({
  imports: [Footer, Navbar, RouterOutlet, NoticeStack, SessionUnavailable],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly notices = inject(NoticeService);
  protected readonly session = inject(SessionService);
}

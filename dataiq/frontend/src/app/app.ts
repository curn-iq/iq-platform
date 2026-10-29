import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoticeService } from './core/notice/notice.service';
import { Footer } from './shell/footer/footer';
import { Navbar } from './shell/navbar/navbar';
import { NoticeStack } from './shared/ui/notice-stack/notice-stack';

@Component({
  imports: [Footer, Navbar, RouterOutlet, NoticeStack],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly notices = inject(NoticeService);
}

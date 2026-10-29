import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoticeService } from './core/notice/notice.service';
import { Navbar } from './shell/navbar/navbar';
import { NoticeStack } from './shared/ui/notice-stack/notice-stack';

@Component({
  imports: [Navbar, RouterOutlet, NoticeStack],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly notices = inject(NoticeService);
}

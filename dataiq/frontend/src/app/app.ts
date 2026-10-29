import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NoticeService } from './core/notice/notice.service';
import { NoticeStack } from './shared/ui/notice-stack/notice-stack';

@Component({
  imports: [RouterOutlet, NoticeStack],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly notices = inject(NoticeService);
}

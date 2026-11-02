import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Bar } from './shell/bar/bar';

@Component({
  imports: [Bar, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}

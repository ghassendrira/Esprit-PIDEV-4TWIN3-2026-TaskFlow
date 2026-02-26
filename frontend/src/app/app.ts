import { Component } from '@angular/core';
import { ShellComponent } from './core/shell/shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ShellComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {}

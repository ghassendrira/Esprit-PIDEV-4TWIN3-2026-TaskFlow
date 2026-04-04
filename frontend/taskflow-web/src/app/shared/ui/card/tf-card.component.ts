import { Component } from '@angular/core';

@Component({
  selector: 'tf-card',
  standalone: true,
  template: `<div class="bg-white border border-slate-200 rounded-xl shadow-[var(--tf-shadow)] p-4 hover:-translate-y-0.5 transition-transform"><ng-content></ng-content></div>`,
  styles: [`
    :host { display: block; }
  `]
})
export class TfCardComponent {}

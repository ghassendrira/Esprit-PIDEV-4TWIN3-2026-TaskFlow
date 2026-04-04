import { Component } from '@angular/core';

@Component({
  selector: 'tf-card',
  standalone: true,
  template: `<div class="tf-card"><ng-content></ng-content></div>`,
  styles: [`
    :host { display: block; }
  `]
})
export class TfCardComponent {}

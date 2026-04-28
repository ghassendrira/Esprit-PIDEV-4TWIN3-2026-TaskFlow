import { Component, Input } from '@angular/core';

@Component({
  selector: 'tf-loader',
  standalone: true,
  template: `<div class="w-full rounded bg-slate-200 animate-pulse" [style.height.px]="height"></div>`
})
export class LoaderComponent {
  @Input() height = 16;
}

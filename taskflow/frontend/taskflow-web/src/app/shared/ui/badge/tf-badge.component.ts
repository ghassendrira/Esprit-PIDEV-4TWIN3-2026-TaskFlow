import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'tf-badge',
  standalone: true,
  imports: [NgIf],
  template: `
    <span class="relative inline-flex items-center">
      <ng-content></ng-content>
      <span *ngIf="value" class="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] leading-4 grid place-items-center">
        {{ value }}
      </span>
    </span>
  `
})
export class TfBadgeComponent {
  @Input() value: string | number | null = null;
  @Input() color: 'primary' | 'accent' | 'warn' | undefined = 'primary';
}

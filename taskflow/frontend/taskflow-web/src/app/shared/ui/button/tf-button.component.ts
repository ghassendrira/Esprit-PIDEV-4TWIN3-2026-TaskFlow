import { Component, Input } from '@angular/core';

@Component({
  selector: 'tf-button',
  standalone: true,
  template: `
    <button [class]="classes" [disabled]="disabled"><ng-content></ng-content></button>
  `
})
export class TfButtonComponent {
  @Input() kind: 'primary' | 'secondary' | 'danger' = 'primary';
  @Input() disabled = false;
  get classes() {
    const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors';
    const variants: Record<'primary'|'secondary'|'danger', string> = {
      primary: 'bg-primary text-white hover:bg-primary-600 shadow',
      secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
      danger: 'bg-rose-600 text-white hover:bg-rose-700'
    };
    return `${base} ${variants[this.kind] ?? variants['primary']}`;
  }
}

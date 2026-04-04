import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'tf-modal',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="modal" *ngIf="open">
      <div class="backdrop" (click)="close.emit()"></div>
      <div class="panel">
        <header class="header">{{ title }}</header>
        <section class="content"><ng-content></ng-content></section>
        <footer class="footer"><ng-content select="[modal-actions]"></ng-content></footer>
      </div>
    </div>
  `,
  styles: [`
    .modal { position: fixed; inset: 0; display: grid; place-items: center; z-index: 1000; }
    .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.3); }
    .panel { position: relative; width: min(600px, 92vw); background: var(--tf-card); border-radius: 12px; border: 1px solid var(--tf-border); box-shadow: var(--tf-shadow); overflow: hidden; animation: zoomIn .18s ease; }
    .header { padding: 12px 16px; font-weight: 600; border-bottom: 1px solid var(--tf-border); }
    .content { padding: 16px; }
    .footer { padding: 12px 16px; border-top: 1px solid var(--tf-border); display: flex; justify-content: flex-end; gap: 8px; }
    @keyframes zoomIn { from { transform: scale(.98); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `]
})
export class ModalComponent {
  @Input() title = '';
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
}

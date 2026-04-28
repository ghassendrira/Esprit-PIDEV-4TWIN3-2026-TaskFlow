import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'tf-app-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <tf-modal [open]="open" [title]="title" (close)="cancel.emit()">
      <div class="dialog-body">
        <p *ngIf="message" class="dialog-message">{{ message }}</p>

        <label *ngIf="mode === 'prompt'" class="dialog-field">
          <span *ngIf="inputLabel" class="dialog-label">{{ inputLabel }}</span>
          <textarea
            [(ngModel)]="value"
            [placeholder]="placeholder"
            rows="3"
            class="dialog-input"
          ></textarea>
        </label>
      </div>

      <div modal-actions>
        <button *ngIf="mode !== 'alert'" type="button" class="dialog-btn secondary" (click)="cancel.emit()">
          {{ cancelLabel }}
        </button>
        <button type="button" class="dialog-btn" [class.danger]="danger" (click)="confirm.emit(value)">
          {{ confirmLabel }}
        </button>
      </div>
    </tf-modal>
  `,
  styles: [`
    .dialog-body { display: grid; gap: 12px; }
    .dialog-message { margin: 0; color: var(--tf-on-surface); line-height: 1.5; white-space: pre-line; }
    .dialog-field { display: grid; gap: 8px; }
    .dialog-label { font-size: 13px; color: var(--tf-muted); }
    .dialog-input {
      width: 100%;
      min-height: 88px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--tf-border);
      background: var(--tf-surface);
      color: var(--tf-on-surface);
      resize: vertical;
      outline: none;
    }
    .dialog-btn {
      border: 0;
      border-radius: 10px;
      padding: 9px 14px;
      background: var(--tf-primary);
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    .dialog-btn.secondary {
      background: transparent;
      color: var(--tf-on-surface);
      border: 1px solid var(--tf-border);
    }
    .dialog-btn.danger { background: #dc2626; }
  `],
})
export class AppDialogComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() message = '';
  @Input() mode: 'alert' | 'confirm' | 'prompt' = 'alert';
  @Input() value = '';
  @Input() inputLabel = '';
  @Input() placeholder = '';
  @Input() confirmLabel = 'OK';
  @Input() cancelLabel = 'Cancel';
  @Input() danger = false;

  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
}

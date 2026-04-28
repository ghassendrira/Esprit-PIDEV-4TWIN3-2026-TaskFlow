import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'tf-table',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="overflow-auto rounded" style="border: 1px solid var(--tf-border);">
      <table class="min-w-full text-sm" style="color: var(--tf-on-surface);">
        <thead style="background: var(--tf-surface-2); color: var(--tf-muted);">
          <tr>
            <th *ngFor="let col of columns" class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr *ngFor="let row of data" class="transition" style="border-top: 1px solid rgba(0,0,0,0.04);">
            <td *ngFor="let col of columns" class="px-3 py-2">
              {{ row[col.key] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    :host { display: block; }
    tbody tr:hover { background: rgba(0,0,0,0.02); }
    :root[data-theme='dark'] tbody tr:hover, .dark tbody tr:hover { background: rgba(255,255,255,0.04); }
  `]
})
export class TfTableComponent {
  @Input() columns: { key: string; label: string }[] = [];
  @Input() data: Record<string, any>[] = [];
}

import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'tf-table',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="overflow-auto rounded border border-slate-200">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-slate-600">
          <tr>
            <th *ngFor="let col of columns" class="text-left font-medium px-3 py-2 border-b border-slate-200">
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr *ngFor="let row of data" class="hover:bg-slate-50 transition">
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
  `]
})
export class TfTableComponent {
  @Input() columns: { key: string; label: string }[] = [];
  @Input() data: Record<string, any>[] = [];
}

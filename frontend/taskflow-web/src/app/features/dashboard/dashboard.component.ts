import { Component } from '@angular/core';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { TfTableComponent } from '../../shared/ui/table/tf-table.component';

@Component({
  selector: 'tf-dashboard',
  standalone: true,
  imports: [TfCardComponent, TfTableComponent],
  template: `
    <section class="tf-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
      <tf-card>
        <div class="metric">
          <div class="label">Revenu</div>
          <div class="value">12 450 TND</div>
        </div>
      </tf-card>
      <tf-card>
        <div class="metric">
          <div class="label">Dépenses</div>
          <div class="value">7 820 TND</div>
        </div>
      </tf-card>
      <tf-card>
        <div class="metric">
          <div class="label">Profit</div>
          <div class="value">4 630 TND</div>
        </div>
      </tf-card>
    </section>

    <div class="tf-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 16px;">
      <tf-card style="grid-column: span 2;">
        <div class="chart" aria-label="Chart placeholder"></div>
      </tf-card>
      <tf-card>
        <div class="mini-cards tf-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="tf-skeleton" style="height: 56px;"></div>
          <div class="tf-skeleton" style="height: 56px;"></div>
          <div class="tf-skeleton" style="height: 56px;"></div>
          <div class="tf-skeleton" style="height: 56px;"></div>
        </div>
      </tf-card>
    </div>

    <tf-card style="margin-top: 16px;">
      <h3 style="margin: 0 0 8px;">Factures récentes</h3>
      <tf-table [columns]="invoiceColumns" [data]="invoiceData"></tf-table>
    </tf-card>
  `,
  styles: [`
    .metric { display: grid; gap: 4px; }
    .label { opacity: .7; font-size: 13px; }
    .value { font-size: 22px; font-weight: 700; }
    .chart { height: 220px; border-radius: 8px; border: 1px dashed var(--tf-border); background: #fafafa; }
    @media (max-width: 900px) {
      section.tf-grid, .tf-grid { grid-template-columns: 1fr !important; }
    }
  `]
})
export class DashboardComponent {
  invoiceColumns = [
    { key: 'client', label: 'Client' },
    { key: 'amount', label: 'Montant' },
    { key: 'status', label: 'Statut' },
    { key: 'issuedAt', label: 'Émise le' },
  ];
  invoiceData = [
    { client: 'Acme SARL', amount: '1 200 TND', status: 'PAYÉ', issuedAt: '2026-02-01' },
    { client: 'Beta SA', amount: '840 TND', status: 'EN ATTENTE', issuedAt: '2026-01-28' },
    { client: 'Gamma', amount: '2 400 TND', status: 'EN RETARD', issuedAt: '2026-01-20' }
  ];
}


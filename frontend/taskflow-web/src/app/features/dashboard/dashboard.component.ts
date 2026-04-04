import { Component } from '@angular/core';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { TfTableComponent } from '../../shared/ui/table/tf-table.component';

@Component({
  selector: 'tf-dashboard',
  standalone: true,
  imports: [TfCardComponent, TfTableComponent],
  template: `
    <header class="dash-header">
      <div>
        <h1 class="dash-title">Dashboard</h1>
        <p class="dash-subtitle">Aperçu rapide de votre activité.</p>
      </div>
      <div class="dash-pill" aria-label="Période">
        <span class="dot"></span>
        <span>Ce mois</span>
      </div>
    </header>

    <section class="dash-grid metrics">
      <tf-card>
        <div class="metric">
          <div class="k">Revenu</div>
          <div class="v">12 450 TND</div>
          <div class="h">+8% vs mois dernier</div>
        </div>
      </tf-card>
      <tf-card>
        <div class="metric">
          <div class="k">Dépenses</div>
          <div class="v">7 820 TND</div>
          <div class="h">-2% vs mois dernier</div>
        </div>
      </tf-card>
      <tf-card>
        <div class="metric">
          <div class="k">Profit</div>
          <div class="v">4 630 TND</div>
          <div class="h">Marge 37%</div>
        </div>
      </tf-card>
    </section>

    <section class="dash-grid blocks">
      <tf-card class="chart-card">
        <div class="block-title">Performance</div>
        <div class="chart tf-skeleton" aria-label="Chart placeholder"></div>
      </tf-card>
      <tf-card>
        <div class="block-title">Raccourcis</div>
        <div class="mini-grid">
          <div class="mini tf-skeleton"></div>
          <div class="mini tf-skeleton"></div>
          <div class="mini tf-skeleton"></div>
          <div class="mini tf-skeleton"></div>
        </div>
      </tf-card>
    </section>

    <tf-card class="table-card">
      <div class="table-head">
        <h3 style="margin: 0;">Factures récentes</h3>
        <span class="muted">Dernières activités</span>
      </div>
      <tf-table [columns]="invoiceColumns" [data]="invoiceData"></tf-table>
    </tf-card>
  `,
  styles: [`
    :host { display: block; }

    .dash-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .dash-title { margin: 0; font-size: 22px; line-height: 1.2; letter-spacing: -0.02em; }
    .dash-subtitle { margin: 6px 0 0; color: var(--tf-muted); font-size: 13px; }

    .dash-pill { display: inline-flex; align-items: center; gap: 10px; height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--tf-border); background: var(--tf-card); color: var(--tf-muted); font-size: 12px; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--tf-primary); opacity: .9; }

    .dash-grid { display: grid; gap: 12px; }
    .dash-grid.metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .dash-grid.blocks { grid-template-columns: 2fr 1fr; margin-top: 12px; }

    .metric { display: grid; gap: 6px; }
    .metric .k { color: var(--tf-muted); font-size: 12px; font-weight: 600; letter-spacing: .02em; }
    .metric .v { font-size: 26px; font-weight: 750; letter-spacing: -0.02em; }
    .metric .h { color: var(--tf-muted); font-size: 12px; }

    .block-title { font-weight: 700; margin-bottom: 10px; }
    .chart { height: 220px; border-radius: 10px; border: 1px dashed var(--tf-border); }
    .mini-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .mini { height: 58px; border-radius: 10px; }

    .table-card { margin-top: 12px; }
    .table-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }

    @media (max-width: 900px) {
      .dash-header { align-items: flex-start; flex-direction: column; }
      .dash-grid.metrics { grid-template-columns: 1fr; }
      .dash-grid.blocks { grid-template-columns: 1fr; }
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


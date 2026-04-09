import { Component } from '@angular/core';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { TfTableComponent } from '../../shared/ui/table/tf-table.component';

@Component({
  selector: 'tf-dashboard',
  standalone: true,
  imports: [TfCardComponent, TfTableComponent],
  template: `
    <header class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Aperçu rapide de votre activité.</p>
      </div>
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
        <span class="w-2 h-2 rounded-full bg-primary-500"></span>
        <span>Ce mois</span>
      </div>
    </header>

    <section class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <tf-card>
        <div class="flex flex-col gap-1">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revenu</div>
          <div class="text-2xl font-extrabold tracking-tight">12 450 TND</div>
          <div class="text-xs text-green-600 dark:text-green-400 font-medium">+8% vs mois dernier</div>
        </div>
      </tf-card>
      <tf-card>
        <div class="flex flex-col gap-1">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dépenses</div>
          <div class="text-2xl font-extrabold tracking-tight">7 820 TND</div>
          <div class="text-xs text-red-600 dark:text-red-400 font-medium">-2% vs mois dernier</div>
        </div>
      </tf-card>
      <tf-card>
        <div class="flex flex-col gap-1">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profit</div>
          <div class="text-2xl font-extrabold tracking-tight">4 630 TND</div>
          <div class="text-xs text-blue-600 dark:text-blue-400 font-medium">Marge 37%</div>
        </div>
      </tf-card>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <tf-card class="lg:col-span-2">
        <div class="font-bold mb-4">Performance</div>
        <div class="h-[220px] rounded-xl border border-dashed border-slate-200 dark:border-slate-700 tf-skeleton"></div>
      </tf-card>
      <tf-card>
        <div class="font-bold mb-4">Raccourcis</div>
        <div class="grid grid-cols-2 gap-3">
          <div class="h-14 rounded-xl tf-skeleton"></div>
          <div class="h-14 rounded-xl tf-skeleton"></div>
          <div class="h-14 rounded-xl tf-skeleton"></div>
          <div class="h-14 rounded-xl tf-skeleton"></div>
        </div>
      </tf-card>
    </section>

    <tf-card>
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold">Factures récentes</h3>
          <span class="text-xs text-slate-500 dark:text-slate-400">Dernières activités</span>
        </div>
      </div>
      <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <tf-table [columns]="invoiceColumns" [data]="invoiceData"></tf-table>
      </div>
    </tf-card>
  `,
  styles: [`
    :host { display: block; }
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


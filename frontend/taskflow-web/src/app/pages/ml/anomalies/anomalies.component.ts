import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MlService } from '../../../core/services/ml.service';

@Component({
  selector: 'app-anomalies',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ml-page p-6 bg-[var(--tf-surface)] min-h-screen text-[var(--tf-text)]">
      <div class="mb-8">
        <h2 class="text-3xl font-bold mb-2">🚨 Détection d'Anomalies</h2>
        <p class="text-[var(--tf-muted)]">Surveillance IA des factures suspectes</p>
      </div>

      <!-- Alert si anomalies HIGH -->
      <div *ngIf="highRiskCount > 0" 
           class="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 flex items-center gap-3 animate-pulse">
        <i class="fa-solid fa-triangle-exclamation text-2xl"></i>
        <div>
          <strong class="block">Attention Requise</strong>
          <span>{{ highRiskCount }} facture(s) très suspecte(s) nécessitent une vérification urgente !</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-[var(--tf-surface-2)] p-6 rounded-2xl border border-[var(--tf-border)] shadow-sm">
          <span class="text-sm text-[var(--tf-muted)] block mb-1">📊 Total analysé</span>
          <strong class="text-2xl font-bold">{{ totalInvoices }}</strong>
        </div>
        <div class="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 shadow-sm">
          <span class="text-sm text-red-500 block mb-1">🚨 Anomalies détectées</span>
          <strong class="text-2xl font-bold text-red-500">{{ anomalyCount }}</strong>
        </div>
        <div class="bg-green-500/10 p-6 rounded-2xl border border-green-500/20 shadow-sm">
          <span class="text-sm text-green-500 block mb-1">✅ Factures Normales</span>
          <strong class="text-2xl font-bold text-green-500">{{ totalInvoices - anomalyCount }}</strong>
        </div>
      </div>

      <!-- Tableau anomalies -->
      <div class="bg-[var(--tf-surface-2)] rounded-2xl border border-[var(--tf-border)] overflow-hidden">
        <div class="p-4 border-b border-[var(--tf-border)]">
          <h3 class="text-lg font-semibold">Factures Suspectes</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[var(--tf-surface-3)] text-[var(--tf-muted)] text-xs uppercase tracking-wider">
                <th class="px-6 py-4 font-semibold">Facture</th>
                <th class="px-6 py-4 font-semibold">Montant</th>
                <th class="px-6 py-4 font-semibold">Date</th>
                <th class="px-6 py-4 font-semibold">Score</th>
                <th class="px-6 py-4 font-semibold">Niveau</th>
                <th class="px-6 py-4 font-semibold">Message IA</th>
                <th class="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--tf-border)]">
              <tr *ngFor="let inv of anomalies" 
                  class="transition-colors"
                  [ngClass]="inv.risk_level === 'HIGH' ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-[var(--tf-surface-3)]'">
                <td class="px-6 py-4 font-medium">{{ inv.invoiceNumber }}</td>
                <td class="px-6 py-4 font-semibold">{{ inv.totalTTC | currency:'TND':'symbol':'1.2-2' }}</td>
                <td class="px-6 py-4 text-sm text-[var(--tf-muted)]">{{ inv.date | date:'shortDate' }}</td>
                <td class="px-6 py-4">
                  <span class="text-sm font-mono">{{ inv.anomaly_score }}</span>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded text-xs font-bold uppercase"
                        [ngClass]="inv.risk_level === 'HIGH' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'">
                    {{ inv.risk_level === 'HIGH' ? '🔴' : '🟡' }} {{ inv.risk_level }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm">{{ inv.message }}</td>
                <td class="px-6 py-4 text-center">
                  <button (click)="signaler(inv)" 
                          class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 mx-auto">
                    <i class="fa-solid fa-flag"></i> Signaler
                  </button>
                </td>
              </tr>
              <tr *ngIf="anomalies.length === 0 && !loading">
                <td colspan="7" class="px-6 py-12 text-center text-[var(--tf-muted)]">
                  <i class="fa-solid fa-check-circle text-4xl text-green-500 mb-2 block"></i>
                  ✅ Aucune anomalie détectée !
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="loading" class="mt-8 flex justify-center items-center gap-3 text-primary-500 font-medium">
        <i class="fa-solid fa-shield-halved animate-bounce text-2xl"></i>
        <span>🤖 Analyse de sécurité en cours...</span>
      </div>
    </div>
  `,
  styles: [`
    .ml-page { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AnomaliesComponent implements OnInit {
  private ml = inject(MlService);

  anomalies: any[] = [];
  loading = true;
  totalInvoices = 0;
  anomalyCount = 0;
  highRiskCount = 0;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.ml.getAnomalies().subscribe({
      next: (res: any) => {
        // Backend returns { summary, invoices, expenses }
        if (res && res.invoices && res.invoices.anomalies) {
          const invAnomalies = res.invoices.anomalies.map((inv: any) => ({
            ...inv,
            invoiceNumber: inv.number || inv.invoiceNumber || `INV-${inv.id?.substring(0,8) || '??'}`,
            risk_level: inv.riskLevel || 'HIGH',
            message: inv.message || '⚠️ Anomalie détectée'
          }));
          
          const expAnomalies = (res.expenses?.anomalies || []).map((exp: any) => ({
            ...exp,
            invoiceNumber: `EXP-${exp.id?.substring(0,8) || '??'}`,
            totalTTC: exp.amount,
            risk_level: exp.riskLevel || 'HIGH',
            message: exp.message || '⚠️ Dépense suspecte'
          }));

          this.anomalies = [...invAnomalies, ...expAnomalies];
          this.totalInvoices = (res.summary?.totalInvoices || 0) + (res.summary?.totalExpenses || 0);
          this.anomalyCount = (res.summary?.totalAnomalies || this.anomalies.length);
          this.highRiskCount = this.anomalies.filter(a => a.risk_level === 'HIGH').length;
        } else if (Array.isArray(res)) {
          // Fallback si format plat
          this.anomalies = res.filter((inv: any) => inv.is_anomaly);
          this.totalInvoices = res.length;
          this.anomalyCount = this.anomalies.length;
          this.highRiskCount = this.anomalies.filter(a => a.risk_level === 'HIGH').length;
        } else {
          this.anomalies = [];
          this.totalInvoices = 0;
          this.anomalyCount = 0;
          this.highRiskCount = 0;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  signaler(inv: any) {
    alert(`Signalement envoyé pour la facture ${inv.invoiceNumber}. Un administrateur va vérifier.`);
  }
}

import { Component, OnInit, inject, signal, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MlService } from '../../../core/services/ml.service';
import { BusinessSelectionService } from '../../../core/services/business-selection.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-segmentation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ml-page p-6 bg-[var(--tf-surface)] min-h-screen text-[var(--tf-text)]">
      <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-bold mb-2">👥 Segmentation Clients</h2>
          <p class="text-[var(--tf-muted)]">Classification IA de vos clients B2B</p>
        </div>

        <!-- Business selector -->
        <div class="flex items-center gap-3" *ngIf="businesses().length > 0">
          <label class="text-xs font-bold uppercase tracking-widest text-[var(--tf-muted)] whitespace-nowrap">Business :</label>
          <select [(ngModel)]="selectedBusinessId" (ngModelChange)="onBusinessChange($event)"
                  class="bg-[var(--tf-surface-2)] text-[var(--tf-text)] border border-[var(--tf-border)] rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]">
            <option *ngFor="let b of businesses()" [value]="b.id">{{ b.name }}</option>
          </select>
          <button (click)="loadData()" class="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--tf-border)] hover:bg-[var(--tf-surface-3)] transition-all" title="Rafraîchir">
            <i class="fa-solid fa-rotate text-sm" [class.fa-spin]="loading"></i>
          </button>
        </div>
      </div>

      <!-- Segment Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20 shadow-sm">
          <span class="text-sm text-blue-500 block mb-1">⭐ Champions</span>
          <strong class="text-2xl font-bold text-blue-500">{{ stats.champion }}</strong>
          <p class="text-xs text-[var(--tf-muted)] mt-1">Clients fidèles, gros acheteurs</p>
        </div>
        <div class="bg-green-500/10 p-6 rounded-2xl border border-green-500/20 shadow-sm">
          <span class="text-sm text-green-500 block mb-1">💙 Fidèles</span>
          <strong class="text-2xl font-bold text-green-500">{{ stats.fidele }}</strong>
          <p class="text-xs text-[var(--tf-muted)] mt-1">Achètent régulièrement</p>
        </div>
        <div class="bg-yellow-500/10 p-6 rounded-2xl border border-yellow-500/20 shadow-sm">
          <span class="text-sm text-yellow-500 block mb-1">⚠️ À Risque</span>
          <strong class="text-2xl font-bold text-yellow-500">{{ stats.aRisque }}</strong>
          <p class="text-xs text-[var(--tf-muted)] mt-1">Inactifs depuis longtemps</p>
        </div>
        <div class="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 shadow-sm">
          <span class="text-sm text-red-500 block mb-1">❌ Perdus</span>
          <strong class="text-2xl font-bold text-red-500">{{ stats.perdus }}</strong>
          <p class="text-xs text-[var(--tf-muted)] mt-1">Plus d'activité</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8" *ngIf="!loading && clients.length > 0">
        <!-- Graphique -->
        <div class="lg:col-span-1 bg-[var(--tf-surface-2)] p-6 rounded-2xl border border-[var(--tf-border)] shadow-sm flex flex-col items-center justify-center">
          <h3 class="text-lg font-semibold mb-6 self-start">Répartition des segments</h3>
          <div class="w-full max-w-[250px]">
            <canvas id="segmentChart"></canvas>
          </div>
        </div>

        <!-- Tableau -->
        <div class="lg:col-span-2 bg-[var(--tf-surface-2)] rounded-2xl border border-[var(--tf-border)] overflow-hidden">
          <div class="p-4 border-b border-[var(--tf-border)] flex justify-between items-center">
            <h3 class="text-lg font-semibold">Liste des clients par segment</h3>
            <select [(ngModel)]="filterSegment" (change)="applyFilter()"
                    class="bg-[var(--tf-surface-3)] text-[var(--tf-text)] border border-[var(--tf-border)] rounded-lg px-3 py-1 text-sm outline-none">
              <option value="">Tous les segments</option>
              <option value="champion">⭐ Champions</option>
              <option value="fidele">💙 Fidèles</option>
              <option value="aRisque">⚠️ À Risque</option>
              <option value="perdu">❌ Perdus</option>
            </select>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-[var(--tf-surface-3)] text-[var(--tf-muted)] text-xs uppercase tracking-wider">
                  <th class="px-6 py-4 font-semibold">Client</th>
                  <th class="px-6 py-4 font-semibold text-center">Nb Factures</th>
                  <th class="px-6 py-4 font-semibold">Total Dépensé</th>
                  <th class="px-6 py-4 font-semibold">Segment</th>
                  <th class="px-6 py-4 font-semibold">Action suggérée</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--tf-border)]">
                <tr *ngFor="let client of filteredClients" class="hover:bg-[var(--tf-surface-3)] transition-colors">
                  <td class="px-6 py-4 font-medium">{{ client.name }}</td>
                  <td class="px-6 py-4 text-center">{{ client.frequency }}</td>
                  <td class="px-6 py-4 font-semibold">{{ client.monetary | number:'1.2-2' }} <span class="text-xs opacity-50">TND</span></td>
                  <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                          [ngClass]="{
                            'bg-blue-500/20 text-blue-500': client.segmentId === 'champion',
                            'bg-green-500/20 text-green-500': client.segmentId === 'fidele',
                            'bg-yellow-500/20 text-yellow-500': client.segmentId === 'aRisque',
                            'bg-red-500/20 text-red-500': client.segmentId === 'perdu'
                          }">
                      {{ client.segmentEmoji }} {{ client.segmentLabel }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-[var(--tf-muted)] italic">{{ client.action }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div *ngIf="loading" class="mt-8 flex justify-center items-center gap-3 text-primary-500 font-medium">
        <i class="fa-solid fa-spinner animate-spin text-2xl"></i>
        <span>🤖 Analyse des comportements clients...</span>
      </div>

      <div *ngIf="!loading && clients.length === 0" class="mt-12 text-center py-12 text-[var(--tf-muted)]">
        <i class="fa-solid fa-users text-3xl mb-4 block opacity-30"></i>
        <p class="font-medium">Aucun client trouvé pour ce business.</p>
      </div>
    </div>
  `,
  styles: [`
    .ml-page { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class SegmentationComponent implements OnInit {
  private ml = inject(MlService);
  private businessSelection = inject(BusinessSelectionService);
  private settings = inject(SettingsService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  businesses = signal<Array<{ id: string; name: string; tenantId: string }>>([]);
  selectedBusinessId = '';

  clients: any[] = [];
  filteredClients: any[] = [];
  loading = true;
  filterSegment = '';
  chart: any;

  stats = {
    champion: 0,
    fidele: 0,
    aRisque: 0,
    perdus: 0
  };

  private isAdmin(): boolean {
    const roles = this.auth.roles() as string[];
    return roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_ADMIN');
  }

  ngOnInit() {
    const tenantId =
      localStorage.getItem('activeTenantId') ||
      localStorage.getItem('tenantId') ||
      '';

    if (this.isAdmin() && tenantId) {
      this.settings.getBusinessesForTenant(tenantId).subscribe({
        next: (bs: any[]) => {
          const list = (bs || []).map((b: any) => ({
            id: b.id,
            name: b.name,
            tenantId: b.tenantId || b.companyId || tenantId,
          }));
          this.businesses.set(list);
          if (list.length > 0) {
            const existing = this.businessSelection.selectedBusinessId();
            const valid = list.find((b) => b.id === existing);
            const chosen = valid || list[0];
            this.selectBusiness(chosen.id, chosen.tenantId);
          } else {
            this.loading = false;
            this.cdr.detectChanges();
          }
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); },
      });
    } else {
      this.settings.getBusinesses().subscribe({
        next: (bs: any[]) => {
          const list = (bs || []).map((b: any) => ({
            id: b.id,
            name: b.name,
            tenantId: b.tenantId || b.companyId || tenantId,
          }));
          this.businesses.set(list);
          if (list.length > 0) {
            const existing = this.businessSelection.selectedBusinessId();
            const valid = list.find((b) => b.id === existing);
            const chosen = valid || list[0];
            this.selectBusiness(chosen.id, chosen.tenantId);
          } else {
            this.loading = false;
            this.cdr.detectChanges();
          }
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); },
      });
    }
  }

  onBusinessChange(id: string) {
    const b = this.businesses().find((x) => x.id === id);
    if (b) this.selectBusiness(b.id, b.tenantId);
  }

  private selectBusiness(businessId: string, tenantId: string) {
    this.selectedBusinessId = businessId;
    this.businessSelection.setSelectedBusiness(businessId, tenantId);
    this.loadData();
  }

  loadData() {
    if (!this.selectedBusinessId) return;
    this.loading = true;
    this.cdr.detectChanges();

    this.ml.getClientsSegmentation().subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          const clientList = res.clients || res;
          const segmentStats = res.segments || null;

          // Map label → segmentId for the frontend
          const labelToSegId: Record<string, string> = {
            'Champion': 'champion',
            'Fidèle': 'fidele',
            'À Risque': 'aRisque',
            'Perdu': 'perdu',
          };
          const segIdToEmoji: Record<string, string> = {
            'champion': '⭐',
            'fidele': '💙',
            'aRisque': '⚠️',
            'perdu': '❌',
          };
          const segIdToLabel: Record<string, string> = {
            'champion': 'Champion',
            'fidele': 'Fidèle',
            'aRisque': 'À Risque',
            'perdu': 'Perdu',
          };
          const segIdToAction: Record<string, string> = {
            'champion': 'Offrir avantages premium.',
            'fidele': 'Maintenir la relation.',
            'aRisque': 'Relance commerciale urgente.',
            'perdu': 'Campagne de réactivation.',
          };

          this.clients = (Array.isArray(clientList) ? clientList : []).map((c: any) => {
            // Backend may send segmentId, segment_id, segment, or just label
            let segId = c.segmentId || c.segment_id || '';
            if (!segId && c.label) {
              segId = labelToSegId[c.label] || 'fidele';
            }
            if (!segId) segId = 'fidele';

            return {
              ...c,
              segmentId: segId,
              segmentLabel: c.segment_label || c.label || segIdToLabel[segId] || 'Fidèle',
              segmentEmoji: c.emoji || segIdToEmoji[segId] || '💙',
              action: c.action || segIdToAction[segId] || 'Maintenir la relation.',
              frequency: c.frequency || 0,
              monetary: c.monetary || 0,
            };
          });

          if (segmentStats) {
            this.stats = {
              champion: segmentStats.champion || 0,
              fidele: segmentStats.fidele || 0,
              aRisque: segmentStats.aRisque || 0,
              perdus: segmentStats.perdus || 0
            };
          } else {
            this.updateStats();
          }

          this.applyFilter();
          this.loading = false;
          this.cdr.detectChanges();

          // Render chart after DOM updates
          setTimeout(() => this.initChart(), 100);
        });
      },
      error: () => {
        this.zone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  updateStats() {
    this.stats = {
      champion: this.clients.filter(c => c.segmentId === 'champion').length,
      fidele: this.clients.filter(c => c.segmentId === 'fidele').length,
      aRisque: this.clients.filter(c => c.segmentId === 'aRisque').length,
      perdus: this.clients.filter(c => c.segmentId === 'perdu').length
    };
  }

  applyFilter() {
    if (!this.filterSegment) {
      this.filteredClients = [...this.clients];
    } else {
      this.filteredClients = this.clients.filter(c => c.segmentId === this.filterSegment);
    }
  }

  initChart() {
    if (this.chart) this.chart.destroy();

    const ctx = document.getElementById('segmentChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Champions', 'Fidèles', 'À Risque', 'Perdus'],
        datasets: [{
          data: [this.stats.champion, this.stats.fidele, this.stats.aRisque, this.stats.perdus],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)', // blue
            'rgba(34, 197, 94, 0.8)',  // green
            'rgba(234, 179, 8, 0.8)',   // yellow
            'rgba(239, 68, 68, 0.8)'    // red
          ],
          borderColor: 'transparent',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        cutout: '70%'
      }
    });
  }
}

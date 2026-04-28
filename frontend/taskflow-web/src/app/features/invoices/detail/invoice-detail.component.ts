import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InvoicesService } from '../../../core/services/invoices.service';
import { TfCardComponent } from '../../../shared/ui/card/tf-card.component';
import { ThemeService } from '../../../core/services/theme.service';
import { InvoicePdfService } from '../../../core/services/invoice-pdf.service';
import { BusinessSelectionService } from '../../../core/services/business-selection.service';

@Component({
  selector: 'tf-invoice-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TfCardComponent],
  template: `
    <div class="space-y-6 pb-12">
      <!-- Top Bar -->
      <div class="flex items-center justify-between">
        <button routerLink="/invoices" class="flex items-center gap-2 text-sm font-bold muted hover:text-primary-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Retour aux factures
        </button>
        
        <div class="flex items-center gap-3">
          <button *ngIf="invoice()?.status !== 'SENT' && invoice()?.status !== 'PAID'" 
                  (click)="sendEmail()" 
                  [disabled]="sendingEmail()"
                  class="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg *ngIf="!sendingEmail()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <div *ngIf="sendingEmail()" class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            {{ sendingEmail() ? 'Envoi...' : 'Envoyer au client' }}
          </button>

          <button (click)="downloadPDF()" 
                  class="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-500 transition-all shadow-lg shadow-primary-500/20">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Télécharger PDF
          </button>
        </div>
      </div>

      <div *ngIf="invoice()" class="grid grid-cols-12 gap-6">
        <!-- Main Info Card -->
        <tf-card class="col-span-12 lg:col-span-8">
          <div class="p-4 space-y-8">
            <div class="flex justify-between items-start">
              <div>
                <h1 class="text-3xl font-black tracking-tight" style="color: var(--tf-on-surface);">{{ invoice().invoiceNumber }}</h1>
                <p class="muted mt-1 font-medium">Émise le {{ invoice().issueDate | date:'dd MMMM yyyy' }}</p>
              </div>
              <div [class]="getStatusClass(invoice().status)" class="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border">
                {{ invoice().status }}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-8 py-8 border-y" [style.border-color]="theme.isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'">
              <div>
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500 mb-3">De la part de</h4>
                <div class="font-bold text-lg" style="color: var(--tf-on-surface);">Votre Entreprise</div>
                <div class="text-sm muted mt-1 italic">Détails de l'entreprise...</div>
              </div>
              <div>
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500 mb-3">Facturé à</h4>
                <div class="font-bold text-lg" style="color: var(--tf-on-surface);">{{ invoice().clientName || 'Client' }}</div>
                <div class="text-sm muted mt-1 italic">ID Client: {{ invoice().clientId }}</div>
              </div>
            </div>

            <!-- Items Table -->
            <div>
              <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500 mb-4">Détails des articles</h4>
              <div class="overflow-hidden rounded-2xl border" [style.border-color]="theme.isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'">
                <table class="w-full text-sm">
                  <thead [style.background]="theme.isDark() ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'">
                    <tr>
                      <th class="text-left p-4 font-bold muted uppercase text-[10px] tracking-widest">Description</th>
                      <th class="text-center p-4 font-bold muted uppercase text-[10px] tracking-widest">Qté</th>
                      <th class="text-right p-4 font-bold muted uppercase text-[10px] tracking-widest">Prix Unit.</th>
                      <th class="text-right p-4 font-bold muted uppercase text-[10px] tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y" [style.border-color]="theme.isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'">
                    <tr *ngFor="let item of invoice().items" class="hover:bg-[var(--tf-surface-2)] transition-colors">
                      <td class="p-4 font-medium" style="color: var(--tf-on-surface);">{{ item.description }}</td>
                      <td class="p-4 text-center font-mono">{{ item.quantity }}</td>
                      <td class="p-4 text-right font-mono">{{ item.unitPrice | number:'1.2-2' }} TND</td>
                      <td class="p-4 text-right font-black font-mono" style="color: var(--tf-on-surface);">{{ item.amount | number:'1.2-2' }} TND</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div *ngIf="invoice().notes" class="p-6 rounded-2xl bg-[var(--tf-surface-2)]">
              <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500 mb-2">Notes</h4>
              <p class="text-sm italic muted">{{ invoice().notes }}</p>
            </div>
          </div>
        </tf-card>

        <!-- Summary Card -->
        <div class="col-span-12 lg:col-span-4 space-y-6">
          <tf-card>
            <div class="p-2 space-y-6">
              <h3 class="text-lg font-black tracking-tight" style="color: var(--tf-on-surface);">Résumé Financier</h3>
              
              <div class="space-y-4">
                <div class="flex justify-between items-center text-sm font-medium">
                  <span class="muted uppercase tracking-widest text-[10px]">Sous-total</span>
                  <span class="font-bold font-mono">{{ (invoice().totalAmount - invoice().taxAmount) | number:'1.2-2' }} TND</span>
                </div>
                <div class="flex justify-between items-center text-sm font-medium">
                  <span class="muted uppercase tracking-widest text-[10px]">TVA / Taxe</span>
                  <span class="font-bold font-mono">+{{ invoice().taxAmount | number:'1.2-2' }} TND</span>
                </div>
                
                <div class="pt-4 border-t" [style.border-color]="theme.isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-black uppercase tracking-widest text-primary-500">Total Net</span>
                    <span class="text-3xl font-black font-mono tracking-tighter" style="color: var(--tf-on-surface);">{{ invoice().totalAmount | number:'1.2-2' }}</span>
                  </div>
                  <div class="text-right text-[10px] font-black text-primary-500 mt-1 uppercase tracking-[0.2em]">TND Currency</div>
                </div>
              </div>
            </div>
          </tf-card>

          <tf-card>
            <div class="p-2 space-y-4">
              <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500">Dates importantes</h4>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-xs muted font-medium">Émise le</span>
                  <span class="text-xs font-bold">{{ invoice().issueDate | date:'dd MMM yyyy' }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs muted font-medium">Échéance</span>
                  <span class="text-xs font-bold text-rose-500">{{ invoice().dueDate | date:'dd MMM yyyy' }}</span>
                </div>
              </div>
            </div>
          </tf-card>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="flex flex-col items-center justify-center py-24 space-y-4">
        <div class="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
        <p class="text-sm font-bold muted animate-pulse uppercase tracking-widest">Chargement de la facture...</p>
      </div>
    </div>
  `
})
export class InvoiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invoicesApi = inject(InvoicesService);
  private pdfService = inject(InvoicePdfService);
  protected theme = inject(ThemeService);
  private businessSelection = inject(BusinessSelectionService);

  invoice = signal<any>(null);
  loading = signal(true);
  sendingEmail = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/invoices']);
      return;
    }
    this.loadInvoice(id);
  }

  loadInvoice(id: string) {
    this.loading.set(true);
    const tenantId = this.businessSelection.selectedTenantId();
    this.invoicesApi.getById(id, tenantId || undefined).subscribe({
      next: (data) => {
        this.invoice.set(data);
        this.loading.set(false);
      },
      error: () => {
        alert('Impossible de charger la facture.');
        this.router.navigate(['/invoices']);
      }
    });
  }

  sendEmail() {
    const inv = this.invoice();
    if (!inv) return;
    
    this.sendingEmail.set(true);
    const tenantId = this.businessSelection.selectedTenantId();
    this.invoicesApi.sendByEmail(inv.id, tenantId || undefined).subscribe({
      next: () => {
        this.sendingEmail.set(false);
        alert('Facture envoyée avec succès au client !');
        this.loadInvoice(inv.id); // Reload to update status badge
      },
      error: (err) => {
        this.sendingEmail.set(false);
        alert(err.error?.message || 'Erreur lors de l\'envoi de l\'email.');
      }
    });
  }

  getStatusClass(status: string) {
    const s = (status || '').toUpperCase();
    if (s === 'DRAFT') return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    if (s === 'SENT') return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (s === 'PAID') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (s === 'OVERDUE') return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    if (s === 'CANCELLED' || s === 'CANCELED') return 'bg-gray-700/10 text-gray-700 border-gray-700/20';
    return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  }

  downloadPDF() {
    const inv = this.invoice();
    if (!inv) return;
    
    this.pdfService.downloadInvoicePdf(inv.id)
      .subscribe({
        next: (res) => {
          const blob = res.body;
          if (!blob) throw new Error('PDF vide reçu');

          const cd = res.headers.get('Content-Disposition') || res.headers.get('content-disposition') || '';
          const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
          const filename = match?.[1] ? decodeURIComponent(match[1]) : `facture-${inv.id}.pdf`;

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('Erreur PDF:', err);
          alert(err.message);
        }
      });
  }
}

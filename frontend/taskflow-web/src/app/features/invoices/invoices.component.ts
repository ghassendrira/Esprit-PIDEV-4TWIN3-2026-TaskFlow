import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { SettingsService } from '../../core/services/settings.service';
import { ClientsService, ClientDto } from '../../core/services/clients.service';
import { InvoicesService } from '../../core/services/invoices.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { InvoicePdfService } from '../../core/services/invoice-pdf.service';
import { BusinessSelectionService } from '../../core/services/business-selection.service';

@Component({
  selector: 'tf-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, TfCardComponent],
  template: `
    <tf-card>
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl md:text-2xl font-bold" style="margin: 0;">Factures</h2>
          <p class="muted text-sm" style="margin: 6px 0 0;">Gérez vos factures par business.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <ng-container *ngIf="isAdmin()">
            <div class="flex flex-col md:flex-row md:items-center gap-1.5 flex-1 md:flex-none">
              <label class="text-xs md:text-sm muted">Company</label>
              <select
                class="border rounded-lg px-3 py-2 text-sm w-full md:w-40"
                style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
                [ngModel]="activeTenantId()"
                (ngModelChange)="onTenantChange($event)"
              >
                <option *ngFor="let t of tenants()" [value]="t.id">{{ t.name }}</option>
              </select>
            </div>
          </ng-container>

          <div class="flex flex-col md:flex-row md:items-center gap-1.5 flex-1 md:flex-none">
            <label class="text-xs md:text-sm muted">Business</label>
            <select
              class="border rounded-lg px-3 py-2 text-sm w-full md:w-40"
              style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
              [ngModel]="activeBusinessId()"
              (ngModelChange)="onBusinessChange($event)"
            >
              <option *ngFor="let b of businesses()" [value]="b.id">{{ b.name }}</option>
            </select>
          </div>
        </div>
      </div>
    </tf-card>

    <tf-card class="mt-4" *ngIf="activeBusinessId()">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
            <i class="fa-solid fa-file-invoice text-lg"></i>
          </div>
          <div>
            <h3 class="text-lg font-bold tracking-tight">{{ editingId() ? 'Modifier la Facture' : 'Nouvelle Facture' }}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Remplissez les informations ci-dessous.</p>
          </div>
        </div>
        <button (click)="reload()" class="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          <i class="fa-solid fa-rotate"></i>
          Actualiser
        </button>
      </div>

      <form
        *ngIf="canWrite()"
        (ngSubmit)="saveInvoice()"
        class="space-y-6"
      >
        <!-- Form Header Section -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngIf="isAdmin()" class="sm:col-span-2 lg:col-span-1">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Pour (employé)</label>
            <select
              class="w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10"
              [(ngModel)]="selectedEmployeeId"
              name="selectedEmployeeId"
            >
              <option value="">Moi</option>
              <option *ngFor="let u of employees()" [value]="u.id">{{ u.firstName }} {{ u.lastName }}</option>
            </select>
          </div>

          <div>
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Client</label>
            <select
              class="w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10"
              [(ngModel)]="form.clientId"
              name="clientId"
              #clientId="ngModel"
              required
              [class.border-red-500]="(clientId.touched || submitted) && clientId.invalid"
            >
              <option value="" disabled>Sélectionner un client</option>
              <option *ngFor="let c of clients()" [value]="c.id">{{ c.name }}</option>
            </select>
            <div *ngIf="(clientId.touched || submitted) && clientId.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le client est obligatoire.</div>
          </div>

          <div>
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Statut</label>
            <select
              class="w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10"
              [(ngModel)]="form.status"
              name="status"
              #status="ngModel"
              required
              [class.border-red-500]="(status.touched || submitted) && status.invalid"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="PAID">PAID</option>
              <option value="OVERDUE">OVERDUE</option>
              <option value="CANCELED">CANCELED</option>
            </select>
            <div *ngIf="(status.touched || submitted) && status.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le statut est obligatoire.</div>
          </div>

          <div>
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Date émission</label>
            <input
              type="date"
              class="w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10"
              [(ngModel)]="form.issueDate"
              name="issueDate"
              #issueDate="ngModel"
              required
              [class.border-red-500]="(issueDate.touched || submitted) && issueDate.invalid"
            />
            <div *ngIf="(issueDate.touched || submitted) && issueDate.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">La date d'émission est obligatoire.</div>
          </div>

          <div>
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Date échéance</label>
            <input
              type="date"
              class="w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10"
              [(ngModel)]="form.dueDate"
              name="dueDate"
              [min]="form.issueDate"
            />
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Notes</label>
            <input
              class="w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10"
              [(ngModel)]="form.notes"
              name="notes"
              placeholder="Notes additionnelles..."
              maxlength="500"
            />
          </div>
        </div>

        <!-- Dynamic Items Section -->
        <div class="mt-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <div>
              <h4 class="text-xs font-black uppercase tracking-widest text-primary-500">Détails de la facturation</h4>
              <p class="text-[10px] text-slate-500 mt-0.5">Ajoutez les produits ou services rendus</p>
            </div>
            <button type="button" (click)="addItemLine()" 
                    class="w-full sm:w-auto flex items-center justify-center gap-2 text-xs bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-primary-500/20">
              <i class="fa-solid fa-plus"></i>
              Ajouter une ligne
            </button>
          </div>
          
          <div class="space-y-4">
            <div *ngFor="let item of form.items; let i = index" 
                 class="flex flex-col lg:grid lg:grid-cols-12 gap-4 items-start lg:items-center p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              
              <div class="w-full lg:col-span-6">
                <label class="text-[9px] uppercase font-black text-slate-400 mb-1.5 block">Description</label>
                <input [(ngModel)]="item.description" name="desc-{{i}}" 
                       #desc="ngModel"
                       required
                       class="w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10" 
                       [class.border-red-500]="(desc.touched || submitted) && desc.invalid"
                       placeholder="Ex: Développement Web..."/>
                <div *ngIf="(desc.touched || submitted) && desc.errors?.['required']" class="text-red-500 text-[10px] mt-1 ml-1">La description est obligatoire.</div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 lg:contents gap-4 w-full">
                <div class="lg:col-span-2">
                  <label class="text-[9px] uppercase font-black text-slate-400 mb-1.5 block">Qté</label>
                  <input type="number" [(ngModel)]="item.quantity" name="qty-{{i}}" (ngModelChange)="calculateRow(item)" 
                         class="w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold outline-none" 
                         min="1"/>
                </div>

                <div class="lg:col-span-2">
                  <label class="text-[9px] uppercase font-black text-slate-400 mb-1.5 block">Prix (TND)</label>
                  <input type="number" [(ngModel)]="item.unitPrice" name="price-{{i}}" (ngModelChange)="calculateRow(item)" 
                         class="w-full border rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold outline-none" 
                         min="0"/>
                </div>

                <div class="col-span-2 sm:col-span-1 lg:col-span-2 flex flex-col justify-end">
                  <label class="text-[9px] uppercase font-black text-slate-400 mb-1.5 block lg:hidden">Montant</label>
                  <div class="text-sm font-black text-right lg:text-center py-2.5 px-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {{ item.amount | number:'1.2-2' }} <span class="text-[10px] opacity-50">TND</span>
                  </div>
                </div>
              </div>

              <div class="w-full lg:col-span-1 flex justify-end">
                <button type="button" (click)="removeItemLine(i)" 
                        class="w-10 h-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="form.items.length === 0" class="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 text-sm">
            Aucune ligne ajoutée. Cliquez sur "+ Ajouter une ligne" pour commencer.
          </div>
        </div>

        <!-- Totals Section -->
        <div class="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
          <div class="w-full sm:w-80 space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div class="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
              <span>Sous-total</span>
              <span class="text-sm font-black text-slate-900 dark:text-white">{{ subtotal() | number:'1.2-2' }} TND</span>
            </div>
            <div class="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
              <span>TVA (%)</span>
              <input type="number" [(ngModel)]="form.taxRate" name="taxRate" (ngModelChange)="updateTotals()" 
                     class="w-16 h-8 px-2 text-center text-xs font-black rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"/>
            </div>
            <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end">
              <span class="text-xs font-black uppercase tracking-widest text-primary-600">Total Net</span>
              <span class="text-2xl font-black text-primary-600">{{ total() | number:'1.2-2' }} <span class="text-xs">TND</span></span>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row justify-end gap-3 mt-8">
          <button
            *ngIf="editingId()"
            type="button"
            (click)="cancelEdit()"
            class="px-6 py-3 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Annuler
          </button>
          <button type="submit" 
                  class="bg-primary-600 hover:bg-primary-700 text-white px-10 py-3 rounded-xl text-sm font-black transition-all shadow-lg shadow-primary-500/20 active:scale-95">
            {{ editingId() ? 'Mettre à jour la facture' : 'Créer la facture' }}
          </button>
        </div>
      </form>
      <div *ngIf="errorMessage" class="mt-3 text-sm text-red-500">{{ errorMessage }}</div>
    </tf-card>

    <tf-card class="mt-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 class="font-bold text-lg">Liste des factures</h3>
          <p class="text-xs text-slate-500 mt-1">Historique de toutes vos transactions.</p>
        </div>
        
        <div class="flex items-center gap-2">
          <button (click)="resetFilters()" *ngIf="activeFilterCount() > 0" class="text-xs font-bold text-rose-500 hover:underline">Effacer les filtres</button>
          <button (click)="reload()" class="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            <i class="fa-solid fa-rotate"></i>
          </button>
        </div>
      </div>

      <!-- Quick Filters -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input type="text" [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)"
                 placeholder="Rechercher..."
                 class="w-full h-10 pl-9 pr-4 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"/>
        </div>

        <select [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)"
                class="h-10 px-4 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10">
          <option value="">Tous les statuts</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SENT">SENT</option>
          <option value="PAID">PAID</option>
          <option value="OVERDUE">OVERDUE</option>
          <option value="CANCELED">CANCELED</option>
        </select>

        <div class="grid grid-cols-2 gap-2 sm:col-span-2">
          <input type="date" [ngModel]="filterDateFrom()" (ngModelChange)="filterDateFrom.set($event)"
                 class="h-10 px-3 text-[10px] font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"/>
          <input type="date" [ngModel]="filterDateTo()" (ngModelChange)="filterDateTo.set($event)"
                 class="h-10 px-3 text-[10px] font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"/>
        </div>
      </div>

      <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table class="w-full text-sm min-w-[800px]">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th class="text-left font-bold uppercase text-[10px] tracking-widest px-4 py-4">Facture</th>
              <th class="text-left font-bold uppercase text-[10px] tracking-widest px-4 py-4">Client</th>
              <th class="text-left font-bold uppercase text-[10px] tracking-widest px-4 py-4">Statut</th>
              <th class="text-left font-bold uppercase text-[10px] tracking-widest px-4 py-4">Date</th>
              <th class="text-right font-bold uppercase text-[10px] tracking-widest px-4 py-4">Total</th>
              <th class="text-center font-bold uppercase text-[10px] tracking-widest px-4 py-4">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr *ngFor="let inv of filteredInvoices();" 
                class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group cursor-pointer"
                (click)="goToDetail(inv.id)">
              <td class="px-4 py-4 font-mono font-bold text-primary-600">{{ inv.invoiceNumber }}</td>
              <td class="px-4 py-4 font-medium">{{ inv.client?.name || '---' }}</td>
              <td class="px-4 py-4">
                <span [class]="getStatusClass(inv.status)" class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                  {{ inv.status }}
                </span>
              </td>
              <td class="px-4 py-4 text-xs text-slate-500">{{ inv.issueDate | date:'dd MMM yyyy' }}</td>
              <td class="px-4 py-4 text-right font-black">{{ inv.totalAmount | number:'1.2-2' }} <span class="text-[10px] opacity-50">TND</span></td>
              <td class="px-4 py-4" (click)="$event.stopPropagation()">
                <div class="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <button (click)="downloadPDF(inv)" class="w-8 h-8 rounded-lg flex items-center justify-center text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-slate-200 dark:border-slate-700 transition-all" title="PDF">
                    <i class="fa-solid fa-file-pdf"></i>
                  </button>
                  <button *ngIf="canWrite()" (click)="edit(inv)" class="w-8 h-8 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-slate-200 dark:border-slate-700 transition-all" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button *ngIf="canWrite()" (click)="remove(inv)" class="w-8 h-8 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-slate-200 dark:border-slate-700 transition-all" title="Delete">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="filteredInvoices().length === 0">
              <td colspan="6" class="py-12 text-center text-slate-400 italic">Aucune facture trouvée.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State for Filters -->
      <div *ngIf="activeBusinessId() && filteredInvoices().length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-16 h-16 rounded-3xl bg-slate-500/5 flex items-center justify-center text-slate-400 mb-4 border border-slate-500/10">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-black tracking-tight" style="color: var(--tf-on-surface);">Aucune facture trouvée</h3>
        <p class="text-sm muted mt-1 max-w-[280px]">Essayez de modifier vos filtres ou effectuez une nouvelle recherche.</p>
        <button (click)="resetFilters()" class="mt-6 text-xs font-black text-primary-600 hover:text-primary-700 uppercase tracking-widest border-b border-primary-600/20 pb-0.5">
          Effacer tous les filtres
        </button>
      </div>
    </tf-card>
  `
})
export class InvoicesComponent implements OnInit {
  private settings = inject(SettingsService);
  private clientsApi = inject(ClientsService);
  private invoicesApi = inject(InvoicesService);
  private pdfService = inject(InvoicePdfService);
  private auth = inject(AuthService);
  protected theme = inject(ThemeService);
  private businessSelection = inject(BusinessSelectionService);
  private router = inject(Router);

  businesses = signal<Array<{ id: string; name: string; tenantId: string }>>([]);
  submitted = false;
  tenants = signal<Array<{ id: string; name: string }>>([]);
  activeTenantId = signal<string>(localStorage.getItem('activeTenantId') || '');
  employees = signal<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  selectedEmployeeId: string = '';
  activeBusinessId = computed(() => this.businessSelection.selectedBusinessId());
  clients = signal<ClientDto[]>([]);

  invoices = signal<any[]>([]);
  editingId = signal<string>('');
  errorMessage: string | null = null;

  // Filters
  searchTerm = signal('');
  filterStatus = signal('');
  filterClientId = signal('');
  filterDateFrom = signal('');
  filterDateTo = signal('');

  filteredInvoices = computed(() => {
    let list = this.invoices();
    const search = this.searchTerm().toLowerCase().trim();
    const status = this.filterStatus();
    const clientId = this.filterClientId();
    const from = this.filterDateFrom();
    const to = this.filterDateTo();

    if (search) {
      list = list.filter(inv => inv.invoiceNumber.toLowerCase().includes(search));
    }
    if (status) {
      list = list.filter(inv => inv.status === status);
    }
    if (clientId) {
      list = list.filter(inv => inv.clientId === clientId);
    }
    if (from) {
      list = list.filter(inv => new Date(inv.issueDate) >= new Date(from));
    }
    if (to) {
      list = list.filter(inv => new Date(inv.issueDate) <= new Date(to));
    }
    return list;
  });

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchTerm()) count++;
    if (this.filterStatus()) count++;
    if (this.filterClientId()) count++;
    if (this.filterDateFrom()) count++;
    if (this.filterDateTo()) count++;
    return count;
  });

  resetFilters() {
    this.searchTerm.set('');
    this.filterStatus.set('');
    this.filterClientId.set('');
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
  }

  isBusinessOwner = computed(() => {
    const roles = this.auth.roles() as any[];
    return roles.includes('BUSINESS_OWNER') || roles.includes('OWNER');
  });
  canWrite = computed(() => !this.isBusinessOwner());

  isAdmin = computed(() => {
    const roles = this.auth.roles() as any[];
    return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
  });

  form: any = {
    clientId: '',
    status: 'DRAFT',
    issueDate: '',
    dueDate: '',
    totalAmount: 0,
    taxRate: 19,
    taxAmount: 0,
    notes: '',
    items: [],
  };

  subtotal = signal(0);
  taxAmount = signal(0);
  total = signal(0);

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.settings.getAllTenants().subscribe({
        next: (ts: any[]) => {
          const simplified = (ts || []).map((t) => ({ id: t.id, name: t.name || t.companyName || t.title || t.id }));
          this.tenants.set(simplified);
          if (simplified.length && !this.activeTenantId()) {
            this.onTenantChange(simplified[0].id);
          }
        },
        error: () => this.tenants.set([]),
      });
      return;
    }

    this.settings.getBusinesses().subscribe({
      next: (bs: any[]) => {
        const simplified = (bs || []).map((b) => ({ id: b.id, name: b.name, tenantId: b.tenantId }));
        this.businesses.set(simplified);
        if (simplified.length) {
          const currentId = this.businessSelection.selectedBusinessId();
          const found = simplified.find(b => b.id === currentId);
          if (!currentId || !found) {
            this.onBusinessChange(simplified[0].id);
          } else {
            // Re-sync tenantId just in case
            this.businessSelection.setSelectedBusiness(found.id, found.tenantId);
            this.reloadClients();
            this.reload();
          }
        }
      },
      error: () => this.businesses.set([]),
    });
  }

  onTenantChange(tenantId: string) {
    this.activeTenantId.set(tenantId);
    if (tenantId) {
      localStorage.setItem('activeTenantId', tenantId);
    }
    this.editingId.set('');
    this.selectedEmployeeId = '';
    this.employees.set([]);
    this.businesses.set([]);
    this.clients.set([]);
    this.businessSelection.clearSelection();

    if (!tenantId) return;

    this.settings.getBusinessesForTenant(tenantId).subscribe({
      next: (bs: any[]) => {
        const simplified = (bs || []).map((b) => ({ id: b.id, name: b.name, tenantId: b.tenantId || tenantId }));
        this.businesses.set(simplified);
        if (simplified.length) this.onBusinessChange(simplified[0].id);
      },
      error: () => this.businesses.set([]),
    });

    this.auth.getEmployeesForTenant(tenantId).subscribe({
      next: (list: any[]) => this.employees.set(list || []),
      error: () => this.employees.set([]),
    });
  }

  private resolveTenantId(): string {
    return this.activeTenantId() || localStorage.getItem('activeTenantId') || '';
  }

  onBusinessChange(id: string) {
    const business = this.businesses().find(b => b.id === id);
    if (business) {
      this.businessSelection.setSelectedBusiness(business.id, business.tenantId);
    }
    this.editingId.set('');
    this.form = { clientId: '', status: 'DRAFT', issueDate: '', dueDate: '', totalAmount: 0, taxAmount: 0, notes: '', items: [] };
    this.subtotal.set(0);
    this.total.set(0);
    this.reloadClients();
    this.reload();
  }

  addItemLine() {
    if (!this.form.items) this.form.items = [];
    this.form.items.push({
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0
    });
    this.updateTotals();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  removeItemLine(index: number) {
    this.form.items.splice(index, 1);
    this.updateTotals();
  }

  calculateRow(item: any) {
    item.amount = (item.quantity || 0) * (item.unitPrice || 0);
    this.updateTotals();
  }

  updateTotals() {
    const sub = (this.form.items || []).reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
    this.subtotal.set(sub);
    
    // Calculate tax based on percentage if taxRate is provided
    const rate = Number(this.form.taxRate || 0);
    const tax = (sub * rate) / 100;
    this.taxAmount.set(tax);
    this.form.taxAmount = tax;
    
    this.total.set(sub + tax);
  }

  reloadClients() {
    const businessId = this.activeBusinessId();
    if (!businessId) return;
    const tenantId = this.resolveTenantId();
    if (this.isAdmin() && !tenantId) return;
    this.clientsApi.listByBusiness(businessId, tenantId || undefined).subscribe({
      next: (data) => {
        this.clients.set(data || []);
        if (!this.form.clientId && data?.length) this.form.clientId = data[0].id;
      },
      error: () => this.clients.set([]),
    });
  }

  reload() {
    const businessId = this.activeBusinessId();
    if (!businessId) return;
    const tenantId = this.resolveTenantId();
    if (this.isAdmin() && !tenantId) return;
    this.invoicesApi.listByBusiness(businessId, tenantId || undefined).subscribe({
      next: (data) => this.invoices.set(data || []),
      error: () => this.invoices.set([]),
    });
  }

  saveInvoice() {
    this.submitted = true;
    const businessId = this.activeBusinessId();
    if (!businessId) return;

    const clientId = String(this.form.clientId || '').trim();
    const issueDate = String(this.form.issueDate || '').trim();
    const dueDate = String(this.form.dueDate || '').trim();
    const subtotalValue = this.subtotal();
    const taxAmount = Number(this.form.taxAmount ?? 0);
    const totalAmount = this.total();
    const notes = String(this.form.notes || '').trim();

    if (!clientId) {
      this.errorMessage = 'Le client est obligatoire.';
      return;
    }

    if (!issueDate) {
      this.errorMessage = 'La date d\'émission est obligatoire.';
      return;
    }

    if (dueDate && new Date(dueDate).getTime() < new Date(issueDate).getTime()) {
      this.errorMessage = 'La date d\'échéance doit être postérieure à la date d\'émission.';
      return;
    }

    if (!this.form.items || this.form.items.length === 0) {
      this.errorMessage = 'Veuillez ajouter au moins une ligne à la facture.';
      return;
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      this.errorMessage = 'Le total doit être supérieur à 0 (ajoutez des articles).';
      return;
    }

    if (!Number.isFinite(taxAmount) || taxAmount < 0) {
      this.errorMessage = 'La taxe doit être positive.';
      return;
    }

    this.errorMessage = null;

    const payload: any = {
      businessId,
      clientId,
      status: this.form.status,
      issueDate: new Date(issueDate).toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      totalAmount: this.total(),
      taxAmount,
      notes,
      items: this.form.items.map((it: any) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.amount
      }))
    };

    if (this.isAdmin() && this.selectedEmployeeId) {
      payload.createdByUserId = this.selectedEmployeeId;
    }

    const id = this.editingId();
    const tenantId = this.resolveTenantId();
    const obs$ = id ? this.invoicesApi.update(id, payload, tenantId || undefined) : this.invoicesApi.create(payload, tenantId || undefined);
    obs$.subscribe({
      next: () => {
        this.submitted = false;
        this.cancelEdit();
        this.reload();
      },
      error: (err) => alert(err?.error?.message || 'Erreur Invoice'),
    });
  }

  isInvalid(field: string) {
    if (field === 'items') {
      return this.submitted && (!this.form.items || this.form.items.length === 0);
    }
    return this.submitted && !this.form[field];
  }

  edit(inv: any) {
    this.editingId.set(inv.id);
    this.form = {
      clientId: inv.clientId,
      status: inv.status,
      issueDate: inv.issueDate ? String(inv.issueDate).slice(0, 10) : '',
      dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : '',
      totalAmount: inv.totalAmount,
      taxAmount: inv.taxAmount,
      notes: inv.notes,
      items: (inv.items || []).map((it: any) => ({ ...it }))
    };
    this.updateTotals();
  }

  cancelEdit() {
    this.editingId.set('');
    this.form = { clientId: this.form.clientId || '', status: 'DRAFT', issueDate: '', dueDate: '', totalAmount: 0, taxAmount: 0, notes: '', items: [] };
    this.subtotal.set(0);
    this.total.set(0);
  }

  remove(inv: any) {
    if (!confirm(`Supprimer la facture ${inv.invoiceNumber} ?`)) return;
    const tenantId = this.resolveTenantId();
    this.invoicesApi.remove(inv.id, tenantId || undefined).subscribe({
      next: () => {
        if (this.editingId() === inv.id) this.cancelEdit();
        this.reload();
      },
      error: (err) => alert(err?.error?.message || 'Erreur lors de la suppression de la facture.'),
    });
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
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

  downloadPDF(inv: any) {
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

  goToDetail(id: string) {
    this.router.navigate(['/invoices', id]);
  }
}


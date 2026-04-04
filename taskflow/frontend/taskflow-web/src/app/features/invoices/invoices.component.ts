import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { SettingsService } from '../../core/services/settings.service';
import { ClientsService, ClientDto } from '../../core/services/clients.service';
import { InvoicesService } from '../../core/services/invoices.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'tf-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, TfCardComponent],
  template: `
    <tf-card>
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 style="margin: 0;">Factures</h2>
          <p class="muted" style="margin: 6px 0 0;">Gérez vos factures par business.</p>
        </div>

        <div class="flex items-center gap-2">
          <ng-container *ngIf="isAdmin()">
            <label class="text-sm muted">Company</label>
            <select
              class="border rounded-lg px-3 py-2 text-sm"
              style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
              [ngModel]="activeTenantId()"
              (ngModelChange)="onTenantChange($event)"
            >
              <option *ngFor="let t of tenants()" [value]="t.id">{{ t.name }}</option>
            </select>
          </ng-container>

          <label class="text-sm muted">Business</label>
          <select
            class="border rounded-lg px-3 py-2 text-sm"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [ngModel]="activeBusinessId()"
            (ngModelChange)="onBusinessChange($event)"
          >
            <option *ngFor="let b of businesses()" [value]="b.id">{{ b.name }}</option>
          </select>
        </div>
      </div>
    </tf-card>

    <tf-card style="margin-top: 12px;" *ngIf="activeBusinessId()">
      <div class="flex items-center justify-between" style="gap: 12px;">
        <div>
          <h3 style="margin: 0;">Créer / Modifier</h3>
          <div *ngIf="!canWrite()" class="muted" style="margin-top: 6px;">Lecture seule (Business Owner).</div>
        </div>
        <button (click)="reload()" class="border px-3 py-2 rounded-lg text-sm hover:bg-[var(--tf-surface-2)] transition" style="border-color: var(--tf-border);">Rafraîchir</button>
      </div>

      <form
        *ngIf="canWrite()"
        (ngSubmit)="saveInvoice()"
        class="grid"
        style="grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 10px; align-items: end; margin-top: 10px;"
      >
        <div *ngIf="isAdmin()" style="grid-column: span 3;">
          <label class="text-sm muted">Pour (employé)</label>
          <select
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="selectedEmployeeId"
            name="selectedEmployeeId"
          >
            <option value="">Moi</option>
            <option *ngFor="let u of employees()" [value]="u.id">{{ u.firstName }} {{ u.lastName }} ({{ u.email }})</option>
          </select>
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">Client</label>
          <select
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.clientId"
            name="clientId"
            required
          >
            <option *ngFor="let c of clients()" [value]="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">Statut</label>
          <select
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.status"
            name="status"
          >
            <option value="DRAFT">DRAFT</option>
            <option value="SENT">SENT</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">Date émission</label>
          <input
            type="date"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.issueDate"
            name="issueDate"
            required
          />
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">Date échéance</label>
          <input
            type="date"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.dueDate"
            name="dueDate"
            [min]="form.issueDate"
          />
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">Total</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.totalAmount"
            name="totalAmount"
            required
          />
        </div>

        <div style="grid-column: span 2;">
          <label class="text-sm muted">Taxe</label>
          <input
            type="number"
            min="0"
            step="0.01"
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.taxAmount"
            name="taxAmount"
          />
        </div>

        <div style="grid-column: span 4;">
          <label class="text-sm muted">Notes</label>
          <input
            class="w-full border rounded-lg px-3 py-2"
            style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);"
            [(ngModel)]="form.notes"
            name="notes"
            maxlength="500"
          />
        </div>

        <div style="grid-column: span 2; display: flex; gap: 8px;">
          <button type="submit" class="bg-[var(--tf-primary)] text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold hover:brightness-95 transition">
            {{ editingId() ? 'Mettre à jour' : 'Créer' }}
          </button>
          <button
            *ngIf="editingId()"
            type="button"
            (click)="cancelEdit()"
            class="border px-4 py-2 rounded-lg text-sm hover:bg-[var(--tf-surface-2)] transition"
            style="border-color: var(--tf-border);"
          >
            Annuler
          </button>
        </div>
      </form>
      <div *ngIf="errorMessage" class="mt-3 text-sm text-red-500">{{ errorMessage }}</div>
    </tf-card>

    <tf-card style="margin-top: 12px;">
      <div *ngIf="!activeBusinessId()" class="muted">Aucun business trouvé. Créez-en un dans Settings.</div>

      <div *ngIf="activeBusinessId()" class="overflow-auto rounded border" style="border-color: var(--tf-border); margin-top: 0;">
        <table class="min-w-full text-sm" style="color: var(--tf-on-surface);">
          <thead style="background: var(--tf-surface-2); color: var(--tf-muted);">
            <tr>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">N°</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Statut</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Émission</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Échéance</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Total</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Taxe</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--tf-border)]">
            <tr *ngFor="let inv of invoices();" class="hover:bg-[var(--tf-surface-2)] transition">
              <td class="px-3 py-2 font-['DM_Mono']">{{ inv.invoiceNumber }}</td>
              <td class="px-3 py-2">{{ inv.status }}</td>
              <td class="px-3 py-2">{{ inv.issueDate | date:'dd MMM yyyy' }}</td>
              <td class="px-3 py-2">{{ inv.dueDate | date:'dd MMM yyyy' }}</td>
              <td class="px-3 py-2">{{ inv.totalAmount }}</td>
              <td class="px-3 py-2">{{ inv.taxAmount }}</td>
              <td class="px-3 py-2">
                <div class="flex gap-2">
                  <button
                    *ngIf="canWrite()"
                    (click)="edit(inv)"
                    class="border px-2 py-1 rounded hover:bg-[var(--tf-surface-2)] transition"
                    style="border-color: var(--tf-border);"
                  >
                    Modifier
                  </button>
                  <button
                    *ngIf="canWrite()"
                    (click)="remove(inv)"
                    class="border px-2 py-1 rounded text-red-600 hover:bg-[var(--tf-surface-2)] transition"
                    style="border-color: var(--tf-border);"
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="activeBusinessId() && invoices().length === 0" class="muted" style="margin-top: 10px;">Aucune facture.</div>
    </tf-card>
  `
})
export class InvoicesComponent implements OnInit {
  private settings = inject(SettingsService);
  private clientsApi = inject(ClientsService);
  private invoicesApi = inject(InvoicesService);
  private auth = inject(AuthService);

  businesses = signal<Array<{ id: string; name: string }>>([]);
  tenants = signal<Array<{ id: string; name: string }>>([]);
  activeTenantId = signal<string>(localStorage.getItem('activeTenantId') || '');
  employees = signal<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  selectedEmployeeId: string = '';
  activeBusinessId = signal<string>('');
  clients = signal<ClientDto[]>([]);

  invoices = signal<any[]>([]);
  editingId = signal<string>('');
  errorMessage: string | null = null;

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
    taxAmount: 0,
    notes: '',
  };

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
        const simplified = (bs || []).map((b) => ({ id: b.id, name: b.name }));
        this.businesses.set(simplified);
        if (simplified.length && !this.activeBusinessId()) {
          this.onBusinessChange(simplified[0].id);
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
    this.activeBusinessId.set('');

    if (!tenantId) return;

    this.settings.getBusinessesForTenant(tenantId).subscribe({
      next: (bs: any[]) => {
        const simplified = (bs || []).map((b) => ({ id: b.id, name: b.name }));
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
    this.activeBusinessId.set(id);
    this.editingId.set('');
    this.form = { clientId: '', status: 'DRAFT', issueDate: '', dueDate: '', totalAmount: 0, taxAmount: 0, notes: '' };
    this.reloadClients();
    this.reload();
  }

  reloadClients() {
    const businessId = this.activeBusinessId();
    if (!businessId) return;
    const tenantId = this.resolveTenantId();
    if (this.isAdmin() && !tenantId) return;
    this.clientsApi.listByBusiness(businessId, tenantId).subscribe({
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
    this.invoicesApi.listByBusiness(businessId, tenantId).subscribe({
      next: (data) => this.invoices.set(data || []),
      error: () => this.invoices.set([]),
    });
  }

  saveInvoice() {
    const businessId = this.activeBusinessId();
    if (!businessId) return;

    const clientId = String(this.form.clientId || '').trim();
    const issueDate = String(this.form.issueDate || '').trim();
    const dueDate = String(this.form.dueDate || '').trim();
    const totalAmount = Number(this.form.totalAmount ?? 0);
    const taxAmount = Number(this.form.taxAmount ?? 0);
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

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      this.errorMessage = 'Le total doit être supérieur à 0.';
      return;
    }

    if (!Number.isFinite(taxAmount) || taxAmount < 0) {
      this.errorMessage = 'La taxe doit être positive.';
      return;
    }

    if (notes.length > 500) {
      this.errorMessage = 'Les notes sont trop longues.';
      return;
    }

    this.errorMessage = null;

    const payload: any = {
      businessId,
      clientId,
      status: this.form.status,
      issueDate: new Date(issueDate).toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      totalAmount,
      taxAmount,
      notes,
    };

    if (this.isAdmin() && this.selectedEmployeeId) {
      payload.createdByUserId = this.selectedEmployeeId;
    }

    const id = this.editingId();
    const tenantId = this.resolveTenantId();
    const obs$ = id ? this.invoicesApi.update(id, payload, tenantId) : this.invoicesApi.create(payload, tenantId);
    obs$.subscribe({
      next: () => {
        this.cancelEdit();
        this.reload();
      },
      error: (err) => alert(err?.error?.message || 'Erreur Invoice'),
    });
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
    };
  }

  cancelEdit() {
    this.editingId.set('');
    this.form = { clientId: this.form.clientId || '', status: 'DRAFT', issueDate: '', dueDate: '', totalAmount: 0, taxAmount: 0, notes: '' };
  }

  remove(inv: any) {
    if (!confirm('Supprimer cette facture ?')) return;
    const tenantId = this.resolveTenantId();
    this.invoicesApi.remove(inv.id, tenantId).subscribe({
      next: () => this.reload(),
      error: (err) => alert(err?.error?.message || 'Erreur suppression'),
    });
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }
}


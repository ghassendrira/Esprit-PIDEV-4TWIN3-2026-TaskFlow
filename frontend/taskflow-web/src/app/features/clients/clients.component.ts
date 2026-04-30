import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { SettingsService } from '../../core/services/settings.service';
import { ClientsService, ClientDto } from '../../core/services/clients.service';
import { InvoicesService } from '../../core/services/invoices.service';
import { MlService } from '../../core/services/ml.service';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { BusinessSelectionService } from '../../core/services/business-selection.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeSelectionService } from '../../core/services/employee-selection.service';

type ClientRow = ClientDto & {
  segmentLabel?: string;
  segmentEmoji?: string;
  segmentColor?: string;
  segmentId?: number;
};

@Component({
  selector: 'tf-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, TfCardComponent],
  template: `
    <tf-card>
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold">Clients</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Gérez vos clients par business.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="flex flex-col gap-1 min-w-[120px]">
            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Business</label>
            <select
              class="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              [ngModel]="activeBusinessId()"
              (ngModelChange)="onBusinessChange($event)"
            >
              <option *ngFor="let b of businesses()" [value]="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div *ngIf="canFilterByEmployee()" class="flex flex-col gap-1 min-w-[180px]">
            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employé</label>
            <select
              class="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              [ngModel]="selectedEmployeeId()"
              (ngModelChange)="onEmployeeChange($event)"
            >
              <option value="">Tous</option>
              <option *ngFor="let u of employees()" [value]="u.id">{{ u.firstName }} {{ u.lastName }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1 min-w-[160px]">
            <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Segment ML</label>
            <select
              class="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              [ngModel]="segmentFilter()"
              (ngModelChange)="segmentFilter.set($event)"
            >
              <option value="">Tous</option>
              <option value="Champion">Champion</option>
              <option value="Fidèle">Fidèle</option>
              <option value="À Risque">À Risque</option>
              <option value="Perdu">Perdu</option>
            </select>
          </div>
        </div>
      </div>
    </tf-card>

    <tf-card class="mt-4" *ngIf="activeBusinessId()">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold">{{ editingId() ? 'Modifier' : 'Nouveau Client' }}</h3>
      </div>

      <form class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end" (ngSubmit)="saveClient()">
        <div>
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Nom complet <span class="text-red-500">*</span></label>
          <input
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
            [(ngModel)]="form.name"
            name="name"
            #name="ngModel"
            required
            minlength="2"
            placeholder="Ex: Monji"
            [class.border-red-500]="(name.touched || submitted) && name.invalid"
          />
          <div *ngIf="(name.touched || submitted) && name.errors?.['required']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom est obligatoire.</div>
          <div *ngIf="(name.touched || submitted) && name.errors?.['minlength']" class="text-red-500 text-[11px] mt-1 ml-1">Le nom doit contenir au moins 2 caractères.</div>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Email</label>
          <input
            type="email"
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
            [(ngModel)]="form.email"
            name="email"
            #email="ngModel"
            email
            placeholder="ex: client@mail.com"
            [class.border-red-500]="(email.touched || submitted) && email.invalid"
          />
          <div *ngIf="(email.touched || submitted) && email.errors?.['email']" class="text-red-500 text-[11px] mt-1 ml-1">Veuillez saisir une adresse email valide.</div>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Téléphone</label>
          <input
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
            [(ngModel)]="form.phone"
            name="phone"
            #phone="ngModel"
            [pattern]="'^[0-9]{8}$'"
            placeholder="ex: 22111333"
            [class.border-red-500]="(phone.touched || submitted) && phone.invalid"
          />
          <div *ngIf="(phone.touched || submitted) && phone.errors?.['pattern']" class="text-red-500 text-[11px] mt-1 ml-1">Le numéro doit contenir exactement 8 chiffres.</div>
        </div>
        <div class="sm:col-span-2">
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Adresse</label>
          <input
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
            [(ngModel)]="form.address"
            name="address"
            #address="ngModel"
            maxlength="255"
            placeholder="123 Rue de la Liberté..."
          />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Matricule / Tax</label>
          <input
            class="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
            [(ngModel)]="form.taxNumber"
            name="taxNumber"
            #tax="ngModel"
            [pattern]="'^[a-zA-Z0-9]{13}$'"
            placeholder="13 caractères"
            [class.border-red-500]="(tax.touched || submitted) && tax.invalid"
          />
          <div *ngIf="(tax.touched || submitted) && tax.errors?.['pattern']" class="text-red-500 text-[11px] mt-1 ml-1">Le matricule doit contenir exactement 13 lettres ou chiffres.</div>
        </div>
        <div class="sm:col-span-2 lg:col-span-1 flex gap-2">
          <button type="submit" class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition">
            {{ editingId() ? 'Mettre à jour' : 'Créer' }}
          </button>
          <button *ngIf="editingId()" type="button" (click)="cancelEdit()" class="flex-1 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            Annuler
          </button>
        </div>
      </form>
      <div *ngIf="errorMessage" class="mt-3 text-sm text-red-500">{{ errorMessage }}</div>
    </tf-card>

    <tf-card class="mt-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold">Liste des clients</h3>
        <button (click)="reload()" class="border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium">Rafraîchir</button>
      </div>

      <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Nom</th>
              <th class="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Email</th>
              <th class="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Téléphone</th>
              <th class="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Adresse</th>
              <th class="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Tax</th>
              <th class="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Segment</th>
              <th class="text-right py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr *ngFor="let c of filteredClients();" class="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition">
              <td class="py-3 px-4 font-medium">{{ c.name }}</td>
              <td class="py-3 px-4 text-slate-500 dark:text-slate-400">{{ c.email }}</td>
              <td class="py-3 px-4 text-slate-500 dark:text-slate-400">{{ c.phone }}</td>
              <td class="py-3 px-4 text-slate-500 dark:text-slate-400">{{ c.address }}</td>
              <td class="py-3 px-4 text-slate-500 dark:text-slate-400">{{ c.taxNumber }}</td>
              <td class="py-3 px-4">
                <span
                  *ngIf="c.segmentLabel"
                  [style.color]="c.segmentColor === 'green' ? '#16a34a' : c.segmentColor === 'blue' ? '#2563eb' : c.segmentColor === 'orange' ? '#ea580c' : '#dc2626'"
                  class="inline-flex items-center gap-1 text-xs font-bold"
                >
                  {{ c.segmentEmoji }} {{ c.segmentLabel }}
                </span>
                <span *ngIf="!c.segmentLabel" class="text-xs text-slate-400 italic">…</span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button (click)="edit(c)" class="text-blue-600 hover:text-blue-700 p-1" title="Modifier"><i class="fa-solid fa-pen"></i></button>
                  <button (click)="remove(c)" class="text-slate-400 hover:text-red-600 p-1 transition" title="Supprimer"><i class="fa-solid fa-trash-can"></i></button>
                </div>
              </td>
            </tr>
            <tr *ngIf="filteredClients().length === 0">
              <td colspan="7" class="py-8 text-center text-slate-500 dark:text-slate-400 italic">Aucun client trouvé.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </tf-card>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ClientsComponent implements OnInit {
  private settings = inject(SettingsService);
  private clientsApi = inject(ClientsService);
  private invoicesApi = inject(InvoicesService);
  private ml = inject(MlService);
  private businessSelection = inject(BusinessSelectionService);
  private auth = inject(AuthService);
  private employeeSelection = inject(EmployeeSelectionService);

  private get isSuperAdmin(): boolean {
    return this.auth.hasRole('ROLE_SUPER_ADMIN');
  }

  businesses = signal<Array<{ id: string; name: string; tenantId: string }>>([]);
  employees = signal<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  selectedEmployeeId = computed(() => this.employeeSelection.selectedEmployeeId());
  activeBusinessId = computed(() => this.businessSelection.selectedBusinessId());
  segmentFilter = signal<string>('');

  clients = signal<ClientRow[]>([]);
  filteredClients = computed(() => {
    const f = this.segmentFilter();
    const list = this.clients();
    if (!f) return list;
    return list.filter((c) => c.segmentLabel === f);
  });
  submitted = false;
  editingId = signal<string | null>(null);
  errorMessage: string | null = null;

  form: {
    name: string;
    email: string;
    phone: string;
    address: string;
    taxNumber: string;
  } = {
    name: '',
    email: '',
    phone: '',
    address: '',
    taxNumber: '',
  };

  ngOnInit(): void {
    this.settings.getBusinesses().subscribe({
      next: (list) => {
        const normalized = Array.isArray(list)
          ? list.map((b: any) => ({ id: String(b.id), name: String(b.name ?? ''), tenantId: b.tenantId }))
          : [];
        this.businesses.set(normalized);
        
        if (normalized.length) {
          const currentId = this.businessSelection.selectedBusinessId();
          const found = normalized.find(b => b.id === currentId);
          if (!currentId || !found) {
            this.onBusinessChange(normalized[0].id);
          } else {
            this.businessSelection.setSelectedBusiness(found.id, found.tenantId);
            this.loadEmployeesForCurrentTenant();
            this.reload();
          }
        }
      },
      error: () => {
        this.businesses.set([]);
      },
    });
  }

  onBusinessChange(id: string) {
    const business = this.businesses().find(b => b.id === id);
    if (business) {
      this.businessSelection.setSelectedBusiness(business.id, business.tenantId);
    }
    this.loadEmployeesForCurrentTenant();
    this.cancelEdit();
    this.reload();
  }

  onEmployeeChange(employeeUserId: string) {
    this.employeeSelection.setSelectedEmployeeId(employeeUserId || '');
    this.reload();
  }

  canFilterByEmployee(): boolean {
    return this.auth.hasRole('ROLE_SUPER_ADMIN') || this.auth.hasRole('ROLE_ADMIN');
  }

  private loadEmployeesForCurrentTenant() {
    if (!this.canFilterByEmployee()) {
      this.employees.set([]);
      return;
    }

    const businessId = this.activeBusinessId();
    const business = this.businesses().find((b) => b.id === businessId);
    const tenantId = business?.tenantId || this.resolveTenantId();

    if (!tenantId) {
      this.employees.set([]);
      return;
    }

    this.auth.getEmployeesForTenant(tenantId).subscribe({
      next: (list: any[]) => this.employees.set(Array.isArray(list) ? list : []),
      error: () => this.employees.set([]),
    });
  }

  private resolveTenantId(): string {
    return localStorage.getItem('activeTenantId') || '';
  }

  reload() {
    const businessId = this.activeBusinessId();

    if (!businessId) {
      this.clients.set([]);
      return;
    }
    const tenantId = this.resolveTenantId();
    const employeeUserId = this.canFilterByEmployee()
      ? this.selectedEmployeeId() || undefined
      : undefined;
    this.clientsApi.listByBusiness(businessId, tenantId || undefined, employeeUserId).subscribe({
      next: (list) => {
        const arr = Array.isArray(list) ? list : [];
        this.clients.set(arr);
        this.enrichSegments(businessId, tenantId, arr);
      },
      error: () => this.clients.set([]),
    });
  }

  private computeRfm(clientId: string, invoices: any[]) {
    const skip = (s: string) => {
      const u = (s || '').toUpperCase();
      return u === 'CANCELED' || u === 'CANCELLED';
    };
    const relevant = invoices.filter((i) => i.clientId === clientId && !skip(i.status));
    const paid = relevant.filter((i) => (i.status || '').toUpperCase() === 'PAID');
    const use = paid.length ? paid : relevant;
    if (!use.length) return { recency: 365, frequency: 0, monetary: 0 };
    const last = use.reduce((acc, i) => Math.max(acc, new Date(i.issueDate).getTime()), 0);
    const recency = Math.max(0, (Date.now() - last) / (1000 * 60 * 60 * 24));
    const frequency = use.length;
    const monetary = use.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
    return { recency, frequency, monetary };
  }

  private enrichSegments(businessId: string, tenantId: string, clients: ClientDto[]) {
    if (!clients.length) return;
    this.invoicesApi.listByBusiness(businessId, tenantId || undefined).subscribe({
      next: (inv) => {
        const invoices = Array.isArray(inv) ? inv : [];
        const calls = clients.map((c) => {
          const rfm = this.computeRfm(c.id, invoices);
          return this.ml
            .segmentClient(c.id, rfm.recency, rfm.frequency, rfm.monetary, businessId)
            .pipe(
              catchError(() => of(null)),
            );
        });
        forkJoin(calls).subscribe((results) => {
          const next: ClientRow[] = clients.map((c, i) => {
            const r = results[i] as any;
            if (!r) return { ...c };
            return {
              ...c,
              segmentLabel: r.segment_label,
              segmentEmoji: r.emoji,
              segmentColor: r.color,
              segmentId: r.segment_id,
            };
          });
          this.clients.set(next);
        });
      },
      error: () => {},
    });
  }

  edit(c: ClientDto) {
    this.editingId.set(c.id);
    this.form = {
      name: c.name ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      taxNumber: c.taxNumber ?? '',
    };
  }

  cancelEdit() {
    this.editingId.set(null);
    this.form = { name: '', email: '', phone: '', address: '', taxNumber: '' };
  }

  saveClient() {
    this.submitted = true;
    const businessId = this.activeBusinessId();
    if (!businessId) return;

    const name = this.form.name.trim();
    const email = this.form.email.trim();
    const phone = this.form.phone.trim();
    const address = this.form.address.trim();
    const taxNumber = this.form.taxNumber.trim();

    if (name.length < 2 || name.length > 80) {
      this.errorMessage = 'Le nom du client doit contenir entre 2 et 80 caractères.';
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.errorMessage = 'Adresse email invalide.';
      return;
    }

    if (phone && !/^[+0-9()\-\s]{8,20}$/.test(phone)) {
      this.errorMessage = 'Numéro de téléphone invalide.';
      return;
    }

    if (address && address.length > 255) {
      this.errorMessage = 'Adresse trop longue.';
      return;
    }

    if (taxNumber && taxNumber.length > 40) {
      this.errorMessage = 'Matricule trop long.';
      return;
    }

    this.errorMessage = null;

    const payload = {
      name,
      email,
      phone,
      address,
      taxNumber,
    };

    const id = this.editingId();
    const tenantId = this.resolveTenantId();

    if (id) {
      this.clientsApi.update(id, payload, tenantId || undefined).subscribe({
        next: () => {
          this.submitted = false;
          this.cancelEdit();
          this.reload();
        },
      });
      return;
    }

    this.clientsApi.create({ businessId, ...payload }, tenantId || undefined).subscribe({
      next: () => {
        this.submitted = false;
        this.cancelEdit();
        this.reload();
      },
    });
  }

  remove(c: ClientDto) {
    if (!confirm(`Supprimer ${c.name} ?`)) return;
    const tenantId = this.resolveTenantId();
    this.clientsApi.remove(c.id, tenantId || undefined).subscribe({
      next: () => {
        if (this.editingId() === c.id) this.cancelEdit();
        this.reload();
      },
    });
  }
}

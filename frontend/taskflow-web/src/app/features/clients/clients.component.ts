import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { ClientsService, ClientDto } from '../../core/services/clients.service';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';

@Component({
  selector: 'tf-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, TfCardComponent],
  template: `
    <tf-card>
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 style="margin: 0;">Clients</h2>
          <p class="muted" style="margin: 6px 0 0;">Gérez vos clients par business.</p>
        </div>

        <div class="flex items-center gap-2">
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

    <tf-card style="margin-top: 12px;">
      <div *ngIf="!activeBusinessId()" class="muted">
        Aucun business trouvé. Créez-en un dans Settings.
      </div>

      <form *ngIf="activeBusinessId()" (ngSubmit)="saveClient()" class="grid" style="grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; align-items: end;">
        <div style="grid-column: span 2;">
          <label class="text-sm muted">Nom</label>
          <input class="w-full border rounded-lg px-3 py-2" style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [(ngModel)]="form.name" name="name" required minlength="2" maxlength="80" />
        </div>
        <div style="grid-column: span 2;">
          <label class="text-sm muted">Email</label>
          <input class="w-full border rounded-lg px-3 py-2" style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [(ngModel)]="form.email" name="email" type="email" maxlength="254" />
        </div>
        <div style="grid-column: span 2;">
          <label class="text-sm muted">Téléphone</label>
          <input class="w-full border rounded-lg px-3 py-2" style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [(ngModel)]="form.phone" name="phone" maxlength="20" />
        </div>
        <div style="grid-column: span 3;">
          <label class="text-sm muted">Adresse</label>
          <input class="w-full border rounded-lg px-3 py-2" style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [(ngModel)]="form.address" name="address" maxlength="255" />
        </div>
        <div style="grid-column: span 2;">
          <label class="text-sm muted">Matricule / Tax</label>
          <input class="w-full border rounded-lg px-3 py-2" style="border-color: var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface);" [(ngModel)]="form.taxNumber" name="taxNumber" maxlength="40" />
        </div>
        <div style="grid-column: span 1; display: flex; gap: 8px;">
          <button type="submit" class="bg-[var(--tf-primary)] text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold hover:brightness-95 transition">
            {{ editingId() ? 'Mettre à jour' : 'Créer' }}
          </button>
          <button *ngIf="editingId()" type="button" (click)="cancelEdit()" class="border px-4 py-2 rounded-lg text-sm hover:bg-[var(--tf-surface-2)] transition" style="border-color: var(--tf-border);">
            Annuler
          </button>
        </div>
      </form>
      <div *ngIf="errorMessage" class="mt-3 text-sm text-red-500">{{ errorMessage }}</div>
    </tf-card>

    <tf-card style="margin-top: 12px;">
      <div class="flex items-center justify-between" style="gap: 12px;">
        <h3 style="margin: 0;">Liste</h3>
        <button (click)="reload()" class="border px-3 py-2 rounded-lg text-sm hover:bg-[var(--tf-surface-2)] transition" style="border-color: var(--tf-border);">Rafraîchir</button>
      </div>

      <div style="margin-top: 10px;" class="overflow-auto rounded border" style="border-color: var(--tf-border);">
        <table class="min-w-full text-sm" style="color: var(--tf-on-surface);">
          <thead style="background: var(--tf-surface-2); color: var(--tf-muted);">
            <tr>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Nom</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Email</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Téléphone</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Adresse</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Tax</th>
              <th class="text-left font-medium px-3 py-2" style="border-bottom: 1px solid var(--tf-border);">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[color:var(--tf-border)]">
            <tr *ngFor="let c of clients();" class="hover:bg-[var(--tf-surface-2)] transition">
              <td class="px-3 py-2">{{ c.name }}</td>
              <td class="px-3 py-2">{{ c.email }}</td>
              <td class="px-3 py-2">{{ c.phone }}</td>
              <td class="px-3 py-2">{{ c.address }}</td>
              <td class="px-3 py-2">{{ c.taxNumber }}</td>
              <td class="px-3 py-2">
                <div class="flex gap-2">
                  <button (click)="edit(c)" class="border px-2 py-1 rounded hover:bg-[var(--tf-surface-2)] transition" style="border-color: var(--tf-border);">Modifier</button>
                  <button (click)="remove(c)" class="border px-2 py-1 rounded text-red-600 hover:bg-[var(--tf-surface-2)] transition" style="border-color: var(--tf-border);">Supprimer</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="clients().length === 0" class="muted" style="margin-top: 10px;">
        Aucun client.
      </div>
    </tf-card>
  `
})
export class ClientsComponent implements OnInit {
  private settings = inject(SettingsService);
  private clientsApi = inject(ClientsService);

  businesses = signal<Array<{ id: string; name: string }>>([]);
  activeBusinessId = signal<string>('');

  clients = signal<ClientDto[]>([]);
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
          ? list.map((b: any) => ({ id: String(b.id), name: String(b.name ?? '') }))
          : [];
        this.businesses.set(normalized);
        const first = normalized[0]?.id ?? '';
        this.activeBusinessId.set(first);
        if (first) this.reload();
      },
      error: () => {
        this.businesses.set([]);
        this.activeBusinessId.set('');
      },
    });
  }

  onBusinessChange(id: string) {
    this.activeBusinessId.set(id);
    this.cancelEdit();
    this.reload();
  }

  reload() {
    const businessId = this.activeBusinessId();
    if (!businessId) {
      this.clients.set([]);
      return;
    }
    this.clientsApi.listByBusiness(businessId).subscribe({
      next: (list) => this.clients.set(Array.isArray(list) ? list : []),
      error: () => this.clients.set([]),
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
    if (id) {
      this.clientsApi.update(id, payload).subscribe({
        next: () => {
          this.cancelEdit();
          this.reload();
        },
      });
      return;
    }

    this.clientsApi.create({ businessId, ...payload }).subscribe({
      next: () => {
        this.cancelEdit();
        this.reload();
      },
    });
  }

  remove(c: ClientDto) {
    if (!confirm(`Supprimer ${c.name} ?`)) return;
    this.clientsApi.remove(c.id).subscribe({
      next: () => {
        if (this.editingId() === c.id) this.cancelEdit();
        this.reload();
      },
    });
  }
}


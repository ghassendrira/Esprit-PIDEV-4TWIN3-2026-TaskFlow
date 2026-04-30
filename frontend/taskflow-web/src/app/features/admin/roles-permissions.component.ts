import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface RoleInfo {
  id: string;
  name: string;
  isStandard?: boolean;
  displayName?: string;
  description?: string;
  userCount?: number;
  color?: string;
  badgeBg?: string;
  badgeText?: string;
  permissions?: { permission: Permission }[];
}

interface Permission {
  id: string;
  name: string;
  description?: string;
  displayName?: string;
}

@Component({
  selector: 'tf-roles-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Modal Création de rôle -->
    <div *ngIf="showCreateModal()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" (click)="closeCreateModal()">
      <div class="bg-[var(--tf-card)] rounded-2xl shadow-2xl border border-[var(--tf-border)] p-8 w-full max-w-md mx-4" (click)="$event.stopPropagation()">
        <h2 class="text-xl font-bold mb-1">Créer un nouveau rôle</h2>
        <p class="text-sm text-[var(--tf-muted)] mb-6">Le nom sera automatiquement mis en majuscules (ex : REVIEWER)</p>
        <div class="mb-4">
          <label class="block text-xs font-semibold uppercase tracking-wider text-[var(--tf-muted)] mb-2">Nom du rôle</label>
          <input
            type="text"
            [(ngModel)]="newRoleName"
            placeholder="ex: REVIEWER"
            (keydown.enter)="submitCreateRole()"
            (keydown.escape)="closeCreateModal()"
            class="w-full px-4 py-3 rounded-xl border border-[var(--tf-border)] bg-[var(--tf-surface)] text-[var(--tf-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--tf-primary)] text-sm"
            autofocus
          />
        </div>
        <div *ngIf="modalError()" class="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ modalError() }}</div>
        <div class="flex gap-3 justify-end">
          <button (click)="closeCreateModal()" class="px-5 py-2.5 rounded-xl border border-[var(--tf-border)] text-sm font-medium hover:bg-[var(--tf-surface-2)] transition-all">
            Annuler
          </button>
          <button (click)="submitCreateRole()" [disabled]="isSaving()" class="px-6 py-2.5 rounded-xl bg-[var(--tf-primary)] text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-all">
            <span *ngIf="isSaving()"><i class="fa-solid fa-circle-notch animate-spin mr-2"></i>Création...</span>
            <span *ngIf="!isSaving()">Créer le rôle</span>
          </button>
        </div>
      </div>
    </div>

    <div class="min-h-[calc(100vh-3rem)] p-6 bg-[var(--tf-surface)] text-[var(--tf-on-surface)]">
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Roles & permissions</h1>
          <p class="text-sm text-[var(--tf-muted)] mt-1">Gérez les niveaux d'accès et les permissions pour chaque rôle</p>
        </div>
        <div class="flex gap-3">
          <span *ngIf="isSaving()" class="flex items-center gap-2 text-xs text-[var(--tf-primary)] animate-pulse">
            <i class="fa-solid fa-circle-notch animate-spin"></i>
            Enregistrement...
          </span>
          <button (click)="openCreateRole()" class="px-6 py-2.5 rounded-xl border border-[var(--tf-primary)] text-[var(--tf-primary)] font-semibold hover:bg-[var(--tf-surface-2)] transition-all">
            <i class="fa-solid fa-plus mr-2"></i>Ajouter un rôle
          </button>
        </div>
      </div>

      <div *ngIf="errorMessage()" class="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-sm">
        {{ errorMessage() }}
      </div>

      <div *ngIf="successMessage()" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-2 text-sm">
        {{ successMessage() }}
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="stat-card">
          <span class="stat-label">Total rôles</span>
          <div class="stat-value">{{ roles().length }}</div>
        </div>
        <div class="stat-card">
          <span class="stat-label">Permissions</span>
          <div class="stat-value">{{ permissions().length }}</div>
        </div>
        <div class="stat-card">
          <span class="stat-label">Utilisateurs actifs</span>
          <div class="stat-value">{{ activeUsers() }}</div>
        </div>
        <div class="stat-card">
          <span class="stat-label">Accès complet</span>
          <div class="stat-value">{{ fullAccessRolesCount() }}</div>
        </div>
      </div>

      <!-- Roles Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <div *ngFor="let role of roles()" class="role-card" [style.border-top-color]="getRoleColor(role.name)">
          <div class="flex justify-between items-start mb-4">
            <span class="role-badge" 
                  [style.background-color]="getRoleBadgeBg(role.name)" 
                  [style.color]="getRoleBadgeText(role.name)">
              {{ role.name }}
            </span>
            <div class="flex items-center gap-2">
              <button
                *ngIf="canDeleteRole(role)"
                type="button"
                (click)="deleteRole(role)"
                [disabled]="isSaving()"
                class="delete-role-btn"
                title="Supprimer ce rôle"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
              <div class="w-2 h-2 rounded-full" [style.background-color]="getRoleColor(role.name)"></div>
            </div>
          </div>
          <h3 class="text-lg font-bold mb-2">{{ role.name | titlecase }}</h3>
          <p class="text-sm text-[var(--tf-muted)] line-clamp-2 mb-6">{{ getRoleDescription(role.name) }}</p>
          <div class="mt-auto pt-4 border-t border-[var(--tf-border)] flex items-center gap-2 text-xs text-[var(--tf-muted)]">
            <span class="w-1.5 h-1.5 rounded-full" [style.background-color]="getRoleColor(role.name)"></span>
            {{ role.userCount || 0 }} utilisateurs actifs
          </div>
        </div>
      </div>

      <!-- Permissions Matrix -->
      <div class="rounded-2xl border border-[var(--tf-border)] bg-[var(--tf-card)] overflow-hidden shadow-[var(--tf-shadow)]">
        <div class="p-6 border-b border-[var(--tf-border)]">
          <h2 class="text-lg font-bold">Matrice des permissions</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[var(--tf-surface-2)]">
                <th class="p-4 text-xs font-bold uppercase tracking-widest text-[var(--tf-muted)] border-b border-[var(--tf-border)]">Permission</th>
                <th *ngFor="let role of roles()" class="p-4 text-xs font-bold uppercase tracking-widest text-[var(--tf-muted)] border-b border-[var(--tf-border)] text-center">
                  {{ role.name | titlecase }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let perm of permissions()" class="hover:bg-[var(--tf-surface-2)] transition-colors border-b border-[var(--tf-border)] last:border-0">
                <td class="p-4">
                  <div class="font-medium text-sm">{{ perm.name }}</div>
                  <div class="text-[10px] text-[var(--tf-muted)]">{{ perm.description }}</div>
                </td>
                <td *ngFor="let role of roles()" class="p-4 text-center">
                  <div class="flex justify-center">
                    <input type="checkbox" 
                           [checked]="hasPermission(role, perm.id)"
                           (change)="togglePermission(role, perm.id)"
                           [disabled]="role.name === 'SUPER_ADMIN' || isSaving()"
                           class="custom-checkbox"
                           [ngClass]="role.name.toLowerCase()">
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--tf-card);
      border: 1px solid var(--tf-border);
      border-radius: 10px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--tf-muted);
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .role-card {
      background: var(--tf-card);
      border: 1px solid var(--tf-border);
      border-top-width: 3px;
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease, border-color 0.2s ease;
      &:hover {
        transform: translateY(-4px);
        border-color: var(--tf-primary);
      }
    }
    .role-badge {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .delete-role-btn {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 9999px;
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
      background: rgba(239, 68, 68, 0.08);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .delete-role-btn:hover {
      background: rgba(239, 68, 68, 0.18);
      border-color: rgba(239, 68, 68, 0.6);
      color: #fca5a5;
    }
    .delete-role-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .custom-checkbox {
      appearance: none;
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid var(--tf-border);
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
      
      &:checked {
        border-color: currentColor;
        background-color: currentColor;
        &::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 0.8rem;
          font-weight: bold;
        }
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.super_admin { color: var(--tf-primary); }
      &.admin { color: #534AB7; }
      &.owner { color: #378ADD; }
      &.business_owner { color: #BA7517; }
    }
  `]
})
export class RolesPermissionsComponent implements OnInit {
  private auth = inject(AuthService);

  private readonly rolePriority = [
    'SUPER_ADMIN',
    'ADMIN',
    'OWNER',
    'BUSINESS_OWNER',
    'ACCOUNTANT',
    'TEAM_MEMBER',
  ];
  
  roles = signal<RoleInfo[]>([]);
  permissions = signal<Permission[]>([]);
  activeUsers = signal(0);
  isSaving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  fullAccessRolesCount = signal(1);

  // Modal signals
  showCreateModal = signal(false);
  newRoleName = '';
  modalError = signal('');

  ngOnInit(): void {
    this.loadData();
  }

  private trimRoles(input: RoleInfo[]): RoleInfo[] {
    const roles = Array.isArray(input) ? input : [];

    const score = (r: RoleInfo) => {
      const p = this.rolePriority.indexOf(String(r.name || '').toUpperCase());
      return p === -1 ? 999 : p;
    };

    const withUsers = roles
      .filter(r => (r.userCount ?? 0) > 0)
      .sort((a, b) => score(a) - score(b));

    const seen = new Set(withUsers.map(r => r.id));
    const fill = roles
      .filter(r => !seen.has(r.id))
      .sort((a, b) => score(a) - score(b));

    return [...withUsers, ...fill];
  }

  loadData() {
    this.auth.getRoles().pipe(
      catchError(err => {
        this.errorMessage.set(`Impossible de charger les rôles : ${err?.error?.message || err?.message || 'erreur réseau'}`);
        return of([]);
      })
    ).subscribe(roles => {
      const list = Array.isArray(roles) ? roles : [];
      this.roles.set(this.trimRoles(list));
      this.recomputeStats();
    });

    this.auth.getPermissions().pipe(
      catchError(err => {
        console.error('[Roles] Permissions load error:', err);
        return of([]);
      })
    ).subscribe(perms => {
      this.permissions.set(Array.isArray(perms) ? perms : []);
      this.recomputeStats();
    });
  }

  private normalizeRoleName(input: string): string {
    return String(input || '')
      .trim()
      .toUpperCase()
      .replace(/^ROLE_/, '')
      .replace(/\s+/g, '_');
  }

  openCreateRole() {
    this.newRoleName = '';
    this.modalError.set('');
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.newRoleName = '';
    this.modalError.set('');
  }

  submitCreateRole() {
    const roleName = this.normalizeRoleName(this.newRoleName);
    if (!roleName || roleName.length < 3) {
      this.modalError.set('Nom de rôle invalide (minimum 3 caractères).');
      return;
    }

    this.isSaving.set(true);
    this.modalError.set('');
    this.auth.createRole({ name: roleName, isStandard: false }).subscribe({
      next: () => {
        this.showCreateModal.set(false);
        this.newRoleName = '';
        this.successMessage.set(`Rôle "${roleName}" créé avec succès.`);
        setTimeout(() => this.successMessage.set(''), 4000);
        this.isSaving.set(false);
        this.loadData();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Création du rôle impossible.';
        this.modalError.set(Array.isArray(msg) ? msg.join(', ') : String(msg));
        this.isSaving.set(false);
      },
    });
  }

  canDeleteRole(role: RoleInfo): boolean {
    return !role.isStandard;
  }

  deleteRole(role: RoleInfo) {
    if (this.isSaving() || !this.canDeleteRole(role)) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    const confirmed = window.confirm(`Supprimer le rôle ${role.name} ? Cette action est irréversible.`);
    if (!confirmed) return;

    this.isSaving.set(true);
    this.auth.deleteRole(role.id).subscribe({
      next: () => {
        this.successMessage.set(`Rôle "${role.name}" supprimé avec succès.`);
        this.roles.set(this.roles().filter(r => r.id !== role.id));
        this.recomputeStats();
        this.isSaving.set(false);
        this.loadData();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Suppression du rôle impossible.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : String(msg));
        this.isSaving.set(false);
      },
    });
  }

  private recomputeStats() {
    const roles = this.roles();
    const perms = this.permissions();

    const activeUsers = roles.reduce((sum, r) => sum + (r.userCount ?? 0), 0);
    this.activeUsers.set(activeUsers);

    // "Accès complet" = roles that have all permissions
    if (perms.length === 0) return;
    const fullAccess = roles.filter(r => (r.permissions?.length ?? 0) >= perms.length).length;
    this.fullAccessRolesCount.set(fullAccess);
  }

  hasPermission(role: RoleInfo, permissionId: string): boolean {
    return role.permissions?.some(rp => rp.permission.id === permissionId) || false;
  }

  togglePermission(role: RoleInfo, permissionId: string) {
    if (this.isSaving()) return;

    const currentPermissionIds = role.permissions?.map(rp => rp.permission.id) || [];
    let newPermissionIds: string[];

    if (currentPermissionIds.includes(permissionId)) {
      newPermissionIds = currentPermissionIds.filter(id => id !== permissionId);
    } else {
      newPermissionIds = [...currentPermissionIds, permissionId];
    }

    this.isSaving.set(true);
    this.auth.assignPermissions(role.id, newPermissionIds).subscribe({
      next: () => {
        this.loadData(); // Refresh to get updated state
        this.isSaving.set(false);
      },
      error: (err) => {
        console.error('Failed to update permissions', err);
        this.isSaving.set(false);
      }
    });
  }

  getRoleColor(roleName: string): string {
    switch (roleName) {
      case 'SUPER_ADMIN': return 'var(--tf-primary)';
      case 'ADMIN': return '#534AB7';
      case 'OWNER': return '#378ADD';
      case 'BUSINESS_OWNER': return '#BA7517';
      default: return '#6b7280';
    }
  }

  getRoleBadgeBg(roleName: string): string {
    const color = this.getRoleColor(roleName);
    return `${color}33`; // 20% opacity
  }

  getRoleBadgeText(roleName: string): string {
    return this.getRoleColor(roleName);
  }

  getRoleDescription(roleName: string): string {
    switch (roleName) {
      case 'SUPER_ADMIN': return 'Contrôle total sur l\'ensemble de la plateforme et de toutes les entreprises.';
      case 'ADMIN': return 'Gestion de haut niveau des utilisateurs et des paramètres système.';
      case 'OWNER': return 'Propriétaire d\'une entreprise spécifique avec un accès complet aux données de l\'entreprise.';
      case 'BUSINESS_OWNER': return 'Gère une unité commerciale spécifique au sein d\'une entreprise.';
      default: return 'Rôle personnalisé pour l\'organisation.';
    }
  }
}

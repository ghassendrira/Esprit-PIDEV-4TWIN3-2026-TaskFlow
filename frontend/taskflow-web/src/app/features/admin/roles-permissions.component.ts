import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

interface RoleInfo {
  id: string;
  name: string;
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
    <div class="min-h-[calc(100vh-3rem)] p-6 bg-[#0a1f15] text-white">
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Roles & permissions</h1>
          <p class="text-sm text-gray-400 mt-1">Gérez les niveaux d'accès et les permissions pour chaque rôle</p>
        </div>
        <div class="flex gap-3">
          <span *ngIf="isSaving()" class="flex items-center gap-2 text-xs text-[#1D9E75] animate-pulse">
            <i class="fa-solid fa-circle-notch animate-spin"></i>
            Enregistrement...
          </span>
          <button class="px-6 py-2.5 rounded-xl border border-[#1D9E75] text-[#1D9E75] font-semibold hover:bg-[#1D9E75]/10 transition-all">
            Ajouter un rôle
          </button>
        </div>
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
            <div class="w-2 h-2 rounded-full" [style.background-color]="getRoleColor(role.name)"></div>
          </div>
          <h3 class="text-lg font-bold mb-2">{{ role.name | titlecase }}</h3>
          <p class="text-sm text-gray-400 line-clamp-2 mb-6">{{ getRoleDescription(role.name) }}</p>
          <div class="mt-auto pt-4 border-t border-[#1a4a2e] flex items-center gap-2 text-xs text-gray-400">
            <span class="w-1.5 h-1.5 rounded-full" [style.background-color]="getRoleColor(role.name)"></span>
            {{ role.userCount || 0 }} utilisateurs actifs
          </div>
        </div>
      </div>

      <!-- Permissions Matrix -->
      <div class="rounded-2xl border border-[#1a4a2e] bg-[#0f2d1e] overflow-hidden shadow-2xl">
        <div class="p-6 border-b border-[#1a4a2e]">
          <h2 class="text-lg font-bold">Matrice des permissions</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[#0a1f15]/50">
                <th class="p-4 text-xs font-bold uppercase tracking-widest text-gray-500 border-b border-[#1a4a2e]">Permission</th>
                <th *ngFor="let role of roles()" class="p-4 text-xs font-bold uppercase tracking-widest text-gray-500 border-b border-[#1a4a2e] text-center">
                  {{ role.name | titlecase }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let perm of permissions()" class="hover:bg-white/5 transition-colors border-b border-[#1a4a2e]/50 last:border-0">
                <td class="p-4">
                  <div class="font-medium text-sm text-gray-200">{{ perm.name }}</div>
                  <div class="text-[10px] text-gray-500">{{ perm.description }}</div>
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
      background: #0f2d1e;
      border: 1px solid #1a4a2e;
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
      color: #86b29a;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .role-card {
      background: #0f2d1e;
      border: 1px solid #1a4a2e;
      border-top-width: 3px;
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s ease, border-color 0.2s ease;
      &:hover {
        transform: translateY(-4px);
        border-color: #1D9E75;
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
    .custom-checkbox {
      appearance: none;
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid #1a4a2e;
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

      &.super_admin { color: #1D9E75; }
      &.admin { color: #534AB7; }
      &.owner { color: #378ADD; }
      &.business_owner { color: #BA7517; }
    }
  `]
})
export class RolesPermissionsComponent implements OnInit {
  private auth = inject(AuthService);
  
  roles = signal<RoleInfo[]>([]);
  permissions = signal<Permission[]>([]);
  activeUsers = signal(0);
  isSaving = signal(false);

  fullAccessRolesCount = signal(1);

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.auth.getRoles().subscribe(roles => {
      this.roles.set(roles);
    });
    this.auth.getPermissions().subscribe(perms => {
      this.permissions.set(perms);
    });
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
      case 'SUPER_ADMIN': return '#1D9E75';
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

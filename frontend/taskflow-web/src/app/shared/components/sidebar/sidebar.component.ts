import { Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

type MenuItem = { label: string; icon: string; path: string; roles?: ('OWNER'|'ACCOUNTANT'|'TEAM'|'SUPER_ADMIN')[] };

@Component({
  selector: 'tf-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor],
  template: `
    <nav class="h-full p-2">
      <a *ngFor="let item of visibleItems()"
         [routerLink]="item.path"
         routerLinkActive="!bg-[#1D9E75]/10 !text-slate-900"
         #rla="routerLinkActive"
         (click)="navigate.emit()"
         class="flex items-center gap-2 px-3 py-2 rounded text-slate-700 hover:bg-slate-50 transition-all group">
        <span class="w-2 h-2 rounded-full transition-all" 
              [style.background-color]="rla.isActive ? '#1D9E75' : 'transparent'"
              [class.opacity-0]="!rla.isActive"
              [class.opacity-100]="rla.isActive">
        </span>
        <span class="text-sm font-medium" [class.text-[#1D9E75]]="rla.isActive">{{ item.label }}</span>
      </a>
    </nav>
  `,
  styles: [`
    :host { display: block; }
    a.active { background: rgba(15, 23, 42, 0.05); }
  `]
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();
  private auth = inject(AuthService);

  items: MenuItem[] = [
    { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { label: 'Settings', icon: 'settings', path: '/settings', roles: ['OWNER'] },
    { label: 'Invoices', icon: 'receipt_long', path: '/invoices', roles: ['OWNER','ACCOUNTANT'] },
    { label: 'Expenses', icon: 'account_balance_wallet', path: '/expenses', roles: ['OWNER','ACCOUNTANT'] },
    { label: 'Clients', icon: 'group', path: '/clients', roles: ['OWNER','ACCOUNTANT','TEAM'] },
    { label: 'Team', icon: 'diversity_3', path: '/team', roles: ['OWNER'] },
    { label: 'Employees', icon: 'person_add', path: '/employees', roles: ['OWNER'] },
    { label: 'Admin Panel', icon: 'shield', path: '/admin/registrations', roles: ['SUPER_ADMIN'] },
    { label: 'Password Requests', icon: 'key', path: '/admin/password-requests', roles: ['SUPER_ADMIN'] },
    { label: 'Roles & permissions', icon: 'key', path: '/admin/roles', roles: ['SUPER_ADMIN'] }
  ];

  visibleItems() {
    const userRoles = this.auth.roles();
    
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN' as any);
    const isAdmin = userRoles.includes('ADMIN' as any);
    const isOwner = userRoles.includes('OWNER' as any) || userRoles.includes('BUSINESS_OWNER' as any);

    return this.items.filter(i => {
      // 1. Admin Panel & Password Requests: ONLY for SUPER_ADMIN
      if (i.label === 'Admin Panel' || i.label === 'Password Requests') {
        return isSuperAdmin;
      }

      // 2. Roles & Permissions: SUPER_ADMIN, ADMIN, and OWNER/BO
      if (i.label === 'Roles & permissions') {
        return isSuperAdmin || isAdmin || isOwner;
      }

      // 3. For everything else (Settings, Invoices, Employees, etc.):
      // If user is SUPER_ADMIN, ADMIN, or OWNER/BO -> Show them
      if (isSuperAdmin || isAdmin || isOwner) {
        return true;
      }

      // 4. Fallback for other roles (Accountant, Team Member) based on item.roles
      if (!i.roles) return true;
      return i.roles.some(r => {
        const hasRole = userRoles.includes(r);
        if (!hasRole) {
          if (r === 'TEAM' && userRoles.includes('TEAM_MEMBER' as any)) return true;
        }
        return hasRole;
      });
    });
  }
}

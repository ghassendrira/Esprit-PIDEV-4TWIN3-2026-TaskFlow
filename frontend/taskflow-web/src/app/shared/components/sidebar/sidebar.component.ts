import { Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

type MenuItem = { label: string; icon: string; path: string; roles?: ('OWNER'|'ACCOUNTANT'|'TEAM'|'SUPER_ADMIN')[] };

@Component({
  selector: 'tf-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor, NgIf],
  template: `
    <nav class="h-full px-4 py-5">
      <div class="flex flex-col gap-2">
        <a *ngFor="let item of visibleItems()"
           [routerLink]="item.path"
           routerLinkActive="!bg-primary-50 !text-primary-700 dark:!bg-primary-900/10 dark:!text-primary-400"
           #rla="routerLinkActive"
           (click)="navigate.emit()"
           class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group hover:bg-[var(--tf-surface-2)]"
           style="color: var(--tf-muted);">
          <div class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
               [class.bg-primary-100]="rla.isActive"
               [class.text-primary-700]="rla.isActive"
               [class.dark:bg-primary-900/30]="rla.isActive"
               [class.dark:text-primary-400]="rla.isActive">
            <i class="fa-solid" [class]="item.icon"></i>
          </div>
          <span class="text-sm font-semibold tracking-tight">{{ item.label }}</span>
          
          <div *ngIf="rla.isActive" class="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(var(--tf-primary-rgb),0.6)]"></div>
        </a>
      </div>
    </nav>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();
  private auth = inject(AuthService);

  items: MenuItem[] = [
    { label: 'Dashboard', icon: 'fa-gauge-high', path: '/dashboard' },
    { label: 'Invoices', icon: 'fa-file-invoice', path: '/invoices', roles: ['OWNER','ACCOUNTANT','TEAM'] },
    { label: 'Expenses', icon: 'fa-wallet', path: '/expenses', roles: ['OWNER','ACCOUNTANT','TEAM'] },
    { label: 'Clients', icon: 'fa-users', path: '/clients', roles: ['OWNER','ACCOUNTANT','TEAM'] },
    { label: 'Team', icon: 'fa-people-group', path: '/team', roles: ['OWNER'] },
    { label: 'Employees', icon: 'fa-user-plus', path: '/employees', roles: ['OWNER'] },
    { label: 'Settings', icon: 'fa-gear', path: '/settings', roles: ['OWNER'] },
    { label: 'Support', icon: 'fa-headset', path: '/support', roles: ['OWNER','SUPER_ADMIN'] },
    { label: 'Admin Panel', icon: 'fa-shield-halved', path: '/admin/registrations', roles: ['SUPER_ADMIN'] },
    { label: 'Password Requests', icon: 'fa-key', path: '/admin/password-requests', roles: ['SUPER_ADMIN'] },
    { label: 'Blocked Accounts', icon: 'fa-user-lock', path: '/admin/blocked-accounts', roles: ['SUPER_ADMIN'] },
    { label: 'Roles & permissions', icon: 'fa-user-shield', path: '/admin/roles', roles: ['SUPER_ADMIN'] }
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

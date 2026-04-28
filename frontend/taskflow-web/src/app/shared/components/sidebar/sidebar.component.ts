import { Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../pipes/t.pipe';

type MenuItem = { labelKey: string; icon: string; path: string; roles?: ('OWNER'|'ACCOUNTANT'|'TEAM'|'SUPER_ADMIN')[] };

@Component({
  selector: 'tf-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor, TranslatePipe],
  template: `
    <nav class="h-full px-4 py-5">
      <div class="flex flex-col gap-3">
        <a *ngFor="let item of visibleItems()"
           [routerLink]="item.path"
           routerLinkActive="!bg-[var(--tf-surface-2)] !text-[color:var(--tf-on-surface)]"
           #rla="routerLinkActive"
           (click)="navigate.emit()"
           class="flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all group hover:bg-[var(--tf-surface-2)]"
           style="color: var(--tf-muted);">
          <span class="w-2 h-2 rounded-full transition-all" 
                [style.background]="rla.isActive ? 'var(--tf-primary)' : 'transparent'"
                [class.opacity-0]="!rla.isActive"
                [class.opacity-100]="rla.isActive">
          </span>
          <span class="text-sm font-medium" [class.text-primary-700]="rla.isActive" [class.dark:text-primary-300]="rla.isActive">{{ item.labelKey | t }}</span>
        </a>
      </div>
    </nav>
  `,
  styles: [`
    :host { display: block; }
    a.active { background: var(--tf-surface-2); }
  `]
})
export class SidebarComponent {
  @Output() navigate = new EventEmitter<void>();
  private auth = inject(AuthService);

  items: MenuItem[] = [
    { labelKey: 'common.dashboard', icon: 'dashboard', path: '/dashboard' },
    { labelKey: 'settings.title', icon: 'settings', path: '/settings', roles: ['OWNER'] },
    { labelKey: 'invoice.title', icon: 'receipt_long', path: '/invoices', roles: ['OWNER','ACCOUNTANT','TEAM'] },
    { labelKey: 'expenses.title', icon: 'account_balance_wallet', path: '/expenses', roles: ['OWNER','ACCOUNTANT','TEAM'] },
    { labelKey: 'common.ai-lab', icon: 'psychology', path: '/ai/expense-classifier', roles: ['OWNER','ACCOUNTANT','TEAM','SUPER_ADMIN'] },
    { labelKey: 'common.ai-risk', icon: 'query_stats', path: '/ai/invoice-delay', roles: ['OWNER','ACCOUNTANT','TEAM','SUPER_ADMIN'] },
    { labelKey: 'clients.title', icon: 'group', path: '/clients', roles: ['OWNER','ACCOUNTANT','TEAM'] },
    { labelKey: 'common.team', icon: 'diversity_3', path: '/team', roles: ['OWNER'] },
    { labelKey: 'employees.title', icon: 'person_add', path: '/employees', roles: ['OWNER'] },
    { labelKey: 'admin.pending-registrations', icon: 'shield', path: '/admin/registrations', roles: ['SUPER_ADMIN'] },
    { labelKey: 'admin.password-requests', icon: 'key', path: '/admin/password-requests', roles: ['SUPER_ADMIN'] },
    { labelKey: 'admin.blocked-title', icon: 'lock', path: '/admin/blocked-accounts', roles: ['SUPER_ADMIN'] },
    { labelKey: 'roles.title', icon: 'key', path: '/admin/roles', roles: ['SUPER_ADMIN'] }
  ];

  visibleItems() {
    const userRoles = this.auth.roles();
    
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN' as any);
    const isAdmin = userRoles.includes('ADMIN' as any);
    const isOwner = userRoles.includes('OWNER' as any) || userRoles.includes('BUSINESS_OWNER' as any);
    const isBusinessOwnerOnly =
      userRoles.includes('BUSINESS_OWNER' as any) ||
      (userRoles.includes('OWNER' as any) && !isSuperAdmin && !isAdmin);
    const superAdminOnly = new Set([
      'admin.pending-registrations',
      'admin.password-requests',
    ]);

    return this.items.filter(i => {
      // 1. Super-admin-only sections should not be shown to other roles.
      if (superAdminOnly.has(i.labelKey)) {
        return isSuperAdmin;
      }

      // 2. Roles & Permissions: only SUPER_ADMIN and ADMIN.
      if (i.labelKey === 'roles.title') {
        return isSuperAdmin || isAdmin;
      }

      // 3. Hide admin-only operational pages from business owners.
      if (isBusinessOwnerOnly && (
        i.path === '/ai/expense-classifier' ||
        i.path === '/admin/blocked-accounts' ||
        i.path === '/admin/roles'
      )) {
        return false;
      }

      // 4. For everything else (Settings, Invoices, Employees, etc.):
      // If user is SUPER_ADMIN, ADMIN, or OWNER/BO -> Show them
      if (isSuperAdmin || isAdmin || isOwner) {
        return true;
      }

      // 5. Fallback for other roles (Accountant, Team Member) based on item.roles
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

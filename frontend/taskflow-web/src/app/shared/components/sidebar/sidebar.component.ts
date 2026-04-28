import { Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { AuthService, Role } from '../../../core/services/auth.service';

type MenuItem = { label: string; icon: string; path: string; roles?: Role[] };

@Component({
  selector: 'tf-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor, NgIf],
  template: `
    <nav class="h-full px-4 py-5">
      <div class="flex flex-col gap-2">
        <a *ngFor="let item of visibleItems"
           [routerLink]="item.route"
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

  sidebarItems = [
    {
      label: 'Dashboard',
      icon: 'fa-gauge-high',
      route: '/dashboard',
      roles: ['ROLE_ACCOUNTANT', 'ROLE_TEAM', 'ROLE_BUSINESS_OWNER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_OWNER']
    },
    {
      label: 'Invoices',
      icon: 'fa-file-invoice-dollar',
      route: '/invoices',
      roles: ['ROLE_ACCOUNTANT', 'ROLE_TEAM', 'ROLE_BUSINESS_OWNER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_OWNER']
    },
    {
      label: 'Expenses',
      icon: 'fa-wallet',
      route: '/expenses',
      roles: ['ROLE_ACCOUNTANT', 'ROLE_TEAM', 'ROLE_BUSINESS_OWNER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_OWNER']
    },
    {
      label: 'Clients',
      icon: 'fa-users',
      route: '/clients',
      roles: ['ROLE_ACCOUNTANT', 'ROLE_TEAM', 'ROLE_BUSINESS_OWNER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_OWNER']
    },
    // ===== ML PAGES =====
    {
      label: 'Risque Paiement',
      icon: 'fa-triangle-exclamation',
      route: '/ml/risk',
      roles: ['ROLE_ACCOUNTANT', 'ROLE_TEAM', 'ROLE_BUSINESS_OWNER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_OWNER']
    },
    {
      label: 'Segmentation Clients',
      icon: 'fa-chart-pie',
      route: '/ml/segmentation',
      roles: ['ROLE_ACCOUNTANT', 'ROLE_TEAM', 'ROLE_BUSINESS_OWNER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_OWNER']
    },
    {
      label: 'Trésorerie (Cashflow)',
      icon: 'fa-arrow-trend-up',
      route: '/ml/cashflow',
      roles: ['ROLE_ACCOUNTANT', 'ROLE_TEAM', 'ROLE_BUSINESS_OWNER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_OWNER']
    },
    {
      label: 'Anomalies',
      icon: 'fa-shield-halved',
      route: '/ml/anomalies',
      roles: ['ROLE_ACCOUNTANT', 'ROLE_TEAM', 'ROLE_BUSINESS_OWNER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_OWNER']
    },
  ];

  get visibleItems() {
    const userRoles = this.auth.roles();
    if (!userRoles.length) return [];
    
    return this.sidebarItems.filter(item => 
      item.roles.some(r => userRoles.includes(r as any))
    );
  }
}

import { Component, inject, computed } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';

@Component({
  selector: 'tf-navbar',
  standalone: true,
  imports: [NgIf],
  template: `
    <nav class="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-100 sticky top-0 z-30">
      <!-- Left side: Company Logo and Name -->
      <div class="flex items-center gap-3">
        <div *ngIf="!tenantLogo()" class="w-8 h-8 rounded bg-[#00C853] flex items-center justify-center text-white font-bold">
          {{ tenantName().charAt(0) }}
        </div>
        <img *ngIf="tenantLogo()" [src]="tenantLogo()" class="w-8 h-8 rounded object-cover border border-gray-100"/>
        <span class="font-bold text-[#1a2e35] uppercase tracking-wider">{{ tenantName() }}</span>
      </div>
      
      <!-- Right side: User Info -->
      <div class="flex items-center gap-4">
        <span class="text-sm text-gray-500 font-medium">{{ userName() }}</span>
        
        <div class="relative">
          <button class="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors">
            <i class="fa-regular fa-bell text-gray-600 text-lg"></i>
            <span class="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>

        <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[#00C853] font-bold text-xs border border-emerald-200 overflow-hidden">
          <i class="fa-solid fa-user-gear text-lg"></i>
        </div>

        <button (click)="logout()" class="w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors text-red-500" title="Déconnexion">
          <i class="fa-solid fa-right-from-bracket text-lg"></i>
        </button>
      </div>
    </nav>
  `,
  styles: []
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private tenant = inject(TenantService);

  tenantName = computed(() => {
    // 1. Try from active tenant service (most reactive)
    const fromTenant = this.tenant.tenantName();
    if (fromTenant && fromTenant !== 'TaskFlow' && fromTenant !== 'GHASSEN DRIRA') return fromTenant;
    
    // 2. Try from user profile in auth
    const fromAuth = this.auth.user()?.tenantName;
    if (fromAuth && fromAuth !== 'TaskFlow' && fromAuth !== 'GHASSEN DRIRA') return fromAuth;

    // 3. Try from localStorage as last resort, but avoid the old default
    const fromStorage = localStorage.getItem('companyName');
    if (fromStorage && fromStorage !== 'GHASSEN DRIRA') return fromStorage;

    return 'TaskFlow';
  });
  tenantLogo = computed(() => this.tenant.logo());
  userName = computed(() => {
    const user = this.auth.user();
    if (user && user.name && user.name !== 'User') return user.name;
    return 'Business Owner';
  });

  logout() {
    this.auth.logout();
    window.location.href = '/auth/login';
  }

  constructor() {
    try {
      const name = localStorage.getItem('companyName');
      if (name && name.trim().length && name !== 'GHASSEN DRIRA') {
        this.tenant.setTenant(null, name);
      }
    } catch {}
  }
}

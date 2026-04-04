import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { TenantService } from '../../core/services/tenant.service';

@Component({
  selector: 'tf-onboarding-layout',
  standalone: true,
  template: `
    <div class="min-h-screen bg-[#0a1a0a] text-white">
      <header class="h-12 flex items-center justify-between px-4">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-emerald-600"></div>
          <span class="font-semibold tracking-wide">{{ title() }}</span>
        </div>
        <a (click)="logout()" class="text-sm text-gray-300 hover:text-white cursor-pointer">Logout</a>
      </header>
      <div class="grid place-items-center py-8">
        <div class="w-[min(580px,92vw)] bg-[#0d2d0d] rounded-2xl shadow-xl border border-emerald-700/30">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class OnboardingLayoutComponent {
  private auth = inject(AuthService);
  private tenant = inject(TenantService);
  title = signal<string>('TaskFlow');
  constructor() {
    try {
      const stored = localStorage.getItem('companyName');
      if (stored && stored.trim().length) {
        this.title.set(stored);
        this.tenant.setTenant(null, stored);
      } else {
        this.title.set(this.tenant.tenantName());
      }
    } catch {
      this.title.set(this.tenant.tenantName());
    }
  }
  logout() {
    this.auth.logout();
  }
}

import { Component, EventEmitter, Output, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'tf-navbar',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink],
  template: `
    <nav class="sticky top-0 z-30 border-b" style="background: var(--tf-card); border-color: var(--tf-border);">
      <div class="h-16 px-4 md:px-6 flex items-center justify-between">
        <!-- Left: menu + brand -->
        <div class="flex items-center gap-2 min-w-0">
          <button
            type="button"
            class="w-10 h-10 inline-flex items-center justify-center rounded-lg border transition hover:bg-[var(--tf-surface-2)]"
            style="border-color: var(--tf-border); color: var(--tf-on-surface);"
            (click)="menuToggle.emit()"
            aria-label="Ouvrir/fermer le menu"
            title="Menu"
          >
            <span class="flex flex-col gap-1" aria-hidden="true">
              <span class="block w-5 h-0.5 rounded" style="background: var(--tf-on-surface);"></span>
              <span class="block w-5 h-0.5 rounded" style="background: var(--tf-on-surface);"></span>
              <span class="block w-5 h-0.5 rounded" style="background: var(--tf-on-surface);"></span>
            </span>
          </button>

          <a routerLink="/dashboard" class="flex items-center gap-3 min-w-0">
            <div
              *ngIf="!tenantLogo() && tenantName() !== 'TaskFlow'"
              class="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold border"
              style="border-color: var(--tf-border);"
              aria-hidden="true"
            >
              {{ tenantName().charAt(0) }}
            </div>
            <img
              *ngIf="!tenantLogo() && tenantName() === 'TaskFlow'"
              src="/TASKFLOW-removebg-preview.png"
              class="w-[170px] sm:w-[190px] h-auto object-contain"
              style="border-color: var(--tf-border);"
              alt="TaskFlow"
            />
            <img
              *ngIf="tenantLogo()"
              [src]="tenantLogo()"
              class="w-9 h-9 rounded-lg object-cover border"
              style="border-color: var(--tf-border);"
              alt="Logo"
            />

            <div class="hidden sm:block min-w-0">
              <div class="font-semibold leading-tight truncate" style="color: var(--tf-on-surface);">
                {{ tenantName() }}
              </div>
              <div class="text-xs truncate muted">
                {{ userName() }}
              </div>
            </div>
          </a>
        </div>

        <!-- Right: actions -->
        <div class="flex items-center gap-2">
          <!-- Notification Dropdown -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleNotifications()"
              class="relative w-10 h-10 inline-flex items-center justify-center rounded-lg border transition hover:bg-[var(--tf-surface-2)]"
              style="border-color: var(--tf-border); color: var(--tf-on-surface);"
              aria-label="Notifications"
              title="Notifications"
            >
              <i class="fa-regular fa-bell text-lg"></i>
              <span
                *ngIf="notifications().length > 0"
                class="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2"
                style="border-color: var(--tf-card);"
              ></span>
            </button>

            <!-- Dropdown Menu -->
            <div *ngIf="showNotifications()" 
                 class="absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-xl shadow-2xl z-50 border animate-in fade-in slide-in-from-top-2"
                 style="background: var(--tf-card); border-color: var(--tf-border);">
              <div class="p-4 border-b flex items-center justify-between" style="border-color: var(--tf-border);">
                <h3 class="font-bold text-sm">Notifications</h3>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-bold uppercase tracking-wider">
                  {{ notifications().length }} Nouvelles
                </span>
              </div>
              
              <div class="py-2">
                <div *ngIf="notifications().length === 0" class="p-8 text-center">
                  <div class="text-3xl mb-2">🔔</div>
                  <p class="text-sm muted">Aucune nouvelle notification</p>
                </div>

                <div *ngFor="let n of notifications()" 
                     class="px-4 py-3 hover:bg-[var(--tf-surface-2)] transition-colors cursor-pointer border-b last:border-0"
                     style="border-color: var(--tf-border);"
                     (click)="handleNotificationClick(n)">
                  <div class="flex gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 flex-shrink-0">
                      <i class="fa-solid" [class.fa-key]="n.type === 'PASSWORD_RESET'" [class.fa-circle-info]="n.type !== 'PASSWORD_RESET'"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold truncate">{{ n.title }}</p>
                      <p class="text-xs muted line-clamp-2 mt-0.5">{{ n.message }}</p>
                      <p class="text-[10px] muted mt-1 italic">{{ n.time }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div *ngIf="notifications().length > 0" class="p-3 border-t text-center" style="border-color: var(--tf-border);">
                <button class="text-xs font-bold text-primary-600 hover:text-primary-500">
                  Tout marquer comme lu
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            (click)="toggleTheme()"
            class="w-10 h-10 inline-flex items-center justify-center rounded-lg border transition hover:bg-[var(--tf-surface-2)]"
            style="border-color: var(--tf-border); color: var(--tf-on-surface);"
            [attr.aria-label]="isDark() ? 'Activer le mode clair' : 'Activer le mode sombre'"
            [attr.title]="isDark() ? 'Mode clair' : 'Mode sombre'"
          >
            <i class="fa-solid" [class.fa-sun]="isDark()" [class.fa-moon]="!isDark()"></i>
          </button>

          <a
            routerLink="/settings"
            class="w-10 h-10 inline-flex items-center justify-center rounded-lg border transition hover:bg-[var(--tf-surface-2)]"
            style="border-color: var(--tf-border); color: var(--tf-on-surface);"
            title="Paramètres"
          >
            <i class="fa-solid fa-user-gear"></i>
          </a>

          <button
            type="button"
            (click)="logout()"
            class="w-10 h-10 inline-flex items-center justify-center rounded-lg border transition text-red-500 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10"
            title="Déconnexion"
            aria-label="Déconnexion"
          >
            <i class="fa-solid fa-power-off"></i>
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: []
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() menuToggle = new EventEmitter<void>();

  private auth = inject(AuthService);
  private tenant = inject(TenantService);
  private theme = inject(ThemeService);

  isDark = computed(() => this.theme.isDark());
  showNotifications = signal(false);
  notifications = signal<any[]>([]);
  private refreshSub?: Subscription;

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

  ngOnInit() {
    this.fetchNotifications();
    // Poll for new notifications every 30 seconds
    this.refreshSub = interval(30000).subscribe(() => this.fetchNotifications());
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
  }

  fetchNotifications() {
    const user = this.auth.user();
    if (!user) return;

    // If user is SUPER_ADMIN, fetch password reset requests as notifications
    if (this.auth.roles().includes('SUPER_ADMIN')) {
      this.auth.getPasswordResetRequests().subscribe({
        next: (requests) => {
          const mapped = requests.map(r => ({
            id: r.id,
            title: 'Récupération de mot de passe',
            message: `${r.userName} (${r.userEmail}) a demandé de l'aide pour son mot de passe.`,
            time: this.formatDate(r.createdAt),
            type: 'PASSWORD_RESET',
            raw: r
          }));
          this.notifications.set(mapped);
        },
        error: (err) => console.error('Failed to fetch notifications:', err)
      });
    } else {
      // Mock notifications for demo/other roles
      this.notifications.set([
        {
          id: '1',
          title: 'Bienvenue sur TaskFlow',
          message: 'Votre espace de travail est prêt. Commencez par ajouter vos clients.',
          time: 'À l\'instant',
          type: 'INFO'
        }
      ]);
    }
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
    return date.toLocaleDateString();
  }

  toggleNotifications() {
    this.showNotifications.update(v => !v);
  }

  handleNotificationClick(n: any) {
    if (n.type === 'PASSWORD_RESET') {
      // Navigate to admin password requests page
      window.location.href = '/admin/password-requests';
    }
    this.showNotifications.set(false);
  }

  logout() {
    this.auth.logout();
    window.location.href = '/auth/login';
  }

  toggleTheme() {
    this.theme.toggle();
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

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type BlockedAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  roleName: string;
  blockedUntil: string;
  loginAttempts: number;
  createdAt: string;
};

@Component({
  selector: 'tf-admin-blocked-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-6 bg-[var(--tf-surface)] text-[color:var(--tf-on-surface)]">
      <div *ngIf="toast()" class="fixed top-4 right-4 z-[60] w-[min(380px,92vw)]" role="status" aria-live="polite">
        <div
          class="rounded-xl border px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur"
          style="background: var(--tf-card); border-color: var(--tf-border); color: var(--tf-on-surface);"
          [class.border-primary-500/40]="toast()!.type === 'success'"
          [class.border-red-500/40]="toast()!.type === 'error'"
          [class.bg-red-950/20]="toast()!.type === 'error'"
        >
          <div class="flex items-start gap-3">
            <div class="mt-0.5">
              <svg *ngIf="toast()!.type === 'success'" class="w-5 h-5 text-primary-600 dark:text-primary-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5"/>
              </svg>
              <svg *ngIf="toast()!.type === 'error'" class="w-5 h-5 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <div class="flex-1">
              <div class="font-semibold">{{ toast()!.title }}</div>
              <div class="text-sm text-[color:var(--tf-muted)] mt-0.5">{{ toast()!.message }}</div>
            </div>
            <button class="text-[color:var(--tf-muted)] hover:text-[color:var(--tf-on-surface)]" (click)="toast.set(null)" aria-label="Close notification">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-[color:var(--tf-border)] p-5 shadow-card" style="background: var(--tf-card);">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500/20 to-red-700/20 border border-red-500/20 grid place-items-center">
              <svg class="w-6 h-6 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.29 3.86l-8.5 14.72A2 2 0 003.5 21h17a2 2 0 001.71-2.42l-8.5-14.72a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-2xl font-bold">Blocked accounts</h1>
                <span class="inline-flex items-center rounded-full border border-[color:var(--tf-border)] bg-[var(--tf-surface-2)] px-2.5 py-1 text-xs text-[color:var(--tf-muted)]">
                  {{ blockedAccounts().length }} blocked
                </span>
              </div>
              <p class="text-sm text-[color:var(--tf-muted)] mt-1">See currently locked users and unblock them manually when needed.</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="h-10 px-4 rounded-xl border border-[color:var(--tf-border)] hover:bg-[var(--tf-surface-2)] text-sm text-[color:var(--tf-on-surface)]"
              style="background: var(--tf-card);"
              (click)="refresh()"
              [disabled]="loading()"
            >
              <span *ngIf="!loading()" class="inline-flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-3-6.7M21 3v7h-7"/>
                </svg>
                Refresh
              </span>
              <span *ngIf="loading()" class="inline-flex items-center gap-2">
                <span class="w-4 h-4 border-2 border-[color:var(--tf-muted)] border-t-[color:var(--tf-primary)] rounded-full animate-spin"></span>
                Loading
              </span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div class="rounded-xl border border-[color:var(--tf-border)] p-4" style="background: var(--tf-surface-2);">
            <div class="text-xs text-[color:var(--tf-muted)]">Blocked users</div>
            <div class="text-2xl font-bold mt-1">{{ blockedAccounts().length }}</div>
          </div>
          <div class="rounded-xl border border-[color:var(--tf-border)] p-4" style="background: var(--tf-surface-2);">
            <div class="text-xs text-[color:var(--tf-muted)]">Unlocking soon</div>
            <div class="text-2xl font-bold mt-1 text-red-300">{{ unlockingSoonCount() }}</div>
          </div>
          <div class="rounded-xl border border-[color:var(--tf-border)] p-4" style="background: var(--tf-surface-2);">
            <div class="text-xs text-[color:var(--tf-muted)]">Failed attempts total</div>
            <div class="text-2xl font-bold mt-1">{{ totalAttempts() }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="!loading() && blockedAccounts().length === 0" class="mt-6 rounded-2xl border border-[color:var(--tf-border)] p-10 text-center shadow-card" style="background: var(--tf-card);">
        <div class="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 border border-primary-500/20 grid place-items-center">
          <svg class="w-7 h-7 text-primary-700 dark:text-primary-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <div class="text-xl font-semibold mt-4">No blocked accounts</div>
        <div class="text-sm text-[color:var(--tf-muted)] mt-1">All accounts are currently accessible.</div>
      </div>

      <div *ngIf="blockedAccounts().length > 0" class="mt-6 grid grid-cols-1 gap-4">
        <div *ngFor="let account of blockedAccounts(); trackBy: trackById" class="rounded-2xl border border-[color:var(--tf-border)] p-5 shadow-card" style="background: var(--tf-card);">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-start gap-4 min-w-0">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 grid place-items-center shrink-0">
                <div class="font-bold text-red-200">{{ initials(account) }}</div>
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <div class="font-semibold text-lg truncate">{{ account.firstName }} {{ account.lastName }}</div>
                  <span class="inline-flex items-center rounded-full border border-red-500/30 bg-red-950/20 px-2.5 py-1 text-xs text-red-200">
                    {{ remainingLabel(account) }} left
                  </span>
                </div>
                <div class="text-sm text-[color:var(--tf-muted)] truncate">{{ account.email }}</div>
                <div class="mt-2 flex flex-wrap gap-2 text-xs text-[color:var(--tf-muted)]">
                  <span class="rounded-full border border-[color:var(--tf-border)] bg-[var(--tf-surface-2)] px-2.5 py-1">Company: {{ account.companyName || '—' }}</span>
                  <span class="rounded-full border border-[color:var(--tf-border)] bg-[var(--tf-surface-2)] px-2.5 py-1">Role: {{ account.roleName }}</span>
                  <span class="rounded-full border border-[color:var(--tf-border)] bg-[var(--tf-surface-2)] px-2.5 py-1">Attempts: {{ account.loginAttempts }}</span>
                </div>
                <div class="text-xs text-[color:var(--tf-muted)] mt-2">Blocked until {{ account.blockedUntil | date:'medium' }}</div>
              </div>
            </div>

            <div class="flex items-center gap-2 lg:justify-end">
              <button
                type="button"
                class="h-10 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                (click)="openUnblockModal(account)"
                [disabled]="actionLoading()"
              >
                <span *ngIf="actionLoadingId() === account.id" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                <svg *ngIf="actionLoadingId() !== account.id" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11V7a4 4 0 118 0v4m-4 4v4m-7-8h14a1 1 0 011 1v6a1 1 0 01-1 1H9a1 1 0 01-1-1v-6a1 1 0 011-1z"/>
                </svg>
                Unblock now
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="pendingUnblockAccount()" class="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
        <div class="w-[min(560px,96vw)] rounded-3xl border border-[color:var(--tf-border)] shadow-[0_30px_120px_rgba(0,0,0,.65)] overflow-hidden" style="background: var(--tf-card);">
          <div class="p-5 border-b border-[color:var(--tf-border)] flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 grid place-items-center shrink-0">
                <svg class="w-6 h-6 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.29 3.86l-8.5 14.72A2 2 0 003.5 21h17a2 2 0 001.71-2.42l-8.5-14.72a2 2 0 00-3.42 0z"/>
                </svg>
              </div>
              <div>
                <div class="text-xl font-bold">Débloquer ce compte ?</div>
                <div class="text-sm text-[color:var(--tf-muted)] mt-1">
                  {{ pendingUnblockAccount()!.firstName }} {{ pendingUnblockAccount()!.lastName }} • {{ pendingUnblockAccount()!.email }}
                </div>
              </div>
            </div>
            <button class="text-[color:var(--tf-muted)] hover:text-[color:var(--tf-on-surface)]" (click)="closeUnblockModal()" aria-label="Close modal">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-5 space-y-4">
            <div class="rounded-2xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-sm text-red-100">
              Ce compte est actuellement bloqué jusqu’à {{ pendingUnblockAccount()!.blockedUntil | date:'medium' }}.
              Le déblocage manuel réinitialisera aussi les tentatives de connexion.
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div class="rounded-xl border border-[color:var(--tf-border)] bg-[var(--tf-surface-2)] px-4 py-3">
                <div class="text-xs text-[color:var(--tf-muted)] uppercase tracking-wider">Entreprise</div>
                <div class="font-semibold mt-1">{{ pendingUnblockAccount()!.companyName || '—' }}</div>
              </div>
              <div class="rounded-xl border border-[color:var(--tf-border)] bg-[var(--tf-surface-2)] px-4 py-3">
                <div class="text-xs text-[color:var(--tf-muted)] uppercase tracking-wider">Temps restant</div>
                <div class="font-semibold mt-1">{{ remainingLabel(pendingUnblockAccount()!) }}</div>
              </div>
            </div>
          </div>

          <div class="p-5 pt-0 flex items-center justify-end gap-2">
            <button
              type="button"
              class="h-10 px-4 rounded-xl border border-[color:var(--tf-border)] bg-transparent text-[color:var(--tf-on-surface)] hover:bg-[var(--tf-surface-2)] text-sm"
              (click)="closeUnblockModal()"
              [disabled]="actionLoading()"
            >
              Annuler
            </button>
            <button
              type="button"
              class="h-10 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              (click)="confirmUnblock()"
              [disabled]="actionLoading()"
            >
              <span *ngIf="actionLoadingId() === pendingUnblockAccount()!.id" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
              Débloquer maintenant
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class BlockedAccountsComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private refreshTimer?: ReturnType<typeof setInterval>;

  blockedAccounts = signal<BlockedAccount[]>([]);
  loading = signal(false);
  actionLoading = signal(false);
  actionLoadingId = signal<string | null>(null);
  pendingUnblockAccount = signal<BlockedAccount | null>(null);
  toast = signal<null | { type: 'success' | 'error'; title: string; message: string }>(null);
  now = signal(Date.now());

  ngOnInit(): void {
    if (!this.auth.roles().includes('SUPER_ADMIN')) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.refresh();
    this.refreshTimer = setInterval(() => {
      this.now.set(Date.now());
      this.refreshSilently();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  refresh() {
    this.loading.set(true);
    this.auth.getBlockedAccounts().subscribe({
      next: (accounts) => {
        this.blockedAccounts.set(accounts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.set({ type: 'error', title: 'Error', message: 'Failed to load blocked accounts.' });
      },
    });
  }

  refreshSilently() {
    this.auth.getBlockedAccounts().subscribe({
      next: (accounts) => this.blockedAccounts.set(accounts),
      error: () => undefined,
    });
  }

  openUnblockModal(account: BlockedAccount) {
    this.pendingUnblockAccount.set(account);
  }

  closeUnblockModal() {
    if (this.actionLoading()) return;
    this.pendingUnblockAccount.set(null);
  }

  confirmUnblock() {
    const account = this.pendingUnblockAccount();
    if (!account) return;

    this.actionLoading.set(true);
    this.actionLoadingId.set(account.id);

    this.auth.unblockAccount(account.id).subscribe({
      next: (result) => {
        this.toast.set({
          type: 'success',
          title: 'Account unblocked',
          message: result?.message || `${account.email} has been unblocked.`,
        });
        this.actionLoading.set(false);
        this.actionLoadingId.set(null);
        this.pendingUnblockAccount.set(null);
        this.refresh();
        setTimeout(() => this.toast.set(null), 3000);
      },
      error: () => {
        this.actionLoading.set(false);
        this.actionLoadingId.set(null);
        this.toast.set({ type: 'error', title: 'Error', message: 'Failed to unblock account.' });
      },
    });
  }

  initials(account: BlockedAccount) {
    return `${account.firstName?.[0] || ''}${account.lastName?.[0] || ''}`.toUpperCase();
  }

  remainingMinutes(account: BlockedAccount) {
    const diff = new Date(account.blockedUntil).getTime() - this.now();
    return Math.max(0, Math.ceil(diff / 60000));
  }

  remainingLabel(account: BlockedAccount) {
    const minutes = this.remainingMinutes(account);
    if (minutes <= 1) return 'Less than 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  unlockingSoonCount() {
    return this.blockedAccounts().filter((account) => this.remainingMinutes(account) <= 10).length;
  }

  totalAttempts() {
    return this.blockedAccounts().reduce((sum, account) => sum + (account.loginAttempts || 0), 0);
  }

  trackById(_: number, account: BlockedAccount) {
    return account.id;
  }
}

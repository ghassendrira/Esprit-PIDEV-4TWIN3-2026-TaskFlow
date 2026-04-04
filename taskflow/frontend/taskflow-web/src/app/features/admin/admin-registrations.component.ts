import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

type PendingRegistration = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  companyCategory?: string | null;
  createdAt: string;
};

@Component({
  selector: 'tf-admin-registrations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-6 bg-[var(--tf-surface)] text-[color:var(--tf-on-surface)]">
      <!-- Toast -->
      <div
        *ngIf="toast()"
        class="fixed top-4 right-4 z-[60] w-[min(360px,92vw)]"
        role="status"
        aria-live="polite"
      >
        <div
          class="rounded-xl border px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur"
          style="background: var(--tf-card); border-color: var(--tf-border); color: var(--tf-on-surface);"
          [class.border-primary-500/40]="toast()!.type==='success'"
          [class.border-red-500/40]="toast()!.type==='error'"
          [class.bg-red-950/20]="toast()!.type==='error'"
        >
          <div class="flex items-start gap-3">
            <div class="mt-0.5">
              <svg *ngIf="toast()!.type==='success'" class="w-5 h-5 text-primary-600 dark:text-primary-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5"/>
              </svg>
              <svg *ngIf="toast()!.type==='error'" class="w-5 h-5 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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

      <!-- Page header -->
      <div class="rounded-2xl border border-[color:var(--tf-border)] p-5 shadow-card" style="background: var(--tf-card);">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-start gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 border border-primary-500/20 grid place-items-center">
              <svg class="w-6 h-6 text-primary-700 dark:text-primary-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4z"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-2xl font-bold">Pending Registrations</h1>
                <span class="inline-flex items-center rounded-full border border-[color:var(--tf-border)] bg-[var(--tf-surface-2)] px-2.5 py-1 text-xs text-[color:var(--tf-muted)]">
                  {{ pendingCount() }} Pending
                </span>
              </div>
              <p class="text-sm text-[color:var(--tf-muted)] mt-1">
                Review and manage new business owner registration requests
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="h-10 px-4 rounded-xl border border-[color:var(--tf-border)] hover:bg-[var(--tf-surface-2)] text-sm text-[color:var(--tf-on-surface)]"
              style="background: var(--tf-card);"
              (click)="refresh()"
              [disabled]="pageLoading()"
            >
              <span *ngIf="!pageLoading()" class="inline-flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-3-6.7M21 3v7h-7"/>
                </svg>
                Refresh
              </span>
              <span *ngIf="pageLoading()" class="inline-flex items-center gap-2">
                <span class="w-4 h-4 border-2 border-[color:var(--tf-muted)] border-t-[color:var(--tf-primary)] rounded-full animate-spin"></span>
                Loading
              </span>
            </button>
          </div>
        </div>

        <!-- Stats row -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div class="rounded-xl border border-[color:var(--tf-border)] p-4" style="background: var(--tf-surface-2);">
            <div class="text-xs text-[color:var(--tf-muted)]">Total Pending</div>
            <div class="text-2xl font-bold mt-1">{{ pendingCount() }}</div>
          </div>
          <div class="rounded-xl border border-[color:var(--tf-border)] p-4" style="background: var(--tf-surface-2);">
            <div class="text-xs text-[color:var(--tf-muted)]">Approved Today</div>
            <div class="text-2xl font-bold mt-1 text-primary-700 dark:text-primary-200">{{ approvedToday() }}</div>
          </div>
          <div class="rounded-xl border border-[color:var(--tf-border)] p-4" style="background: var(--tf-surface-2);">
            <div class="text-xs text-[color:var(--tf-muted)]">Rejected Today</div>
            <div class="text-2xl font-bold mt-1 text-red-300">{{ rejectedToday() }}</div>
          </div>
        </div>
      </div>

      <!-- Error banner -->
      <div *ngIf="error()" class="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
        {{ error() }}
      </div>

      <!-- Empty state -->
      <div
        *ngIf="!pageLoading() && pendingCount() === 0"
        class="mt-6 rounded-2xl border border-[color:var(--tf-border)] p-10 text-center shadow-card"
        style="background: var(--tf-card);"
      >
        <div class="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 border border-primary-500/20 grid place-items-center">
          <svg class="w-7 h-7 text-primary-700 dark:text-primary-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <div class="text-xl font-semibold mt-4">All caught up!</div>
        <div class="text-sm text-[color:var(--tf-muted)] mt-1">No pending registrations.</div>
      </div>

      <!-- Cards -->
      <div *ngIf="pendingCount() > 0" class="mt-6 grid grid-cols-1 gap-4">
        <div
          *ngFor="let u of registrations(); trackBy: trackById"
          class="group rounded-2xl border border-[color:var(--tf-border)] hover:border-primary-500/40 hover:shadow-[0_12px_50px_rgba(0,0,0,.35)] transition"
          style="background: var(--tf-card);"
        >
          <div class="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-start gap-4">
              <!-- Avatar -->
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-400/25 via-primary-600/20 to-primary-800/20 border border-primary-500/20 grid place-items-center shrink-0">
                <div class="font-bold text-[color:var(--tf-on-surface)]">{{ initials(u) }}</div>
              </div>

              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <div class="font-semibold text-lg truncate">{{ u.firstName }} {{ u.lastName }}</div>
                  <span *ngIf="u.companyCategory" class="inline-flex items-center rounded-full border border-[color:var(--tf-border)] bg-[var(--tf-surface-2)] px-2.5 py-1 text-xs text-[color:var(--tf-muted)]">
                    {{ u.companyCategory }}
                  </span>
                </div>
                <div class="text-sm text-[color:var(--tf-muted)] truncate">{{ u.email }}</div>
                <div class="text-sm text-[color:var(--tf-on-surface)] mt-1 flex items-center gap-2 truncate">
                  <svg class="w-4 h-4 text-[color:var(--tf-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21V7l9-4 9 4v14M9 21V9h6v12"/>
                  </svg>
                  <span class="truncate">{{ u.companyName || '—' }}</span>
                </div>
                <div class="text-xs text-[color:var(--tf-muted)] mt-2">
                  Requested {{ requestedAgo(u.createdAt) }}
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 sm:justify-end">
              <button
                type="button"
                class="h-10 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                (click)="approve(u)"
                [disabled]="actionLoading()"
              >
                <span *ngIf="actionLoadingUserId() === u.id && actionType() === 'approve'" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                <svg *ngIf="!(actionLoadingUserId() === u.id && actionType() === 'approve')" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5"/>
                </svg>
                Approve
              </button>
              <button
                type="button"
                class="h-10 px-4 rounded-xl border border-red-500/50 text-red-200 hover:bg-red-950/30 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                (click)="openReject(u)"
                [disabled]="actionLoading()"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Reject modal -->
      <div
        *ngIf="rejectingUser()"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      >
        <div class="w-[min(520px,96vw)] rounded-2xl border border-[color:var(--tf-border)] shadow-[0_30px_120px_rgba(0,0,0,.55)] overflow-hidden" style="background: var(--tf-card);">
          <div class="p-5 border-b border-[color:var(--tf-border)]">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-lg font-semibold">Reject Registration</div>
                <div class="text-sm text-[color:var(--tf-muted)] mt-1">
                  {{ rejectingUser()!.firstName }} {{ rejectingUser()!.lastName }} • {{ rejectingUser()!.email }}
                </div>
              </div>
              <button class="text-[color:var(--tf-muted)] hover:text-[color:var(--tf-on-surface)]" (click)="closeReject()" aria-label="Close">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="p-5">
            <label class="block text-sm text-[color:var(--tf-muted)] mb-2">Rejection reason <span class="text-red-300">*</span></label>
            <textarea
              [(ngModel)]="rejectReason"
              rows="4"
              class="w-full rounded-xl border border-[color:var(--tf-border)] px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              style="background: var(--tf-surface); color: var(--tf-on-surface);"
              placeholder="Please provide a reason..."
            ></textarea>
            <div *ngIf="rejectReasonTouched && !rejectReasonTrimmed()" class="text-xs text-red-300 mt-2">
              A rejection reason is required.
            </div>
          </div>

          <div class="p-5 pt-0 flex items-center justify-end gap-2">
            <button
              type="button"
              class="h-10 px-4 rounded-xl border border-[color:var(--tf-border)] bg-transparent text-[color:var(--tf-on-surface)] hover:bg-[var(--tf-surface-2)] text-sm"
              (click)="closeReject()"
              [disabled]="actionLoading()"
            >
              Cancel
            </button>
            <button
              type="button"
              class="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              (click)="confirmReject()"
              [disabled]="actionLoading()"
            >
              <span *ngIf="actionLoadingUserId() === rejectingUser()!.id && actionType() === 'reject'" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminRegistrationsComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  registrations = signal<PendingRegistration[]>([]);
  error = signal<string | null>(null);

  pageLoading = signal(false);
  actionLoadingUserId = signal<string | null>(null);
  actionType = signal<'approve' | 'reject' | null>(null);
  actionLoading = computed(() => !!this.actionLoadingUserId());

  approvedToday = signal(0);
  rejectedToday = signal(0);

  toast = signal<null | { type: 'success' | 'error'; title: string; message: string }>(null);

  rejectingUser = signal<PendingRegistration | null>(null);
  rejectReason = '';
  rejectReasonTouched = false;

  pendingCount = computed(() => this.registrations().length);

  ngOnInit() {
    // Only SUPER_ADMIN can access; redirect others
    if (!this.auth.roles().includes('SUPER_ADMIN')) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.load();
  }

  private load() {
    this.pageLoading.set(true);
    this.error.set(null);
    this.api.get<PendingRegistration[]>('/admin/registrations').subscribe({
      next: (list) => {
        this.registrations.set(list ?? []);
        this.pageLoading.set(false);
      },
      error: () => {
        this.pageLoading.set(false);
        this.error.set('Failed to load pending registrations.');
      },
    });
  }

  refresh() {
    this.load();
  }

  trackById(_: number, u: PendingRegistration) {
    return u.id;
  }

  initials(u: PendingRegistration): string {
    const f = (u.firstName || '').trim();
    const l = (u.lastName || '').trim();
    const a = f ? f[0] : '';
    const b = l ? l[0] : '';
    return (a + b).toUpperCase() || 'U';
  }

  requestedAgo(createdAt: string): string {
    const d = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (!Number.isFinite(diffMs)) return 'recently';
    const mins = Math.floor(diffMs / (60 * 1000));
    if (mins < 60) return mins <= 1 ? 'just now' : `${mins} minutes ago`;
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  private showToast(t: { type: 'success' | 'error'; title: string; message: string }) {
    this.toast.set(t);
    setTimeout(() => {
      // Only clear if it's still the same toast
      if (this.toast()?.title === t.title && this.toast()?.message === t.message) {
        this.toast.set(null);
      }
    }, 2500);
  }

  approve(u: PendingRegistration) {
    this.actionLoadingUserId.set(u.id);
    this.actionType.set('approve');
    this.error.set(null);
    this.api.post(`/admin/approve/${u.id}`, {}).subscribe({
      next: () => {
        this.registrations.set(this.registrations().filter((x) => x.id !== u.id));
        this.approvedToday.set(this.approvedToday() + 1);
        this.actionLoadingUserId.set(null);
        this.actionType.set(null);
        this.showToast({
          type: 'success',
          title: 'Approved',
          message: 'Registration approved successfully.',
        });
      },
      error: () => {
        this.actionLoadingUserId.set(null);
        this.actionType.set(null);
        this.showToast({
          type: 'error',
          title: 'Approval failed',
          message: 'Could not approve this registration.',
        });
      },
    });
  }

  openReject(u: PendingRegistration) {
    this.rejectingUser.set(u);
    this.rejectReason = '';
    this.rejectReasonTouched = false;
  }

  closeReject() {
    this.rejectingUser.set(null);
    this.rejectReason = '';
    this.rejectReasonTouched = false;
  }

  rejectReasonTrimmed(): string {
    return (this.rejectReason ?? '').trim();
  }

  confirmReject() {
    const u = this.rejectingUser();
    if (!u) return;
    this.rejectReasonTouched = true;
    if (!this.rejectReasonTrimmed()) return;

    this.actionLoadingUserId.set(u.id);
    this.actionType.set('reject');
    this.error.set(null);
    this.api.post(`/admin/reject/${u.id}`, { reason: this.rejectReasonTrimmed() }).subscribe({
      next: () => {
        this.registrations.set(this.registrations().filter((x) => x.id !== u.id));
        this.rejectedToday.set(this.rejectedToday() + 1);
        this.actionLoadingUserId.set(null);
        this.actionType.set(null);
        this.showToast({
          type: 'error',
          title: 'Rejected',
          message: 'Registration rejected.',
        });
        this.closeReject();
      },
      error: () => {
        this.actionLoadingUserId.set(null);
        this.actionType.set(null);
        this.showToast({
          type: 'error',
          title: 'Rejection failed',
          message: 'Could not reject this registration.',
        });
      },
    });
  }
}


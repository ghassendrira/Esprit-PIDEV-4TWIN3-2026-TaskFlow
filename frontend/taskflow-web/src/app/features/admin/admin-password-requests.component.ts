import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type PasswordResetRequest = {
  id: string;
  userId: string;
  requestedAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

@Component({
  selector: 'tf-admin-password-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-[calc(100vh-3rem)] p-6 bg-[#0a1f0a] text-white">
      <!-- Toast -->
      <div *ngIf="toast()" class="fixed top-4 right-4 z-[60] w-[min(360px,92vw)]" role="status">
        <div class="rounded-xl border px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur"
          [class.border-emerald-600/40]="toast()!.type==='success'"
          [class.bg-emerald-900/60]="toast()!.type==='success'"
          [class.border-red-500/40]="toast()!.type==='error'"
          [class.bg-red-950/50]="toast()!.type==='error'">
          <div class="flex items-start gap-3">
            <div class="mt-0.5">
              <svg *ngIf="toast()!.type==='success'" class="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5"/>
              </svg>
              <svg *ngIf="toast()!.type==='error'" class="w-5 h-5 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <div class="flex-1">
              <div class="font-semibold">{{ toast()!.title }}</div>
              <div class="text-sm text-[#86b29a] mt-0.5">{{ toast()!.message }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Page header -->
      <div class="rounded-2xl border border-emerald-700/30 bg-[#0d2418] p-5">
        <div class="flex items-start gap-3">
          <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-700/30 border border-emerald-600/30 grid place-items-center">
            <svg class="w-6 h-6 text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold">Password Recovery Requests</h1>
            <p class="text-sm text-[#86b29a] mt-1">Manual password reset requests from users</p>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading() && requests().length === 0" class="mt-6 rounded-2xl border border-emerald-700/30 bg-[#0d2418] p-10 text-center">
        <div class="text-xl font-semibold">No pending requests</div>
        <div class="text-sm text-[#86b29a] mt-1">All password recovery requests are processed.</div>
      </div>

      <!-- List -->
      <div *ngIf="requests().length > 0" class="mt-6 space-y-4">
        <div *ngFor="let r of requests()" class="rounded-2xl border border-emerald-700/30 bg-[#0d2418] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center shrink-0">
              <span class="font-bold text-emerald-400">{{ r.user.firstName[0] }}{{ r.user.lastName[0] }}</span>
            </div>
            <div>
              <div class="font-semibold text-lg">{{ r.user.firstName }} {{ r.user.lastName }}</div>
              <div class="text-sm text-[#86b29a]">{{ r.user.email }}</div>
              <div class="text-xs text-gray-500 mt-1">Requested {{ r.requestedAt | date:'medium' }}</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button (click)="approve(r)" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors flex items-center gap-2">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              Approve & Send New Password
            </button>
            <button (click)="reject(r)" class="px-4 py-2 rounded-xl border border-red-500/50 text-red-200 hover:bg-red-950/30 text-sm font-semibold transition-colors">
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminPasswordRequestsComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  requests = signal<PasswordResetRequest[]>([]);
  loading = signal(false);
  toast = signal<null | { type: 'success' | 'error'; title: string; message: string }>(null);

  ngOnInit() {
    if (!this.auth.roles().includes('SUPER_ADMIN')) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.load();
  }

  load() {
    this.loading.set(true);
    this.auth.getPasswordResetRequests().subscribe({
      next: (data) => {
        this.requests.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  approve(r: PasswordResetRequest) {
    if (!confirm(`Are you sure you want to reset password for ${r.user.email}? A new temporary password will be sent via email.`)) return;
    
    this.auth.approvePasswordReset(r.id).subscribe({
      next: () => {
        this.toast.set({ type: 'success', title: 'Approved', message: 'New password sent to user.' });
        this.load();
        setTimeout(() => this.toast.set(null), 3000);
      },
      error: () => this.toast.set({ type: 'error', title: 'Error', message: 'Failed to approve request.' })
    });
  }

  reject(r: PasswordResetRequest) {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;

    this.auth.rejectPasswordReset(r.id, reason || 'Manual request rejected by admin.').subscribe({
      next: () => {
        this.toast.set({ type: 'success', title: 'Rejected', message: 'User has been notified.' });
        this.load();
        setTimeout(() => this.toast.set(null), 3000);
      },
      error: () => this.toast.set({ type: 'error', title: 'Error', message: 'Failed to reject request.' })
    });
  }
}

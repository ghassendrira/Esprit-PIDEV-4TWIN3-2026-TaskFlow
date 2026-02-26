import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormControl, FormGroup, Validators, FormsModule } from '@angular/forms';
import { API_BASE_URL } from '../core/api';

type RegistrationRequest = {
  id: string;
  type: string;
  status: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  companyCategory?: string | null;
  requestedCompanyId?: string | null;
  requestedCompanyRole?: string | null;
  createdAt: string;
};

@Component({
  standalone: true,
  selector: 'app-admin-requests-page',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="admin-header">
      <h2>Admin - Registration Requests</h2>
      <div class="filter-group">
        <label for="status-filter">Filter by status:</label>
        <select id="status-filter" [(ngModel)]="selectedStatus" (ngModelChange)="load()">
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button (click)="load()" [disabled]="loading" class="refresh-btn">Refresh</button>
      </div>
    </div>

    <div *ngIf="error" class="error-msg">{{ error }}</div>

    <div *ngIf="loading && requests.length === 0" class="loading-state">Loading...</div>
    <div *ngIf="!loading && requests.length === 0" class="empty-state">No requests found for this status.</div>

    <ul class="request-list">
      <li *ngFor="let r of requests" class="request-item">
        <div class="request-info">
          <div class="request-main">
            <strong>{{ r.firstName }} {{ r.lastName }}</strong>
            <span class="email">({{ r.email }})</span>
            <span [class]="'status-badge ' + r.status.toLowerCase()">{{ r.status }}</span>
          </div>
          <div class="request-details">
            <div><strong>Type:</strong> {{ r.type }}</div>
            <div *ngIf="r.companyName"><strong>Company:</strong> {{ r.companyName }} ({{ r.companyCategory }})</div>
            <div *ngIf="r.requestedCompanyId"><strong>Company ID:</strong> {{ r.requestedCompanyId }} (role {{ r.requestedCompanyRole }})</div>
            <div class="date"><strong>Date:</strong> {{ r.createdAt | date:'short' }}</div>
          </div>
        </div>

        <div *ngIf="r.status === 'PENDING'" class="actions">
          <button (click)="approve(r.id)" [disabled]="loading" class="approve-btn">Approve</button>
          
          <form [formGroup]="rejectForms[r.id]" (ngSubmit)="reject(r.id)" class="reject-form">
            <input formControlName="reason" placeholder="Rejection reason" />
            <button type="submit" [disabled]="loading || rejectForms[r.id].invalid" class="reject-btn">Reject</button>
          </form>
        </div>
      </li>
    </ul>
  `,
  styles: [`
    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    select {
      padding: 8px;
      border-radius: 4px;
      border: 1px solid var(--border-color);
    }

    .request-list {
      list-style: none;
      padding: 0;
      display: grid;
      gap: 16px;
    }

    .request-item {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .request-main {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 1.1rem;
    }

    .email {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .status-badge {
      font-size: 0.75rem;
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      margin-left: auto;
    }

    .status-badge.pending { background: #fff3e0; color: #ef6c00; }
    .status-badge.approved { background: #e8f5e9; color: #2e7d32; }
    .status-badge.rejected { background: #ffebee; color: #c62828; }

    .request-details {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
      font-size: 0.9rem;
      color: #555;
    }

    .date {
      color: var(--text-muted);
    }

    .actions {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .approve-btn {
      background-color: #4caf50;
    }

    .reject-form {
      display: flex;
      gap: 8px;
      flex: 1;
      min-width: 250px;
    }

    .reject-btn {
      background-color: var(--error-color);
    }

    .error-msg {
      color: var(--error-color);
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .loading-state, .empty-state {
      text-align: center;
      padding: 48px;
      color: var(--text-muted);
      background: white;
      border-radius: 8px;
      border: 1px dashed var(--border-color);
    }
  `]
})
export class AdminRequestsPage {
  requests: RegistrationRequest[] = [];
  rejectForms: Record<string, FormGroup<{ reason: FormControl<string> }>> = {};
  loading = false;
  error = '';
  selectedStatus = 'PENDING';

  constructor(private readonly http: HttpClient) {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.http.get<RegistrationRequest[]>(`${API_BASE_URL}/admin/registration-requests?status=${this.selectedStatus}`).subscribe({
      next: (res) => {
        this.requests = res;
        this.rejectForms = {};
        for (const r of res) {
          if (r.status === 'PENDING') {
            this.rejectForms[r.id] = new FormGroup({
              reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
            });
          }
        }
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Failed to load requests';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  approve(id: string) {
    this.loading = true;
    this.error = '';
    this.http.post(`${API_BASE_URL}/admin/registration-requests/${id}/approve`, {}).subscribe({
      next: () => {
        this.selectedStatus = 'APPROVED';
        this.load();
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Approve failed';
        this.loading = false;
      }
    });
  }

  reject(id: string) {
    this.loading = true;
    this.error = '';
    const reason = this.rejectForms[id]?.getRawValue().reason;
    this.http.post(`${API_BASE_URL}/admin/registration-requests/${id}/reject`, { reason }).subscribe({
      next: () => {
        this.selectedStatus = 'REJECTED';
        this.load();
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Reject failed';
        this.loading = false;
      }
    });
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';

@Component({
  standalone: true,
  selector: 'app-invite-employee-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <h2>Create Employee Account Request</h2>
    <a routerLink="/companies">Back</a>

    <form [formGroup]="form" (ngSubmit)="submit()" style="display:grid; gap: 12px; max-width: 520px; margin-top: 12px;">
      <label> Email <input formControlName="email" type="email" /> </label>
      <label> First name <input formControlName="firstName" /> </label>
      <label> Last name <input formControlName="lastName" /> </label>
      <label>
        Role
        <select formControlName="role">
          <option value="EMPLOYEE">EMPLOYEE</option>
          <option value="FINANCE">FINANCE</option>
          <option value="VIEWER">VIEWER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </label>

      <button type="submit" [disabled]="form.invalid || loading">Submit request</button>
      <div *ngIf="requestId" style="color:#0a7a0a;">Created request: {{ requestId }}</div>
      <div *ngIf="error" style="color:#b00020;">{{ error }}</div>
    </form>
  `,
})
export class InviteEmployeePage {
  companyId: string;
  loading = false;
  error = '';
  requestId = '';

  form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    role: new FormControl('EMPLOYEE', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(private readonly http: HttpClient, route: ActivatedRoute) {
    this.companyId = route.snapshot.paramMap.get('companyId')!;
  }

  submit() {
    this.loading = true;
    this.error = '';
    this.requestId = '';
    const payload = this.form.getRawValue();

    this.http.post<any>(`${API_BASE_URL}/companies/${this.companyId}/user-requests`, payload).subscribe({
      next: (res) => {
        this.requestId = res.id;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Request failed';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}

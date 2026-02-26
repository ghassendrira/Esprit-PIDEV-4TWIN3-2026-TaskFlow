import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../core/api';
import { AuthService } from '../core/auth/auth.service';
import { LoginResponse } from '../core/auth/auth.types';

@Component({
  standalone: true,
  selector: 'app-change-password-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <h2>Change Password</h2>
    <p>Password must contain: 1 uppercase, 1 lowercase, 1 number.</p>

    <form [formGroup]="form" (ngSubmit)="submit()" style="display:grid; gap: 12px; max-width: 520px;">
      <label>
        Current password
        <input formControlName="currentPassword" type="password" />
      </label>
      <label>
        New password
        <input formControlName="newPassword" type="password" />
      </label>

      <button type="submit" [disabled]="form.invalid || loading">Change password</button>
      <div *ngIf="error" style="color: #b00020;">{{ error }}</div>
    </form>
  `,
})
export class ChangePasswordPage {
  loading = false;
  error = '';

  form = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  submit() {
    this.loading = true;
    this.error = '';
    const payload = this.form.getRawValue();

    this.http.post<LoginResponse>(`${API_BASE_URL}/auth/change-password`, payload).subscribe({
      next: (res) => {
        this.auth.setLogin(res);
        this.router.navigateByUrl('/companies');
      },
      error: (err) => {
        const msg = err?.error?.message;
        const errors = err?.error?.errors;
        this.error = Array.isArray(errors) ? errors.join(' | ') : (msg ?? 'Change password failed');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}

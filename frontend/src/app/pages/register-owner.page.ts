import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../core/api';

@Component({
  standalone: true,
  selector: 'app-register-owner-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <h2>Company Owner Registration</h2>
    <p>Submit your request. Platform admin will accept or reject.</p>

    <form [formGroup]="form" (ngSubmit)="submit()" style="display:grid; gap: 12px; max-width: 520px;">
      <label>
        Company name
        <input formControlName="companyName" />
      </label>
      <label>
        Company category
        <input formControlName="companyCategory" />
      </label>
      <label>
        Owner first name
        <input formControlName="firstName" />
      </label>
      <label>
        Owner last name
        <input formControlName="lastName" />
      </label>
      <label>
        Email
        <input formControlName="email" type="email" />
      </label>

      <button type="submit" [disabled]="form.invalid || loading">Submit registration</button>
      <div *ngIf="success" style="color: #0a7a0a;">Request submitted. Wait for admin decision.</div>
      <div *ngIf="error" style="color: #b00020;">{{ error }}</div>
    </form>
  `,
})
export class RegisterOwnerPage {
  loading = false;
  success = false;
  error = '';

  form = new FormGroup({
    companyName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    companyCategory: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  constructor(private readonly http: HttpClient) {}

  submit() {
    this.loading = true;
    this.success = false;
    this.error = '';
    const payload = this.form.getRawValue();

    this.http.post(`${API_BASE_URL}/registrations/company-owner`, payload).subscribe({
      next: () => {
        this.success = true;
        this.form.reset();
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Registration failed';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}

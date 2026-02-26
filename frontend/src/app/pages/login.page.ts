import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../core/api';
import { AuthService } from '../core/auth/auth.service';
import { LoginResponse } from '../core/auth/auth.types';
import { finalize } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-card">
      <h2>Login</h2>
      <form [formGroup]="form" (ngSubmit)="submit()" class="login-form">
        <label>
          Email
          <input formControlName="email" type="email" placeholder="votre@email.com" />
        </label>
        <label>
          Password
          <input formControlName="password" type="password" placeholder="******" />
        </label>
        
        <div class="forgot-password">
          <a routerLink="/forgot-password">Forgot password?</a>
        </div>

        <div *ngIf="error" class="error-box">
          {{ error }}
        </div>

        <button type="submit" [disabled]="form.invalid || loading" class="login-btn">
          {{ loading ? 'Connexion...' : 'Login' }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    .login-card {
      max-width: 400px;
      margin: 40px auto;
      padding: 32px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    h2 {
      text-align: center;
      margin-bottom: 24px;
    }

    .login-form {
      display: grid;
      gap: 16px;
    }

    .forgot-password {
      text-align: right;
      font-size: 0.85rem;
      margin-top: -8px;
    }

    .forgot-password a {
      color: var(--primary-color);
      text-decoration: none;
    }

    .error-box {
      color: white;
      background-color: var(--error-color);
      padding: 12px;
      border-radius: 4px;
      font-size: 0.9rem;
      text-align: center;
      animation: fadeIn 0.3s ease-in;
    }

    .login-btn {
      margin-top: 8px;
      height: 44px;
      font-size: 1rem;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class LoginPage {
  loading = false;
  error = '';

  form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  submit() {
    console.log('Login attempt started...');
    this.error = '';
    this.loading = true;
    const payload = this.form.getRawValue();

    this.http.post<LoginResponse>(`${API_BASE_URL}/auth/login`, payload).subscribe({
      next: (res) => {
        console.log('Login successful');
        this.loading = false;
        this.auth.setLogin(res);
        this.cdr.detectChanges();
        if (res.mustChangePassword) {
          this.router.navigateByUrl('/change-password');
        } else {
          this.router.navigateByUrl('/companies');
        }
      },
      error: (err) => {
        console.error('Detailed Login Error:', err);
        this.loading = false;
        
        // Extraction robuste du message d'erreur
        let errorMessage = 'Une erreur est survenue lors de la connexion.';
        
        if (err.status === 401) {
          errorMessage = 'Email ou mot de passe incorrect.';
        } else if (err.status === 403) {
          errorMessage = err.error?.message || err.message || 'Compte bloqué temporairement.';
        } else if (err.error?.message) {
          errorMessage = Array.isArray(err.error.message) ? err.error.message[0] : err.error.message;
        }

        this.error = errorMessage;
        console.log('Error message to display:', this.error);
        this.cdr.detectChanges();
      },
      complete: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}

import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../core/api';
import { finalize } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-forgot-password-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="recovery-card">
      <h2>Account Recovery</h2>
      
      <!-- Step 1: Enter Email -->
      <form *ngIf="step === 1" [formGroup]="emailForm" (ngSubmit)="fetchQuestions()" class="recovery-form">
        <p>Enter your email to retrieve your security questions.</p>
        <label>
          Email
          <input formControlName="email" type="email" placeholder="votre@email.com" />
        </label>
        <div *ngIf="error" class="error-msg">{{ error }}</div>
        <button type="submit" [disabled]="emailForm.invalid || loading" class="primary-btn">
          {{ loading ? 'Searching...' : 'Retrieve Questions' }}
        </button>
        <a routerLink="/login" class="back-link">Back to Login</a>
      </form>

      <!-- Step 2: Answer Questions -->
      <form *ngIf="step === 2" [formGroup]="answersForm" (ngSubmit)="verifyAnswers()" class="recovery-form">
        <p>Please answer your security questions to unlock your account.</p>
        
        <div formArrayName="answers">
          <div *ngFor="let control of answersArray.controls; let i = index" [formGroupName]="i" class="qa-group">
            <label>{{ questions[i] }}</label>
            <input formControlName="answer" type="password" placeholder="Your answer" />
          </div>
        </div>

        <div *ngIf="error" class="error-msg">{{ error }}</div>
        <button type="submit" [disabled]="answersForm.invalid || loading" class="primary-btn">
          {{ loading ? 'Verifying...' : 'Verify Answers' }}
        </button>
        <button type="button" (click)="step = 1" class="secondary-btn">Back</button>
      </form>

      <!-- Step 3: Reset Password -->
      <form *ngIf="step === 3" [formGroup]="resetForm" (ngSubmit)="resetPassword()" class="recovery-form">
        <p>Answers verified! Please set your new password. This will also unlock your account.</p>
        <label>
          New Password
          <input formControlName="newPassword" type="password" placeholder="******" />
        </label>
        <div *ngIf="error" class="error-msg">{{ error }}</div>
        <button type="submit" [disabled]="resetForm.invalid || loading" class="primary-btn">
          {{ loading ? 'Resetting...' : 'Reset Password & Unlock' }}
        </button>
      </form>

      <!-- Step 4: Success -->
      <div *ngIf="step === 4" class="success-state">
        <h3>Success!</h3>
        <p>Your password has been reset and your account is now unlocked.</p>
        <button routerLink="/login" class="primary-btn">Go to Login</button>
      </div>
    </div>
  `,
  styles: [`
    .recovery-card {
      max-width: 450px;
      margin: 60px auto;
      padding: 32px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    h2 { text-align: center; margin-bottom: 24px; color: var(--primary-color); }
    p { color: var(--text-muted); margin-bottom: 20px; line-height: 1.5; }

    .recovery-form { display: grid; gap: 16px; }
    .qa-group { margin-bottom: 16px; display: grid; gap: 8px; }
    .qa-group label { font-weight: 600; font-size: 0.9rem; }

    input {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
    }

    .primary-btn {
      background-color: var(--primary-color);
      color: white;
      border: none;
      padding: 12px;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
    }
    .primary-btn:disabled { opacity: 0.7; cursor: not-allowed; }

    .secondary-btn {
      background: none;
      border: 1px solid var(--border-color);
      padding: 10px;
      border-radius: 4px;
      cursor: pointer;
    }

    .error-msg {
      color: var(--error-color);
      background: #fff5f5;
      padding: 10px;
      border-radius: 4px;
      font-size: 0.85rem;
      border-left: 4px solid var(--error-color);
    }

    .back-link { text-align: center; font-size: 0.9rem; color: var(--primary-color); text-decoration: none; }
    .success-state { text-align: center; }
    .success-state h3 { color: #2e7d32; }
  `]
})
export class ForgotPasswordPage {
  step = 1;
  loading = false;
  error = '';
  questions: string[] = [];
  recoveryToken = '';

  emailForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] })
  });

  answersForm = new FormGroup({
    answers: new FormArray([])
  });

  resetForm = new FormGroup({
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] })
  });

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get answersArray() {
    return this.answersForm.get('answers') as FormArray;
  }

  fetchQuestions() {
    console.log('Fetching questions for:', this.emailForm.value.email);
    this.error = '';
    this.loading = true;
    this.cdr.detectChanges();
    
    const email = this.emailForm.getRawValue().email;

    this.http.post<{ questions: string[] }>(`${API_BASE_URL}/auth/recover/questions`, { email })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          console.log('Questions received:', res.questions);
          if (res.questions.length === 0) {
            this.error = "No security questions found for this email.";
            return;
          }
          this.questions = res.questions;
          this.answersArray.clear();
          res.questions.forEach(q => {
            this.answersArray.push(new FormGroup({
              question: new FormControl(q),
              answer: new FormControl('', Validators.required)
            }));
          });
          this.step = 2;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching questions:', err);
          this.error = err?.error?.message || "Failed to retrieve questions.";
        }
      });
  }

  verifyAnswers() {
    this.error = '';
    this.loading = true;
    this.cdr.detectChanges();
    
    const email = this.emailForm.getRawValue().email;
    const answers = this.answersForm.value.answers;

    this.http.post<{ recoveryToken: string }>(`${API_BASE_URL}/auth/recover/verify`, { email, answers })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.recoveryToken = res.recoveryToken;
          this.step = 3;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = "One or more answers are incorrect.";
        }
      });
  }

  resetPassword() {
    this.error = '';
    this.loading = true;
    this.cdr.detectChanges();
    
    const newPassword = this.resetForm.getRawValue().newPassword;

    this.http.post(`${API_BASE_URL}/auth/recover/reset`, { 
      recoveryToken: this.recoveryToken, 
      newPassword 
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.step = 4;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err?.error?.message || "Password reset failed.";
        }
      });
  }
}

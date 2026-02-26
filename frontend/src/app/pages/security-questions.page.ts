import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../core/api';
import { finalize } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-security-questions-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="security-card">
      <h2>Security Questions</h2>
      <p class="description">
        Configure your security questions. These will be used to recover your account 
        or unlock it if you forget your password.
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="security-form">
        <div formArrayName="qas">
          <div *ngFor="let qa of qas.controls; let i = index" [formGroupName]="i" class="qa-group">
            <div class="qa-header">
              <label>Question {{ i + 1 }}</label>
              <button type="button" class="remove-btn" (click)="removeQuestion(i)" *ngIf="qas.length > 1">
                Remove
              </button>
            </div>
            
            <select formControlName="question" class="question-select">
              <option value="" disabled selected>Select a question...</option>
              <option *ngFor="let q of predefinedQuestions" [value]="q">{{ q }}</option>
              <option value="custom">Custom question...</option>
            </select>

            <input 
              *ngIf="qa.get('question')?.value === 'custom' || !predefinedQuestions.includes(qa.get('question')?.value)"
              formControlName="customQuestion" 
              placeholder="Enter your custom question"
              class="custom-input"
            />

            <input formControlName="answer" type="password" placeholder="Your answer" class="answer-input" />
          </div>
        </div>

        <button type="button" class="add-btn" (click)="addQuestion()" [disabled]="qas.length >= 3">
          + Add another question
        </button>

        <div *ngIf="error" class="error-msg">{{ error }}</div>
        <div *ngIf="success" class="success-msg">{{ success }}</div>

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || loading" class="save-btn">
            {{ loading ? 'Saving...' : 'Save Security Questions' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .security-card {
      max-width: 600px;
      margin: 40px auto;
      padding: 32px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
    }

    h2 { margin-top: 0; }
    .description { color: var(--text-muted); margin-bottom: 24px; }

    .qa-group {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 6px;
      border: 1px solid #eee;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .qa-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .remove-btn {
      background: none;
      border: none;
      color: var(--error-color);
      font-size: 0.8rem;
      cursor: pointer;
      padding: 0;
    }

    .question-select, .answer-input, .custom-input {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
    }

    .add-btn {
      background: none;
      border: 1px dashed var(--border-color);
      width: 100%;
      padding: 12px;
      border-radius: 6px;
      cursor: pointer;
      color: var(--primary-color);
      margin-bottom: 24px;
    }

    .add-btn:hover { background: #f0f7ff; }
    .add-btn:disabled { color: #ccc; cursor: not-allowed; }

    .save-btn { width: 100%; height: 48px; font-weight: 600; }

    .error-msg {
      color: var(--error-color);
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
      margin-bottom: 16px;
      text-align: center;
    }

    .success-msg {
      color: #2e7d32;
      padding: 12px;
      background: #e8f5e9;
      border-radius: 4px;
      margin-bottom: 16px;
      text-align: center;
    }
  `]
})
export class SecurityQuestionsPage {
  loading = false;
  error = '';
  success = '';

  predefinedQuestions = [
    "What was the name of your first pet?",
    "In what city were you born?",
    "What is your mother's maiden name?",
    "What was the name of your elementary school?",
    "What was your first car?"
  ];

  form = new FormGroup({
    qas: new FormArray([this.createQaGroup()])
  });

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  get qas() {
    return this.form.get('qas') as FormArray;
  }

  createQaGroup() {
    return new FormGroup({
      question: new FormControl('', Validators.required),
      customQuestion: new FormControl(''),
      answer: new FormControl('', Validators.required)
    });
  }

  addQuestion() {
    if (this.qas.length < 3) {
      this.qas.push(this.createQaGroup());
    }
  }

  removeQuestion(index: number) {
    if (this.qas.length > 1) {
      this.qas.removeAt(index);
    }
  }

  submit() {
    this.error = '';
    this.success = '';
    this.loading = true;

    const rawData = this.form.value.qas || [];
    const formattedQas = rawData.map((item: any) => ({
      question: item.question === 'custom' ? item.customQuestion : item.question,
      answer: item.answer
    }));

    this.http.put(`${API_BASE_URL}/users/me/security-questions`, { qas: formattedQas })
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          this.success = 'Security questions updated successfully!';
          setTimeout(() => this.router.navigateByUrl('/companies'), 2000);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to update security questions.';
        }
      });
  }
}

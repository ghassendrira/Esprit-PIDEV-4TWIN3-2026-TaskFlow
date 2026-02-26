import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';

@Component({
  standalone: true,
  selector: 'app-company-edit-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <h2>Complete / Update Company Info</h2>
    <a routerLink="/companies">Back</a>

    <form [formGroup]="form" (ngSubmit)="save()" style="display:grid; gap: 12px; max-width: 520px; margin-top: 12px;">
      <label> Name <input formControlName="name" /> </label>
      <label> Category <input formControlName="category" /> </label>
      <label> Logo URL <input formControlName="logoUrl" /> </label>
      <label> Matricule <input formControlName="matricule" /> </label>
      <button type="submit" [disabled]="form.invalid || loading">Save</button>
      <div *ngIf="success" style="color:#0a7a0a;">Saved</div>
      <div *ngIf="error" style="color:#b00020;">{{ error }}</div>
    </form>
  `,
})
export class CompanyEditPage {
  loading = false;
  success = false;
  error = '';
  companyId: string;

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    logoUrl: new FormControl('', { nonNullable: true }),
    matricule: new FormControl('', { nonNullable: true }),
  });

  constructor(private readonly http: HttpClient, route: ActivatedRoute) {
    this.companyId = route.snapshot.paramMap.get('companyId')!;
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.http.get<any>(`${API_BASE_URL}/companies/${this.companyId}`).subscribe({
      next: (company) => {
        this.form.patchValue({
          name: company.name,
          category: company.category,
          logoUrl: company.logoUrl ?? '',
          matricule: company.matricule ?? '',
        });
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Failed to load company';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  save() {
    this.loading = true;
    this.success = false;
    this.error = '';
    const raw = this.form.getRawValue();
    const payload: any = {
      name: raw.name,
      category: raw.category,
      logoUrl: raw.logoUrl || undefined,
      matricule: raw.matricule || undefined,
    };

    this.http.patch(`${API_BASE_URL}/companies/${this.companyId}`, payload).subscribe({
      next: () => {
        this.success = true;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Save failed';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';
import { AuthService } from '../core/auth/auth.service';
import { LoginResponse } from '../core/auth/auth.types';

type Company = {
  id: string;
  name: string;
  category: string;
  logoUrl?: string | null;
  matricule?: string | null;
};

type Membership = {
  companyId: string;
  role: string;
  company: Company;
};

@Component({
  standalone: true,
  selector: 'app-companies-page',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <h2>Companies</h2>

    <button (click)="logout()" style="margin-bottom: 12px;">Logout</button>

    <section style="margin-bottom: 24px;" *ngIf="isOwner()">
      <h3>Create a new company</h3>
      <form [formGroup]="createForm" (ngSubmit)="createCompany()" style="display:grid; gap: 8px; max-width: 520px;">
        <label> Name <input formControlName="name" /> </label>
        <label> Category <input formControlName="category" /> </label>
        <label> Logo URL (optional) <input formControlName="logoUrl" /> </label>
        <label> Matricule (optional) <input formControlName="matricule" /> </label>
        <button type="submit" [disabled]="createForm.invalid || loading">Create</button>
      </form>
    </section>

    <section>
      <h3>Your companies</h3>
      <button (click)="load()" [disabled]="loading">Refresh</button>
      <div *ngIf="error" style="color:#b00020; margin-top: 8px;">{{ error }}</div>
      <ul>
        <li *ngFor="let m of memberships">
          <strong>{{ m.company.name }}</strong> ({{ m.role }})
          <button (click)="switchTo(m.companyId)" [disabled]="loading">Switch</button>
          <a *ngIf="m.role === 'OWNER'" [routerLink]="['/companies', m.companyId, 'edit']">Edit</a>
          <a *ngIf="m.role === 'OWNER'" [routerLink]="['/companies', m.companyId, 'invite']">Invite employee</a>
          <span *ngIf="auth.state().activeCompanyId === m.companyId"> (active)</span>
        </li>
      </ul>
    </section>
  `,
})
export class CompaniesPage {
  memberships: Membership[] = [];
  loading = false;
  error = '';

  createForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    logoUrl: new FormControl('', { nonNullable: true }),
    matricule: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private readonly http: HttpClient,
    readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.http.get<Membership[]>(`${API_BASE_URL}/companies`).subscribe({
      next: (res) => {
        this.memberships = res;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Failed to load companies';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  createCompany() {
    this.loading = true;
    this.error = '';
    const raw = this.createForm.getRawValue();
    const payload: any = {
      name: raw.name,
      category: raw.category,
      logoUrl: raw.logoUrl || undefined,
      matricule: raw.matricule || undefined,
    };
    this.http.post(`${API_BASE_URL}/companies`, payload).subscribe({
      next: () => {
        this.createForm.reset();
        this.load();
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Create company failed';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  switchTo(companyId: string) {
    this.loading = true;
    this.error = '';
    this.http.post<LoginResponse>(`${API_BASE_URL}/auth/switch-company`, { companyId }).subscribe({
      next: (res) => {
        this.auth.setLogin(res);
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'Switch company failed';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  logout() {
    this.auth.clear();
    this.router.navigateByUrl('/login');
  }
  isOwner(): boolean {
    // Affiche le bouton si l'utilisateur est OWNER d'au moins une société active
    return this.memberships.some(m => m.role === 'OWNER');
  }
}

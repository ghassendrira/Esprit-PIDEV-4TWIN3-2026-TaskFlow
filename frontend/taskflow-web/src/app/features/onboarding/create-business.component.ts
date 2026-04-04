import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { OnboardingService } from '../../core/services/onboarding.service';
import { OnboardingLayoutComponent } from './onboarding.layout';

@Component({
  selector: 'tf-create-business',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, OnboardingLayoutComponent],
  template: `
    <tf-onboarding-layout>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex-1 flex items-center justify-center gap-10">
            <div class="flex flex-col items-center">
              <div class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-black">✓</div>
              <div class="text-xs mt-1">Company Info</div>
            </div>
            <div class="h-[2px] w-24 bg-emerald-500"></div>
            <div class="flex flex-col items-center">
              <div class="w-6 h-6 rounded-full bg-emerald-500"></div>
              <div class="text-xs mt-1">Your Business</div>
            </div>
          </div>
        </div>

        <div class="text-center mb-4">
          <div class="text-3xl">💼</div>
          <div class="text-lg font-semibold mt-1">Create Your First Business</div>
          <div class="text-sm text-gray-300">You can add more businesses later from settings.</div>
        </div>

        <form class="space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div>
            <label class="block text-sm mb-1">Business Name <span class="text-red-500">*</span></label>
            <input formControlName="name" placeholder="e.g. Hasni Consulting" class="w-full h-11 rounded-xl bg-[#113a13] border border-transparent px-4 text-white outline-none" autofocus/>
          </div>
          <div>
            <label class="block text-sm mb-1">Currency <span class="text-red-500">*</span></label>
            <select formControlName="currency" class="w-full h-11 rounded-xl bg-[#113a13] border border-transparent px-4 text-white outline-none">
              <option value="TND">TND 🇹🇳</option>
              <option value="USD">USD 🇺🇸</option>
              <option value="EUR">EUR 🇪🇺</option>
              <option value="GBP">GBP 🇬🇧</option>
            </select>
            <div class="text-xs text-gray-400 mt-1">Auto-selected based on your country</div>
          </div>
          <div>
            <label class="block text-sm mb-1">Default Tax Rate (%) <span class="text-red-500">*</span></label>
            <input type="number" formControlName="taxRate" min="0" max="100" step="0.5" class="w-full h-11 rounded-xl bg-[#113a13] border border-transparent px-4 text-white outline-none"/>
          </div>
          <div>
            <label class="block text-sm mb-1">Business Logo URL</label>
            <input formControlName="logoUrl" placeholder="https://yourlogo.com/logo.png" class="w-full h-11 rounded-xl bg-[#113a13] border border-transparent px-4 text-white outline-none"/>
            <div class="text-xs text-gray-400 mt-1">Optional — you can add this later</div>
          </div>

          <div *ngIf="form.valid" class="mt-3 border border-emerald-600 rounded-xl p-3 bg-[#102810] text-sm">
            <div class="font-semibold mb-1">📋 Review Your Business</div>
            <div>Name: {{ form.value.name }}</div>
            <div>Currency: {{ form.value.currency }}</div>
            <div>Tax Rate: {{ form.value.taxRate }}%</div>
          </div>

          <button class="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50" [disabled]="form.invalid || saving">
            <span *ngIf="!saving">Create Business & Go to Dashboard</span>
            <span *ngIf="saving">Creating...</span>
          </button>

          <div *ngIf="errorMessage" class="text-red-400 text-sm">{{ errorMessage }}</div>
        </form>
      </div>
    </tf-onboarding-layout>
  `,
})
export class CreateBusinessComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private api = inject(OnboardingService);
  saving = false;
  errorMessage: string | null = null;
  form = this.fb.group({
    name: ['', Validators.required],
    currency: ['TND', Validators.required],
    taxRate: [19, Validators.required],
    logoUrl: [''],
  });
  ngOnInit() {
    try {
      const raw = localStorage.getItem('onboarding-country');
      if (raw) {
        const c = JSON.parse(raw) as { currency: string; taxRate: number };
        this.form.patchValue({ currency: c.currency, taxRate: c.taxRate });
      }
    } catch {}
  }
  onSubmit() {
    if (this.form.invalid) return;
    this.saving = true;
    const { name, logoUrl, currency, taxRate } = this.form.value;
    this.api.createBusiness({ name: name!, logoUrl: logoUrl!, currency: currency!, taxRate: Number(taxRate) }).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.saving = false;
        this.errorMessage = 'Failed to create business. Please try again.';
      }
    });
  }
}

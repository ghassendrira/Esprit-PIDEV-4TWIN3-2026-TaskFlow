import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { OnboardingService } from '../../core/services/onboarding.service';
import { OnboardingLayoutComponent } from './onboarding.layout';

type CountryOption = { label: string; value: string; currency: string; taxRate: number; emoji: string };

@Component({
  selector: 'tf-company-setup',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, OnboardingLayoutComponent],
  template: `
    <tf-onboarding-layout>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4 w-full">
            <div class="flex-1 flex items-center justify-center gap-10">
              <div class="flex flex-col items-center">
                <div class="w-6 h-6 rounded-full bg-emerald-500"></div>
                <div class="text-xs mt-1">Company Info</div>
              </div>
              <div class="h-[2px] w-24 bg-emerald-500"></div>
              <div class="flex flex-col items-center">
                <div class="w-6 h-6 rounded-full border border-gray-500"></div>
                <div class="text-xs mt-1 text-gray-300">Your Business</div>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mb-4">
          <div class="text-3xl">🏢</div>
          <div class="text-lg font-semibold mt-1">Complete Your Company Profile</div>
          <div class="text-sm text-gray-300">This info will appear on your invoices. Takes 1 minute.</div>
        </div>

        <form class="space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div>
            <label class="block text-sm mb-1">Company Name <span class="ml-1 text-gray-400 text-xs">Set during registration</span></label>
            <div class="relative">
              <input formControlName="name" readonly class="w-full h-11 rounded-xl bg-[#113a13] border border-transparent px-4 text-white outline-none"/>
              <span class="absolute right-3 top-1/2 -translate-y-1/2">🔒</span>
            </div>
          </div>
          <div>
            <label class="block text-sm mb-1">Address <span class="text-red-500">*</span></label>
            <textarea formControlName="address" rows="3" placeholder="123 Main Street, City..." class="w-full rounded-xl bg-[#113a13] border border-transparent px-4 py-2 text-white outline-none"></textarea>
            <div *ngIf="submitted && form.controls.address.invalid" class="text-red-400 text-xs mt-1">This field is required</div>
          </div>
          <div>
            <label class="block text-sm mb-1">Country <span class="text-red-500">*</span></label>
            <select formControlName="country" class="w-full h-11 rounded-xl bg-[#113a13] border border-transparent px-4 text-white outline-none">
              <option *ngFor="let c of countries" [value]="c.value">{{ c.emoji }} {{ c.label }}</option>
            </select>
            <div *ngIf="submitted && form.controls.country.invalid" class="text-red-400 text-xs mt-1">This field is required</div>
          </div>
          <div>
            <label class="block text-sm mb-1">Phone</label>
            <input formControlName="phone" placeholder="+216 XX XXX XXX" class="w-full h-11 rounded-xl bg-[#113a13] border border-transparent px-4 text-white outline-none"/>
          </div>
          
          <div>
            <label class="block text-sm mb-1">Logo URL <span class="text-red-500">*</span></label>
            <input formControlName="logoUrl" placeholder="https://yourlogo.com/logo.png" (blur)="previewLogo()" class="w-full h-11 rounded-xl bg-[#113a13] border border-transparent px-4 text-white outline-none"/>
            <div *ngIf="submitted && form.controls.logoUrl.invalid" class="text-red-400 text-xs mt-1">This field is required</div>
            <div class="mt-2">
              <img *ngIf="logoValid()" [src]="form.value.logoUrl" alt="logo" class="h-10 rounded bg-[#102810]"/>
              <div *ngIf="!logoValid()" class="text-xs text-gray-400">Invalid image URL</div>
            </div>
          </div>
          <button class="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50" [disabled]="form.invalid || saving">
            <span *ngIf="!saving">Save & Continue</span>
            <span *ngIf="saving">Saving...</span>
          </button>
          <div *ngIf="errorMessage()" class="text-red-400 text-sm">{{ errorMessage() }}</div>
        </form>
      </div>
    </tf-onboarding-layout>
  `,
})
export class CompanySetupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private api = inject(OnboardingService);
  saving = false;
  submitted = false;
  errorMessage = signal<string | null>(null);
  countries: CountryOption[] = [
    { label: 'Tunisia', value: 'TN', currency: 'TND', taxRate: 19, emoji: '🇹🇳' },
    { label: 'France', value: 'FR', currency: 'EUR', taxRate: 20, emoji: '🇫🇷' },
    { label: 'United States', value: 'US', currency: 'USD', taxRate: 0, emoji: '🇺🇸' },
    { label: 'United Kingdom', value: 'UK', currency: 'GBP', taxRate: 20, emoji: '🇬🇧' },
    { label: 'Germany', value: 'DE', currency: 'EUR', taxRate: 19, emoji: '🇩🇪' },
    { label: 'Other', value: 'OTHER', currency: 'USD', taxRate: 0, emoji: '🌍' },
  ];
  form = this.fb.group({
    name: [{ value: '', disabled: true }],
    address: ['', Validators.required],
    country: ['TN', Validators.required],
    phone: [''],
    
    logoUrl: ['', Validators.required],
  });
  ngOnInit() {}
  logoValid(): boolean {
    const v = (this.form.value.logoUrl as string) || '';
    return /^https?:\/\/.+\.(png|jpg|jpeg|gif|svg)$/i.test(v);
  }
  previewLogo() {}
  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving = true;
    const { address, country, phone, logoUrl } = this.form.value;
    this.api.companySetup({ address: address!, country: country!, phone: phone!, logoUrl: logoUrl! }).subscribe({
      next: () => {
        this.saving = false;
        const sel = this.countries.find(c => c.value === country)!;
        localStorage.setItem('onboarding-country', JSON.stringify(sel));
        this.router.navigate(['/onboarding/create-business']);
      },
      error: () => {
        this.saving = false;
        this.errorMessage.set('Failed to save. Please try again.');
      }
    });
  }
}

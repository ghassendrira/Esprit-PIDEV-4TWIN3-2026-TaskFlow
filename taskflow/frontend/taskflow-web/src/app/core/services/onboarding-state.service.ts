import { Injectable, inject, signal } from '@angular/core';
import { OnboardingService } from './onboarding.service';

@Injectable({ providedIn: 'root' })
export class OnboardingStateService {
  private api = inject(OnboardingService);
  companySetupDone = signal<boolean>(false);

  checkStatus() {
    this.api.status().subscribe({
      next: (s) => this.companySetupDone.set(!!(s as any)?.isSetupCompleted),
      error: () => {},
    });
  }
}

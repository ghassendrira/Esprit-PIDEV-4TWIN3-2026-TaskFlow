import { Injectable, signal } from '@angular/core';

const ACTIVE_EMPLOYEE_KEY = 'activeEmployeeUserId';

@Injectable({ providedIn: 'root' })
export class EmployeeSelectionService {
  private selectedEmployeeIdSig = signal<string>(
    localStorage.getItem(ACTIVE_EMPLOYEE_KEY) || '',
  );

  selectedEmployeeId() {
    return this.selectedEmployeeIdSig();
  }

  setSelectedEmployeeId(value: string) {
    const clean = String(value ?? '').trim();
    this.selectedEmployeeIdSig.set(clean);

    if (clean) {
      localStorage.setItem(ACTIVE_EMPLOYEE_KEY, clean);
    } else {
      localStorage.removeItem(ACTIVE_EMPLOYEE_KEY);
    }
  }
}

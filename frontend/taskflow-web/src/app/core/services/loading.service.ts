import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pendingCount = signal(0);

  readonly isLoading = computed(() => this.pendingCount() > 0);

  begin() {
    setTimeout(() => {
      this.pendingCount.update((value) => value + 1);
    });
  }

  end() {
    setTimeout(() => {
      this.pendingCount.update((value) => Math.max(0, value - 1));
    });
  }
}
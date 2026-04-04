import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'taskflow-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<ThemeMode>('light');
  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  init(): void {
    const initial = this.getInitialMode();
    this.setMode(initial, false);
  }

  toggle(): void {
    this.setMode(this._mode() === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode, persist = true): void {
    this._mode.set(mode);
    this.applyToDocument(mode);

    if (persist && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {}
    }
  }

  private getInitialMode(): ThemeMode {
    if (typeof window === 'undefined') return 'light';

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}

    try {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  private applyToDocument(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;

    const el = document.documentElement;
    el.setAttribute('data-theme', mode);

    if (mode === 'dark') el.classList.add('dark');
    else el.classList.remove('dark');
  }
}

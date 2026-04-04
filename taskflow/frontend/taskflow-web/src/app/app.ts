import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="app-shell">
      <router-outlet></router-outlet>

      <div *ngIf="isLoading()" class="loading-overlay" aria-live="polite" aria-busy="true">
        <div class="loading-card">
          <div class="spinner"></div>
          <div>
            <div class="loading-title">Chargement</div>
            <div class="loading-subtitle">Veuillez patienter pendant le traitement.</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .app-shell {
      min-height: 100vh;
      position: relative;
    }

    .loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(4, 12, 24, 0.58);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .loading-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 22px;
      border-radius: 18px;
      background: rgba(18, 24, 40, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      color: #fff;
      min-width: 280px;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border-radius: 9999px;
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-top-color: #7c8cff;
      animation: spin 0.85s linear infinite;
      flex: 0 0 auto;
    }

    .loading-title {
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .loading-subtitle {
      font-size: 0.92rem;
      color: rgba(255, 255, 255, 0.75);
      margin-top: 3px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class App {
  private theme = inject(ThemeService);
  private loading = inject(LoadingService);
  protected readonly title = signal('taskflow-web');
  protected readonly isLoading = computed(() => this.loading.isLoading());

  constructor() {
    this.theme.init();
  }
}

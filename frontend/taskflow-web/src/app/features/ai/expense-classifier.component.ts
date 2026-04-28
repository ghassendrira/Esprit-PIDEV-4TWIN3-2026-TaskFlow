import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { TranslatePipe } from '../../shared/pipes/t.pipe';

type AiModelSnapshot = {
  modelName: string;
  trainedAt: string;
  trainingExamples: number;
  vocabularySize: number;
  labels: string[];
  trainingAccuracy: number;
};

type AiPrediction = {
  input: string;
  label: string;
  confidence: number;
  scores: Array<{ label: string; score: number; probability: number }>;
  matchedTokens: string[];
};

@Component({
  selector: 'tf-expense-classifier',
  standalone: true,
  imports: [CommonModule, TfCardComponent, TranslatePipe],
  template: `
    <header class="ai-header">
      <div>
        <h1 class="ai-title">{{ 'ai.title' | t }}</h1>
        <p class="ai-subtitle">{{ 'ai.subtitle' | t }}</p>
      </div>
      <div class="ai-pill" *ngIf="model() as currentModel; else loadingModel">
        <span class="dot"></span>
        <span>{{ currentModel.modelName }}</span>
      </div>
      <ng-template #loadingModel>
        <div class="ai-pill">
          <span class="dot pulse"></span>
          <span>{{ 'common.loading' | t }}</span>
        </div>
      </ng-template>
    </header>

    <section class="ai-grid">
      <tf-card class="panel form-panel">
        <div class="panel-title">{{ 'ai.input-label' | t }}</div>
        <textarea
          class="classifier-input"
          [value]="text()"
          [placeholder]="'ai.input-placeholder' | t"
          (input)="onInput($any($event.target).value)"
        ></textarea>
        <div class="actions">
          <button class="primary-btn" type="button" [disabled]="loading()" (click)="classify()">
            {{ loading() ? ('common.loading' | t) : ('ai.predict' | t) }}
          </button>
          <button class="ghost-btn" type="button" [disabled]="retraining()" (click)="retrain()">
            {{ retraining() ? ('common.loading' | t) : ('ai.retrain' | t) }}
          </button>
        </div>
      </tf-card>

      <tf-card class="panel result-panel">
        <div class="panel-title">{{ 'ai.top-label' | t }}</div>
        <ng-container *ngIf="prediction() as currentPrediction; else emptyState">
          <div class="prediction-label">{{ currentPrediction.label }}</div>
          <div class="metric-row">
            <span>{{ 'ai.confidence' | t }}</span>
            <strong>{{ (currentPrediction.confidence * 100) | number:'1.0-1' }}%</strong>
          </div>
          <div class="metric-row">
            <span>{{ 'ai.matched-tokens' | t }}</span>
            <strong>{{ currentPrediction.matchedTokens.length }}</strong>
          </div>
          <div class="token-list" *ngIf="currentPrediction.matchedTokens.length">
            <span class="token" *ngFor="let token of currentPrediction.matchedTokens">{{ token }}</span>
          </div>
          <div class="score-list">
            <div class="score-item" *ngFor="let score of currentPrediction.scores.slice(0, 5)">
              <span>{{ score.label }}</span>
              <strong>{{ (score.probability * 100) | number:'1.0-1' }}%</strong>
            </div>
          </div>
        </ng-container>
        <ng-template #emptyState>
          <p class="muted">{{ 'ai.no-result' | t }}</p>
        </ng-template>
      </tf-card>
    </section>

    <tf-card class="panel model-panel">
      <div class="panel-title">{{ 'ai.model-card' | t }}</div>
      <ng-container *ngIf="model() as currentModel; else modelError">
        <div class="stats-grid">
          <div class="stat"><span>{{ 'ai.training-examples' | t }}</span><strong>{{ currentModel.trainingExamples }}</strong></div>
          <div class="stat"><span>{{ 'ai.vocabulary' | t }}</span><strong>{{ currentModel.vocabularySize }}</strong></div>
          <div class="stat"><span>{{ 'ai.training-accuracy' | t }}</span><strong>{{ (currentModel.trainingAccuracy * 100) | number:'1.0-1' }}%</strong></div>
          <div class="stat"><span>Labels</span><strong>{{ currentModel.labels.length }}</strong></div>
        </div>
        <div class="labels-wrap">
          <span class="label-chip" *ngFor="let label of currentModel.labels">{{ label }}</span>
        </div>
      </ng-container>
      <ng-template #modelError>
        <p class="muted">{{ 'ai.load-error' | t }}</p>
      </ng-template>
    </tf-card>
  `,
  styles: [`
    :host { display: block; }
    .ai-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .ai-title { margin: 0; font-size: 24px; line-height: 1.15; letter-spacing: -0.03em; }
    .ai-subtitle { margin: 6px 0 0; color: var(--tf-muted); font-size: 13px; }
    .ai-pill { display: inline-flex; align-items: center; gap: 10px; height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--tf-border); background: var(--tf-card); color: var(--tf-muted); font-size: 12px; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--tf-primary); }
    .pulse { animation: pulse 1.2s ease-in-out infinite; }
    .ai-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 12px; }
    .panel { min-height: 100%; }
    .panel-title { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--tf-muted); margin-bottom: 12px; }
    .classifier-input { width: 100%; min-height: 180px; resize: vertical; border-radius: 16px; border: 1px solid var(--tf-border); background: var(--tf-surface); color: var(--tf-on-surface); padding: 14px; font: inherit; outline: none; }
    .classifier-input:focus { border-color: var(--tf-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--tf-primary) 14%, transparent); }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .primary-btn, .ghost-btn { border: 1px solid var(--tf-border); border-radius: 999px; height: 40px; padding: 0 16px; font-weight: 700; cursor: pointer; transition: transform .15s ease, border-color .15s ease, background .15s ease; }
    .primary-btn { background: var(--tf-primary); color: white; border-color: var(--tf-primary); }
    .ghost-btn { background: transparent; color: var(--tf-on-surface); }
    .primary-btn:hover, .ghost-btn:hover { transform: translateY(-1px); }
    .primary-btn:disabled, .ghost-btn:disabled { opacity: .65; cursor: wait; transform: none; }
    .result-panel { display: grid; gap: 12px; }
    .prediction-label { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; }
    .metric-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--tf-surface-2); color: var(--tf-muted); }
    .metric-row strong { color: var(--tf-on-surface); }
    .token-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .token, .label-chip { display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--tf-border); background: var(--tf-surface-2); color: var(--tf-on-surface); font-size: 12px; }
    .score-list { display: grid; gap: 8px; }
    .score-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--tf-surface); }
    .muted { color: var(--tf-muted); margin: 0; }
    .model-panel { margin-top: 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .stat { padding: 12px; border-radius: 12px; background: var(--tf-surface-2); display: grid; gap: 6px; }
    .stat span { color: var(--tf-muted); font-size: 12px; }
    .stat strong { font-size: 18px; }
    .labels-wrap { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    @keyframes pulse { 0%, 100% { opacity: .35; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.05); } }
    @media (max-width: 900px) {
      .ai-header { align-items: flex-start; flex-direction: column; }
      .ai-grid, .stats-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class ExpenseClassifierComponent implements OnInit {
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);

  text = signal('');
  loading = signal(false);
  retraining = signal(false);
  model = signal<AiModelSnapshot | null>(null);
  prediction = signal<AiPrediction | null>(null);

  ngOnInit(): void {
    this.api
      .get<AiModelSnapshot>('/ai/model')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => this.model.set(snapshot),
        error: () => this.model.set(null),
      });
  }

  onInput(value: string): void {
    this.text.set(value);
  }

  classify(): void {
    const value = this.text().trim();
    if (!value) {
      this.prediction.set(null);
      return;
    }

    this.loading.set(true);
    this.api
      .post<AiPrediction>('/ai/expense-classifier/predict', { text: value })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => this.prediction.set(result),
        error: () => this.prediction.set(null),
      });
  }

  retrain(): void {
    this.retraining.set(true);
    this.api
      .post<AiModelSnapshot>('/ai/expense-classifier/train', {})
      .pipe(
        finalize(() => this.retraining.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (snapshot) => this.model.set(snapshot),
        error: () => this.model.set(null),
      });
  }
}
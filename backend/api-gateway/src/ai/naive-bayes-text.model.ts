import { LabeledExample, ModelSnapshot, PredictionResult, PredictionScore } from './ai.types';

const STOP_WORDS = new Set([
  'a',
  'about',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'by',
  'de',
  'des',
  'du',
  'en',
  'et',
  'for',
  'from',
  'had',
  'has',
  'have',
  'in',
  'is',
  'it',
  'la',
  'le',
  'les',
  'of',
  'on',
  'or',
  'our',
  'pour',
  'que',
  'the',
  'to',
  'un',
  'une',
  'with',
  'your',
]);

export class NaiveBayesTextModel {
  private labelCounts = new Map<string, number>();
  private labelTokenCounts = new Map<string, number>();
  private tokenCountsByLabel = new Map<string, Map<string, number>>();
  private vocabulary = new Set<string>();
  private lastTrainingSize = 0;

  train(examples: LabeledExample[]): void {
    this.labelCounts.clear();
    this.labelTokenCounts.clear();
    this.tokenCountsByLabel.clear();
    this.vocabulary.clear();
    this.lastTrainingSize = examples.length;

    for (const example of examples) {
      const label = this.normalizeLabel(example.label);
      const tokens = this.tokenize(example.text);

      this.labelCounts.set(label, (this.labelCounts.get(label) ?? 0) + 1);
      this.labelTokenCounts.set(label, (this.labelTokenCounts.get(label) ?? 0) + tokens.length);

      let tokenCounts = this.tokenCountsByLabel.get(label);
      if (!tokenCounts) {
        tokenCounts = new Map<string, number>();
        this.tokenCountsByLabel.set(label, tokenCounts);
      }

      for (const token of tokens) {
        this.vocabulary.add(token);
        tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
      }
    }
  }

  predict(text: string): PredictionResult {
    const tokens = this.tokenize(text);
    const tokenFrequency = this.frequencyMap(tokens);
    const labels = this.getLabels();

    if (labels.length === 0) {
      throw new Error('Model has not been trained yet');
    }

    const logScores = labels.map((label) => ({ label, score: this.scoreLabel(label, tokenFrequency) }));
    const probabilities = this.softmax(logScores.map((entry) => entry.score));
    const ranked: PredictionScore[] = logScores
      .map((entry, index) => ({
        label: entry.label,
        score: entry.score,
        probability: probabilities[index],
      }))
      .sort((left, right) => right.probability - left.probability);

    const best = ranked[0];

    return {
      input: text,
      label: best.label,
      confidence: best.probability,
      scores: ranked,
      matchedTokens: tokens.filter((token) => this.vocabulary.has(token)),
    };
  }

  evaluate(examples: LabeledExample[]): number {
    if (examples.length === 0) return 0;

    let correct = 0;
    for (const example of examples) {
      const prediction = this.predict(example.text);
      if (prediction.label === this.normalizeLabel(example.label)) {
        correct += 1;
      }
    }

    return correct / examples.length;
  }

  snapshot(trainingAccuracy: number): ModelSnapshot {
    return {
      modelName: 'taskflow-expense-naive-bayes',
      trainedAt: new Date().toISOString(),
      trainingExamples: this.lastTrainingSize,
      vocabularySize: this.vocabulary.size,
      labels: this.getLabels(),
      trainingAccuracy,
    };
  }

  private scoreLabel(label: string, tokenFrequency: Map<string, number>): number {
    const classCount = this.labelCounts.get(label) ?? 0;
    const totalExamples = Array.from(this.labelCounts.values()).reduce((sum, value) => sum + value, 0);
    const prior = Math.log((classCount + 1) / (totalExamples + this.labelCounts.size));
    const tokenCounts = this.tokenCountsByLabel.get(label) ?? new Map<string, number>();
    const totalTokens = this.labelTokenCounts.get(label) ?? 0;
    const vocabularySize = Math.max(this.vocabulary.size, 1);

    let score = prior;
    for (const [token, count] of tokenFrequency.entries()) {
      const tokenCount = tokenCounts.get(token) ?? 0;
      const likelihood = (tokenCount + 1) / (totalTokens + vocabularySize);
      score += count * Math.log(likelihood);
    }

    return score;
  }

  private getLabels(): string[] {
    return Array.from(this.labelCounts.keys()).sort((left, right) => left.localeCompare(right));
  }

  private tokenize(text: string): string[] {
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ' ')
      .replace(/['’]/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    if (!normalized) return [];

    return normalized
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  }

  private normalizeLabel(label: string): string {
    return label.trim().toLowerCase();
  }

  private frequencyMap(tokens: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    return counts;
  }

  private softmax(values: number[]): number[] {
    if (values.length === 0) return [];

    const max = Math.max(...values);
    const exps = values.map((value) => Math.exp(value - max));
    const total = exps.reduce((sum, value) => sum + value, 0);
    return exps.map((value) => value / total);
  }
}
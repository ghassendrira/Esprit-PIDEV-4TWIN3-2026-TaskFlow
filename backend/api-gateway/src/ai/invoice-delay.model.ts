// Décrit les caractéristiques d'une facture pour la prédiction de retard
export interface InvoiceDelayFeatures {
  amount: number; // Montant de la facture
  dueDays: number; // Nombre de jours avant échéance
  clientLateRatio: number; // Ratio de retard du client
  previousLateCount: number; // Nombre de retards précédents
  openInvoiceCount: number; // Nombre de factures ouvertes
  overdueInvoiceCount: number; // Nombre de factures en retard
}

// Exemple d'entraînement pour le modèle de retard de facture
export interface InvoiceDelayExample {
  features: InvoiceDelayFeatures; // Caractéristiques de la facture
  late: boolean; // Statut de retard
}

// Type pour l'étiquette de risque de retard
export type InvoiceDelayRiskLabel = 'late' | 'on_time';
// Type pour le niveau de risque
export type InvoiceDelayRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

// Score de prédiction pour le risque de retard
export interface InvoiceDelayPredictionScore {
  label: InvoiceDelayRiskLabel; // Étiquette prédite
  score: number; // Score brut
  probability: number; // Probabilité
}

// Résultat de la prédiction de retard de facture
export interface InvoiceDelayPredictionResult {
  input: InvoiceDelayFeatures; // Entrée
  label: InvoiceDelayRiskLabel; // Étiquette prédite
  riskProbability: number; // Probabilité de risque
  riskLevel: InvoiceDelayRiskLevel; // Niveau de risque
  confidence: number; // Confiance
  scores: InvoiceDelayPredictionScore[]; // Détail des scores
}

// Snapshot du modèle de retard de facture
export interface InvoiceDelayModelSnapshot {
  modelName: string; // Nom du modèle
  trainedAt: string; // Date d'entraînement
  trainingExamples: number; // Nombre d'exemples
  featureCount: number; // Nombre de features
  trainingAccuracy: number; // Précision
  weights?: number[]; // Poids du modèle
  means?: number[]; // Moyennes
  stds?: number[]; // Écarts-types
  intercept?: number; // Intercept
}

// Liste des noms de features utilisées par le modèle
const FEATURE_NAMES: Array<keyof InvoiceDelayFeatures> = [
  'amount',
  'dueDays',
  'clientLateRatio',
  'previousLateCount',
  'openInvoiceCount',
  'overdueInvoiceCount',
];

// Classe du modèle de risque de retard de facture
export class InvoiceDelayRiskModel {
  private weights: number[] = []; // Poids du modèle
  private means: number[] = []; // Moyennes des features
  private stds: number[] = []; // Écarts-types des features
  private lastTrainingSize = 0; // Taille du dernier entraînement

  // Fonction d'entraînement du modèle
  train(examples: InvoiceDelayExample[]): void {
    //
    // Ce fichier définit les types et la classe du modèle pour la prédiction du risque de retard de paiement des factures.
    // Il structure les données d'entrée, les résultats de prédiction et le modèle utilisé pour l'entraînement et l'inférence.
    if (!examples.length) {
      throw new Error('Training dataset cannot be empty');
    }

    this.lastTrainingSize = examples.length;
    const rawVectors = examples.map((example) => this.toVector(example.features));
    this.means = this.computeMeans(rawVectors);
    this.stds = this.computeStds(rawVectors, this.means);
    const normalized = rawVectors.map((vector) => this.normalizeVector(vector));

    const featureCount = FEATURE_NAMES.length;
    this.weights = new Array(featureCount + 1).fill(0);

    const epochs = 1000;
    const learningRate = 0.1;
    const regularization = 0.1;

    for (let epoch = 0; epoch < epochs; epoch += 1) {
      for (let index = 0; index < normalized.length; index += 1) {
        const x = [1, ...normalized[index]];
        const y = examples[index].late ? 1 : 0;
        const probability = this.sigmoid(this.dot(this.weights, x));
        const error = probability - y;

        this.weights[0] -= learningRate * error;
        for (let featureIndex = 1; featureIndex < this.weights.length; featureIndex += 1) {
          const gradient = error * x[featureIndex] + regularization * this.weights[featureIndex];
          this.weights[featureIndex] -= learningRate * gradient;
        }
      }
    }
  }

  predict(features: InvoiceDelayFeatures): InvoiceDelayPredictionResult {
    if (!this.weights.length || !this.means.length || !this.stds.length) {
      throw new Error('Model has not been trained yet');
    }

    const vector = this.normalizeVector(this.toVector(features));
    const score = this.dot(this.weights, [1, ...vector]);
    const lateProbability = this.sigmoid(score);

    console.log(`[Model Debug] Features: ${JSON.stringify(features)}`);
    console.log(`[Model Debug] Vector: ${JSON.stringify(this.toVector(features))}`);
    console.log(`[Model Debug] Normalized: ${JSON.stringify(vector)}`);
    console.log(`[Model Debug] Score: ${score}`);
    console.log(`[Model Debug] Probability: ${lateProbability}`);
    const onTimeProbability = 1 - lateProbability;
    const label: InvoiceDelayRiskLabel = lateProbability >= 0.5 ? 'late' : 'on_time';

    const scores: InvoiceDelayPredictionScore[] = [
      { label: 'late', score, probability: lateProbability },
      { label: 'on_time', score: -score, probability: onTimeProbability },
    ].sort((left, right) => right.probability - left.probability) as InvoiceDelayPredictionScore[];

    return {
      input: features,
      label,
      riskProbability: lateProbability,
      riskLevel: this.getRiskLevel(lateProbability),
      confidence: Math.max(lateProbability, onTimeProbability),
      scores,
    };
  }

  evaluate(examples: InvoiceDelayExample[]): number {
    if (!examples.length) return 0;

    let correct = 0;
    for (const example of examples) {
      const prediction = this.predict(example.features);
      if ((prediction.label === 'late') === example.late) {
        correct += 1;
      }
    }

    return correct / examples.length;
  }

  snapshot(trainingAccuracy: number): InvoiceDelayModelSnapshot {
    return {
      modelName: 'taskflow-invoice-delay-risk',
      trainedAt: new Date().toISOString(),
      trainingExamples: this.lastTrainingSize,
      featureCount: FEATURE_NAMES.length,
      trainingAccuracy,
      weights: [...this.weights.slice(1)],
      means: [...this.means],
      stds: [...this.stds],
      intercept: this.weights[0],
    };
  }

  private toVector(features: InvoiceDelayFeatures): number[] {
    const amountSignal = Math.log1p(Math.max(0, features.amount));
    return [
      amountSignal,
      Math.max(0, features.dueDays),
      this.clamp01(features.clientLateRatio),
      Math.max(0, features.previousLateCount),
      Math.max(0, features.openInvoiceCount),
      Math.max(0, features.overdueInvoiceCount),
    ];
  }

  private normalizeVector(vector: number[]): number[] {
    return vector.map((value, index) => {
      const std = this.stds[index] || 1;
      return (value - this.means[index]) / std;
    });
  }

  private computeMeans(vectors: number[][]): number[] {
    return vectors[0].map((_, featureIndex) => {
      const total = vectors.reduce((sum, vector) => sum + vector[featureIndex], 0);
      return total / vectors.length;
    });
  }

  private computeStds(vectors: number[][], means: number[]): number[] {
    return vectors[0].map((_, featureIndex) => {
      const variance = vectors.reduce((sum, vector) => {
        const delta = vector[featureIndex] - means[featureIndex];
        return sum + delta * delta;
      }, 0) / Math.max(vectors.length, 1);
      return Math.sqrt(variance) || 1;
    });
  }

  private dot(weights: number[], vector: number[]): number {
    return weights.reduce((sum, weight, index) => sum + weight * vector[index], 0);
  }

  private sigmoid(value: number): number {
    if (value >= 0) {
      const exp = Math.exp(-value);
      return 1 / (1 + exp);
    }

    const exp = Math.exp(value);
    return exp / (1 + exp);
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }

  private getRiskLevel(probability: number): InvoiceDelayRiskLevel {
    if (probability >= 0.7) return 'HIGH';
    if (probability >= 0.4) return 'MEDIUM';
    return 'LOW';
  }
}

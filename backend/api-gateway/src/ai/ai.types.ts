export interface LabeledExample {
  text: string;
  label: string;
}

export interface PredictionScore {
  label: string;
  score: number;
  probability: number;
}

export interface ModelSnapshot {
  modelName: string;
  trainedAt: string;
  trainingExamples: number;
  vocabularySize: number;
  labels: string[];
  trainingAccuracy: number;
}

export interface PredictionResult {
  input: string;
  label: string;
  confidence: number;
  scores: PredictionScore[];
  matchedTokens: string[];
}
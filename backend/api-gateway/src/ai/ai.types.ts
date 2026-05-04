// Représente un exemple étiqueté pour l'entraînement ou la prédiction
export interface LabeledExample {
  text: string; // Texte à classifier
  label: string; // Étiquette/catégorie associée
}

// Représente le score de prédiction pour une étiquette
export interface PredictionScore {
  label: string; // Étiquette prédite
  score: number; // Score brut
  probability: number; // Probabilité associée
}

// Représente un snapshot du modèle de classification
export interface ModelSnapshot {
  modelName: string; // Nom du modèle
  trainedAt: string; // Date d'entraînement
  trainingExamples: number; // Nombre d'exemples utilisés
  vocabularySize: number; // Taille du vocabulaire
  labels: string[]; // Liste des étiquettes
  trainingAccuracy: number; // Précision à l'entraînement
}

// Représente le résultat d'une prédiction
export interface PredictionResult {
  input: string; // Texte d'entrée
  label: string; // Étiquette prédite
  confidence: number; // Confiance de la prédiction
  scores: PredictionScore[]; // Détail des scores pour chaque étiquette
  matchedTokens: string[]; // Tokens trouvés dans le texte
}

//
// Ce fichier définit les types TypeScript utilisés pour la classification de texte et la gestion des modèles IA.
// Il structure les exemples, les résultats de prédiction et les snapshots de modèles pour la classification automatique de texte.
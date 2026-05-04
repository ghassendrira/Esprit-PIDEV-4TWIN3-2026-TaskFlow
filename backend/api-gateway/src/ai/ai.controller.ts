// Importe les décorateurs et fonctions nécessaires de NestJS
import { Body, Controller, Get, Post } from '@nestjs/common';
// Importe le service d'IA qui contient la logique métier
import { AiService } from './ai.service';
// Importe le type d'exemple étiqueté pour la classification de texte
import { LabeledExample } from './ai.types';
// Importe les types liés au modèle de retard de facture
import { InvoiceDelayExample, InvoiceDelayFeatures } from './invoice-delay.model';

// Définit le type de requête pour la prédiction de retard de facture
type InvoiceDelayRequest = Partial<InvoiceDelayFeatures> & {
  businessId?: string;
  clientId?: string;
};

// Définit le contrôleur pour la route 'ai'
@Controller('ai')
export class AiController {
  // Injection du service d'IA
  constructor(private readonly aiService: AiService) {}

  // Route GET pour récupérer le snapshot du modèle de classification de dépenses
  @Get('model')
  getModel() {
    return this.aiService.getModelSnapshot();
  }

  // Route GET pour récupérer les exemples d'entraînement de la classification de dépenses
  @Get('examples')
  getExamples() {
    return {
      size: this.aiService.getTrainingExamples().length,
      examples: this.aiService.getTrainingExamples(),
    };
  }

  // Route POST pour prédire la catégorie d'une dépense à partir d'un texte
  @Post('expense-classifier/predict')
  predict(@Body() body: { text?: string }) {
    return this.aiService.predict(body?.text ?? '');
  }

  // Route POST pour réentraîner le modèle de classification de dépenses
  @Post('expense-classifier/train')
  train(@Body() body: { examples?: LabeledExample[] }) {
    return this.aiService.retrain(body?.examples);
  }

  // Route GET pour récupérer le snapshot du modèle de prédiction de retard de facture
  @Get('invoice-delay/model')
  getInvoiceDelayModel() {
    return this.aiService.getInvoiceDelayModelSnapshot();
  }

  // Route GET pour récupérer les exemples d'entraînement du modèle de retard de facture
  @Get('invoice-delay/examples')
  getInvoiceDelayExamples() {
    return {
      size: this.aiService.getInvoiceDelayTrainingExamples().length,
      examples: this.aiService.getInvoiceDelayTrainingExamples(),
    };
  }

  // Route POST pour prédire le risque de retard de facture
  @Post('invoice-delay/predict')
  async predictInvoiceDelay(@Body() body: InvoiceDelayRequest) {
    return this.aiService.predictInvoiceDelay(body ?? {});
  }

  // Route POST pour réentraîner le modèle de retard de facture
  @Post('invoice-delay/train')
  async trainInvoiceDelay(
    @Body() body: { examples?: InvoiceDelayExample[]; businessId?: string },
  ) {
    return this.aiService.retrainInvoiceDelay({
      //
      // Ce fichier définit le contrôleur d'API pour les fonctionnalités d'intelligence artificielle (IA) liées à la classification des dépenses et à la prédiction du retard de paiement des factures.
      // Il expose des routes HTTP pour entraîner les modèles, faire des prédictions et obtenir des exemples ou des snapshots des modèles.
      // Chaque méthode correspond à une route REST qui délègue la logique métier au service d'IA (AiService).
      examples: body?.examples,
      businessId: body?.businessId,
    });
  }
}

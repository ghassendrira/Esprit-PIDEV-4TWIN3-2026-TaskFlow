import { Injectable, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { AIPredictionService } from './ai-prediction.service';
import { PrismaService } from '../prisma.service';

@Processor('ai-predictions')
@Injectable()
export class AIPredictionConsumer {
  private readonly logger = new Logger(AIPredictionConsumer.name);

  constructor(
    private aiService: AIPredictionService,
    private prisma: PrismaService,
  ) {}

  /**
   * Process fraud detection job
   */
  @Process('predict-fraud')
  async processFraudDetection(job: Job<any>) {
    const { businessId, invoiceId, invoiceData } = job.data;

    try {
      this.logger.log(`🔍 Processing fraud detection: Job ${job.id} for ${businessId}`);

      // Get prediction from AI service
      const aiPrediction = await this.aiService.predictInvoiceFraud(businessId, invoiceData);

      // Save prediction
      const prediction = await this.aiService.savePrediction({
        businessId,
        invoiceId,
        type: 'FRAUD_DETECTION',
        prediction: aiPrediction.prediction,
        confidence: aiPrediction.prediction.confidence || 0,
        isFlagged: aiPrediction.prediction.fraud || false,
      });

      this.logger.log(`✅ Fraud prediction completed: ${prediction.id}`);
      return prediction;
    } catch (error) {
      this.logger.error(
        `❌ Fraud detection failed for job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process anomaly detection job
   */
  @Process('predict-anomaly')
  async processAnomalyDetection(job: Job<any>) {
    const { businessId, expenseId, amount } = job.data;

    try {
      this.logger.log(`📊 Processing anomaly detection: Job ${job.id} for ${businessId}`);

      const aiPrediction = await this.aiService.predictExpenseAnomaly(businessId, amount);

      const prediction = await this.aiService.savePrediction({
        businessId,
        expenseId,
        type: 'ANOMALY_DETECTION',
        prediction: aiPrediction.prediction,
        confidence: aiPrediction.prediction.confidence || 0,
        isFlagged: aiPrediction.prediction.anomaly || false,
      });

      this.logger.log(`✅ Anomaly prediction completed: ${prediction.id}`);
      return prediction;
    } catch (error) {
      this.logger.error(
        `❌ Anomaly detection failed for job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process risk assessment job
   */
  @Process('predict-risk')
  async processRiskAssessment(job: Job<any>) {
    const { businessId, invoiceId, transactionData } = job.data;

    try {
      this.logger.log(`⚠️ Processing risk assessment: Job ${job.id} for ${businessId}`);

      const aiPrediction = await this.aiService.predictPaymentRisk(
        businessId,
        transactionData,
      );

      const prediction = await this.aiService.savePrediction({
        businessId,
        invoiceId,
        type: 'RISK_ASSESSMENT',
        prediction: aiPrediction.prediction,
        confidence: 0.5,
        riskLevel: aiPrediction.prediction.risk_level,
        isFlagged: aiPrediction.prediction.risk_level === 'high',
      });

      this.logger.log(`✅ Risk assessment completed: ${prediction.id}`);
      return prediction;
    } catch (error) {
      this.logger.error(
        `❌ Risk assessment failed for job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process model training job
   */
  @Process('train-model')
  async processModelTraining(job: Job<any>) {
    const { businessId, modelType } = job.data;

    try {
      this.logger.log(`🎓 Processing model training: Job ${job.id} for ${businessId}`);

      const result = await this.aiService.trainModel(businessId, modelType);

      this.logger.log(`✅ Model training completed: ${modelType}`);
      return result;
    } catch (error) {
      this.logger.error(
        `❌ Model training failed for job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle failed jobs
   */
  @Process({
    name: 'predict-fraud',
    concurrency: 1,
  })
  async handleFailedJob(job: Job) {
    this.logger.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts`);
  }
}

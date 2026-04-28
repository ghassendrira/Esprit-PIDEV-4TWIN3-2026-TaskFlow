import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma.service';
import { AIPredictionQueueService } from './ai-prediction-queue.service';
import axios from 'axios';

@Injectable()
export class AIPredictionService {
  private readonly logger = new Logger(AIPredictionService.name);
  private readonly aiServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:3009';

  constructor(
    private http: HttpService,
    private prisma: PrismaService,
    private queueService: AIPredictionQueueService,
  ) {}

  /**
   * Predict invoice fraud
   */
  async predictInvoiceFraud(
    businessId: string,
    invoiceData: {
      amount: number;
      tax?: number;
      description?: string;
    },
  ) {
    try {
      this.logger.log(`🔍 Predicting fraud for business ${businessId}`);

      const response = await axios.post(
        `${this.aiServiceUrl}/predict/fraud`,
        {
          businessId,
          amount: invoiceData.amount,
          tax: invoiceData.tax || 0,
          description: invoiceData.description,
        },
        {
          headers: {
            'x-tenant-id': businessId,
          },
          timeout: 5000,
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`❌ Fraud prediction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Predict expense anomaly
   */
  async predictExpenseAnomaly(businessId: string, amount: number) {
    try {
      this.logger.log(`📊 Detecting anomalies for business ${businessId}`);

      const response = await axios.post(
        `${this.aiServiceUrl}/predict/anomaly`,
        {
          businessId,
          amount,
        },
        {
          headers: {
            'x-tenant-id': businessId,
          },
          timeout: 5000,
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`❌ Anomaly detection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assess payment risk
   */
  async predictPaymentRisk(
    businessId: string,
    transactionData: {
      amount: number;
      tax?: number;
    },
  ) {
    try {
      this.logger.log(`⚠️ Assessing risk for business ${businessId}`);

      const response = await axios.post(
        `${this.aiServiceUrl}/predict/risk`,
        {
          businessId,
          amount: transactionData.amount,
          tax: transactionData.tax || 0,
        },
        {
          headers: {
            'x-tenant-id': businessId,
          },
          timeout: 5000,
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`❌ Risk assessment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save prediction to database
   */
  async savePrediction(data: {
    businessId: string;
    invoiceId?: string;
    expenseId?: string;
    type: string;
    prediction: any;
    confidence: number;
    riskLevel?: string;
    isFlagged: boolean;
  }) {
    try {
      const saved = await this.prisma.aIPrediction.create({
        data: {
          businessId: data.businessId,
          invoiceId: data.invoiceId,
          expenseId: data.expenseId,
          type: data.type as any,
          prediction: data.prediction,
          confidence: data.confidence,
          riskLevel: data.riskLevel,
          isFlagged: data.isFlagged,
          metadata: {
            source: 'ai_service',
            version: '1.0',
          },
        },
      });

      this.logger.log(`✅ Prediction saved: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`❌ Failed to save prediction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get predictions for an invoice
   */
  async getInvoicePredictions(invoiceId: string) {
    try {
      return await this.prisma.aIPrediction.findMany({
        where: {
          invoiceId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      this.logger.error(`❌ Failed to fetch predictions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get flagged predictions for a business
   */
  async getFlaggedPredictions(businessId: string, type?: string) {
    try {
      return await this.prisma.aIPrediction.findMany({
        where: {
          businessId,
          isFlagged: true,
          ...(type && { type: type as any }),
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to fetch flagged predictions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Train model for business
   */
  async trainModel(businessId: string, modelType: string) {
    try {
      this.logger.log(`🎓 Training ${modelType} model for business ${businessId}`);

      const endpoint =
        modelType === 'fraud'
          ? '/train/fraud'
          : modelType === 'anomaly'
            ? '/train/anomaly'
            : '/train/risk';

      const response = await axios.post(
        `${this.aiServiceUrl}${endpoint}`,
        {
          businessId,
          model_type: modelType,
          months: 12,
        },
        {
          headers: {
            'x-tenant-id': businessId,
          },
          timeout: 30000,
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`❌ Model training failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get AI service health
   */
  async checkAIServiceHealth() {
    try {
      const response = await axios.get(`${this.aiServiceUrl}/health`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`❌ AI service unreachable: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return await this.queueService.getQueueStats();
  }

  /**
   * Queue model training
   */
  async queueModelTraining(businessId: string, modelType: string) {
    return await this.queueService.queueModelTraining(businessId, modelType);
  }

  /**
   * Queue fraud detection
   */
  async queueFraudDetection(businessId: string, invoiceId: string, invoiceData: any) {
    return await this.queueService.queueFraudDetection(businessId, invoiceId, invoiceData);
  }

  /**
   * Queue anomaly detection
   */
  async queueAnomalyDetection(businessId: string, expenseId: string, amount: number) {
    return await this.queueService.queueAnomalyDetection(businessId, expenseId, amount);
  }
}

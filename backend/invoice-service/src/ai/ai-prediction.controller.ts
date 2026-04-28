import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpException,
  HttpStatus,
  Query,
  Logger,
} from '@nestjs/common';
import { AIPredictionService } from './ai-prediction.service';

@Controller('ai')
export class AIPredictionController {
  private readonly logger = new Logger(AIPredictionController.name);

  constructor(private aiService: AIPredictionService) {}

  /**
   * Health check for AI service
   * GET /ai/health
   */
  @Get('health')
  async getHealth() {
    const health = await this.aiService.checkAIServiceHealth();
    return {
      status: health.status === 'healthy' ? 'ok' : 'error',
      ai_service: health,
    };
  }

  /**
   * Predict fraud for an invoice
   * POST /ai/predict/fraud
   */
  @Post('predict/fraud')
  async predictFraud(
    @Body() body: { amount: number; tax?: number; description?: string },
    @Headers('x-tenant-id') tenantId: string,
  ) {
    try {
      const businessId = tenantId?.split(',')[0]?.trim();
      if (!businessId) {
        throw new HttpException('Missing x-tenant-id header', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`🔍 Fraud prediction request for business ${businessId}`);

      // Get prediction from AI service
      const aiPrediction = await this.aiService.predictInvoiceFraud(businessId, body);

      // Save to database
      const prediction = await this.aiService.savePrediction({
        businessId,
        type: 'FRAUD_DETECTION',
        prediction: aiPrediction.prediction,
        confidence: aiPrediction.prediction.confidence || 0,
        isFlagged: aiPrediction.prediction.fraud || false,
      });

      return {
        success: true,
        prediction,
        ai_response: aiPrediction,
      };
    } catch (error) {
      this.logger.error(`❌ Fraud prediction error: ${error.message}`);
      throw new HttpException(
        `Fraud prediction failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Predict expense anomaly
   * POST /ai/predict/anomaly
   */
  @Post('predict/anomaly')
  async predictAnomaly(
    @Body() body: { amount: number },
    @Headers('x-tenant-id') tenantId: string,
  ) {
    try {
      const businessId = tenantId?.split(',')[0]?.trim();
      if (!businessId) {
        throw new HttpException('Missing x-tenant-id header', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`📊 Anomaly detection request for business ${businessId}`);

      const aiPrediction = await this.aiService.predictExpenseAnomaly(businessId, body.amount);

      const prediction = await this.aiService.savePrediction({
        businessId,
        type: 'ANOMALY_DETECTION',
        prediction: aiPrediction.prediction,
        confidence: aiPrediction.prediction.confidence || 0,
        isFlagged: aiPrediction.prediction.anomaly || false,
      });

      return {
        success: true,
        prediction,
        ai_response: aiPrediction,
      };
    } catch (error) {
      this.logger.error(`❌ Anomaly detection error: ${error.message}`);
      throw new HttpException(
        `Anomaly detection failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Assess payment risk
   * POST /ai/predict/risk
   */
  @Post('predict/risk')
  async predictRisk(
    @Body() body: { amount: number; tax?: number },
    @Headers('x-tenant-id') tenantId: string,
  ) {
    try {
      const businessId = tenantId?.split(',')[0]?.trim();
      if (!businessId) {
        throw new HttpException('Missing x-tenant-id header', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`⚠️ Risk assessment request for business ${businessId}`);

      const aiPrediction = await this.aiService.predictPaymentRisk(businessId, body);

      const prediction = await this.aiService.savePrediction({
        businessId,
        type: 'RISK_ASSESSMENT',
        prediction: aiPrediction.prediction,
        confidence: 0.5, // Risk score
        riskLevel: aiPrediction.prediction.risk_level,
        isFlagged: aiPrediction.prediction.risk_level === 'high',
      });

      return {
        success: true,
        prediction,
        ai_response: aiPrediction,
      };
    } catch (error) {
      this.logger.error(`❌ Risk assessment error: ${error.message}`);
      throw new HttpException(
        `Risk assessment failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get predictions for an invoice
   * GET /ai/predictions/invoice/:invoiceId
   */
  @Get('predictions/invoice/:invoiceId')
  async getInvoicePredictions(@Param('invoiceId') invoiceId: string) {
    try {
      return await this.aiService.getInvoicePredictions(invoiceId);
    } catch (error) {
      this.logger.error(`❌ Failed to fetch predictions: ${error.message}`);
      throw new HttpException(
        'Failed to fetch predictions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get flagged predictions for business
   * GET /ai/predictions/flagged?type=FRAUD_DETECTION
   */
  @Get('predictions/flagged')
  async getFlaggedPredictions(
    @Query('type') type: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    try {
      const businessId = tenantId?.split(',')[0]?.trim();
      if (!businessId) {
        throw new HttpException('Missing x-tenant-id header', HttpStatus.BAD_REQUEST);
      }

      return await this.aiService.getFlaggedPredictions(businessId, type);
    } catch (error) {
      this.logger.error(`❌ Failed to fetch flagged predictions: ${error.message}`);
      throw new HttpException(
        'Failed to fetch predictions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Queue fraud detection (async)
   * POST /ai/queue/fraud
   */
  @Post('queue/fraud')
  async queueFraudDetection(
    @Body() body: { invoiceId: string; amount: number; tax?: number; description?: string },
    @Headers('x-tenant-id') tenantId: string,
  ) {
    try {
      const businessId = tenantId?.split(',')[0]?.trim();
      if (!businessId) {
        throw new HttpException('Missing x-tenant-id header', HttpStatus.BAD_REQUEST);
      }

      const job = await this.aiService.queueFraudDetection(businessId, body.invoiceId, body);

      return {
        success: true,
        message: 'Fraud detection queued',
        jobId: job.id,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to queue fraud detection: ${error.message}`);
      throw new HttpException(
        `Queue failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Queue anomaly detection (async)
   * POST /ai/queue/anomaly
   */
  @Post('queue/anomaly')
  async queueAnomalyDetection(
    @Body() body: { expenseId: string; amount: number },
    @Headers('x-tenant-id') tenantId: string,
  ) {
    try {
      const businessId = tenantId?.split(',')[0]?.trim();
      if (!businessId) {
        throw new HttpException('Missing x-tenant-id header', HttpStatus.BAD_REQUEST);
      }

      const job = await this.aiService.queueAnomalyDetection(businessId, body.expenseId, body.amount);

      return {
        success: true,
        message: 'Anomaly detection queued',
        jobId: job.id,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to queue anomaly detection: ${error.message}`);
      throw new HttpException(
        `Queue failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get queue statistics
   * GET /ai/queue/stats
   */
  @Get('queue/stats')
  async getQueueStats() {
    try {
      return await this.aiService.getQueueStats();
    } catch (error) {
      this.logger.error(`❌ Failed to get queue stats: ${error.message}`);
      throw new HttpException(
        'Failed to get queue stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Train AI model
   * POST /ai/train/:modelType
   */
  @Post('train/:modelType')
  async trainModel(
    @Param('modelType') modelType: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    try {
      const businessId = tenantId?.split(',')[0]?.trim();
      if (!businessId) {
        throw new HttpException('Missing x-tenant-id header', HttpStatus.BAD_REQUEST);
      }

      if (!['fraud', 'anomaly', 'risk'].includes(modelType)) {
        throw new HttpException('Invalid model type', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`🎓 Training ${modelType} model for business ${businessId}`);

      const result = await this.aiService.trainModel(businessId, modelType);

      return {
        success: true,
        message: `${modelType} model training initiated`,
        result,
      };
    } catch (error) {
      this.logger.error(`❌ Model training error: ${error.message}`);
      throw new HttpException(
        `Model training failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Queue model training (async)
   * POST /ai/queue/train/:modelType
   */
  @Post('queue/train/:modelType')
  async queueModelTraining(
    @Param('modelType') modelType: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    try {
      const businessId = tenantId?.split(',')[0]?.trim();
      if (!businessId) {
        throw new HttpException('Missing x-tenant-id header', HttpStatus.BAD_REQUEST);
      }

      if (!['fraud', 'anomaly', 'risk'].includes(modelType)) {
        throw new HttpException('Invalid model type', HttpStatus.BAD_REQUEST);
      }

      const job = await this.aiService.queueModelTraining(businessId, modelType);

      return {
        success: true,
        message: `${modelType} model training queued`,
        jobId: job.id,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to queue model training: ${error.message}`);
      throw new HttpException(
        `Queue failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

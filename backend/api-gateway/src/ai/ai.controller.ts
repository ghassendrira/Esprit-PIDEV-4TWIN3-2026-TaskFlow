import { Body, Controller, Get, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { LabeledExample } from './ai.types';
import { InvoiceDelayExample, InvoiceDelayFeatures } from './invoice-delay.model';

type InvoiceDelayRequest = Partial<InvoiceDelayFeatures> & {
  businessId?: string;
  clientId?: string;
};

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('model')
  getModel() {
    return this.aiService.getModelSnapshot();
  }

  @Get('examples')
  getExamples() {
    return {
      size: this.aiService.getTrainingExamples().length,
      examples: this.aiService.getTrainingExamples(),
    };
  }

  @Post('expense-classifier/predict')
  predict(@Body() body: { text?: string }) {
    return this.aiService.predict(body?.text ?? '');
  }

  @Post('expense-classifier/train')
  train(@Body() body: { examples?: LabeledExample[] }) {
    return this.aiService.retrain(body?.examples);
  }

  @Get('invoice-delay/model')
  getInvoiceDelayModel() {
    return this.aiService.getInvoiceDelayModelSnapshot();
  }

  @Get('invoice-delay/examples')
  getInvoiceDelayExamples() {
    return {
      size: this.aiService.getInvoiceDelayTrainingExamples().length,
      examples: this.aiService.getInvoiceDelayTrainingExamples(),
    };
  }

  @Post('invoice-delay/predict')
  async predictInvoiceDelay(@Body() body: InvoiceDelayRequest) {
    return this.aiService.predictInvoiceDelay(body ?? {});
  }

  @Post('invoice-delay/train')
  async trainInvoiceDelay(
    @Body() body: { examples?: InvoiceDelayExample[]; businessId?: string },
  ) {
    return this.aiService.retrainInvoiceDelay({
      examples: body?.examples,
      businessId: body?.businessId,
    });
  }
}

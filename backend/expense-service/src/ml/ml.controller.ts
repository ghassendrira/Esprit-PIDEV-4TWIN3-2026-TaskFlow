import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MlService } from './ml.service';

@Controller('ml')
export class MlController {
  constructor(private readonly ml: MlService) {}

  @Post('segment/client')
  segmentClient(
    @Body()
    body: {
      clientId: string;
      businessId?: string;
      recency: number;
      frequency: number;
      monetary: number;
    },
  ) {
    return this.ml.segmentClient(
      body.clientId,
      Number(body.recency),
      Number(body.frequency),
      Number(body.monetary),
    );
  }

  @Post('categorize/expense')
  categorizeExpense(@Body() body: { description: string; businessId?: string }) {
    return this.ml.categorizeExpense(String(body.description ?? ''));
  }

  @Get('forecast/cashflow')
  getCashflowForecast(
    @Query('months') months?: string,
    @Query('businessId') _businessId?: string,
  ) {
    const m = months != null && months !== '' ? Number(months) : 6;
    return this.ml.getCashflowForecast(Number.isFinite(m) ? m : 6);
  }

  @Post('detect/anomaly')
  detectAnomaly(
    @Body() body: Record<string, unknown> & { businessId?: string },
  ) {
    const { businessId: _b, ...rest } = body;
    return this.ml.detectAnomaly(rest);
  }
}

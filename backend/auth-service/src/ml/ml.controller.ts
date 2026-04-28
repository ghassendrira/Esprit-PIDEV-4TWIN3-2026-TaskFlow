import {
  Controller, Get, Headers, Query, Param,
  BadRequestException, UseGuards, Post, Body
} from '@nestjs/common';
import { MlService } from './ml.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ml')
@UseGuards(JwtAuthGuard)
export class MlController {

  constructor(private readonly mlService: MlService) {}

  private getTenantId(tenantId: string | string[] | undefined): string {
    const tId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    if (!tId) {
      throw new BadRequestException('x-tenant-id header manquant');
    }
    return tId;
  }

  @Get('cashflow')
  async getCashflow(
    @Headers('x-tenant-id') tenantId: string,
    @Query('months') months: string,
  ) {
    const businessId = tenantId?.split(',')[0]?.trim();
    return this.mlService.getCashflow(businessId, parseInt(months || '6', 10));
  }

  @Get('segmentation')
  async getSegmentation(
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const businessId = tenantId?.split(',')[0]?.trim();
    return this.mlService.getSegmentation(businessId);
  }

  @Get('anomalies')
  async getAnomalies(
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const businessId = tenantId?.split(',')[0]?.trim();
    return this.mlService.getAnomalies(businessId);
  }

  @Get('risk')
  async getAllRisks(
    @Headers('x-tenant-id') tenantId: string | string[] | undefined,
  ) {
    const tId = this.getTenantId(tenantId);
    const businessId = tId.split(',')[0].trim();
    return this.mlService.getAllRisks(businessId);
  }

  @Get('risk/:invoiceId')
  async getInvoiceRisk(
    @Headers('x-tenant-id') tenantId: string | string[] | undefined,
    @Param('invoiceId') invoiceId: string,
  ) {
    const tId = this.getTenantId(tenantId);
    const businessId = tId.split(',')[0].trim();
    return this.mlService.getInvoiceRisk(businessId, invoiceId);
  }

  @Post('segmentation/:clientId')
  async segmentClient(
    @Headers('x-tenant-id') tenantId: string | string[] | undefined,
    @Param('clientId') clientId: string,
    @Body() body: { recency: number; frequency: number; monetary: number; business_id: string }
  ) {
    const tId = this.getTenantId(tenantId);
    return this.mlService.segmentSingleClient(clientId, body);
  }

  @Post('categorize')
  async categorizeExpense(@Body() body: { description: string }) {
    return this.mlService.categorizeExpense(body.description);
  }
}

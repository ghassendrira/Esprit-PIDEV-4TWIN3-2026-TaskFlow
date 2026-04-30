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
    return (tId || '').trim();
  }

  private first(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  }

  private resolveBusinessId(
    tenantId: string | string[] | undefined,
    businessIdHeader?: string,
    businessIdQuery?: string,
  ): string {
    const fromHeader = this.first(businessIdHeader)?.split(',')[0]?.trim();
    if (fromHeader) return fromHeader;

    const fromQuery = this.first(businessIdQuery)?.split(',')[0]?.trim();
    if (fromQuery) return fromQuery;

    const tId = this.getTenantId(tenantId);
    const fallback = tId.split(',')[0].trim();
    if (fallback) return fallback;

    throw new BadRequestException('businessId manquant (x-business-id ou query businessId)');
  }

  @Get('cashflow')
  async getCashflow(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-business-id') businessIdHeader: string,
    @Query('businessId') businessIdQuery: string,
    @Query('months') months: string,
  ) {
    const businessId = this.resolveBusinessId(tenantId, businessIdHeader, businessIdQuery);
    const tId = this.getTenantId(tenantId);
    return this.mlService.getCashflow(
      businessId,
      tId,
      authorization,
      parseInt(months || '6', 10),
    );
  }

  @Get('segmentation')
  async getSegmentation(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-business-id') businessIdHeader: string,
    @Query('businessId') businessIdQuery: string,
  ) {
    const businessId = this.resolveBusinessId(tenantId, businessIdHeader, businessIdQuery);
    const tId = this.getTenantId(tenantId);
    return this.mlService.getSegmentation(businessId, tId, authorization);
  }

  @Get('anomalies')
  async getAnomalies(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-business-id') businessIdHeader: string,
    @Query('businessId') businessIdQuery: string,
  ) {
    const businessId = this.resolveBusinessId(tenantId, businessIdHeader, businessIdQuery);
    const tId = this.getTenantId(tenantId);
    return this.mlService.getAnomalies(businessId, tId, authorization);
  }

  @Get('risk')
  async getAllRisks(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string | string[] | undefined,
    @Headers('x-business-id') businessIdHeader: string,
    @Query('businessId') businessIdQuery: string,
  ) {
    const tId = this.getTenantId(tenantId);
    const businessId = this.resolveBusinessId(tenantId, businessIdHeader, businessIdQuery);
    return this.mlService.getAllRisks(businessId, tId, authorization);
  }

  @Get('risk/:invoiceId')
  async getInvoiceRisk(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string | string[] | undefined,
    @Headers('x-business-id') businessIdHeader: string,
    @Query('businessId') businessIdQuery: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    const tId = this.getTenantId(tenantId);
    const businessId = this.resolveBusinessId(tenantId, businessIdHeader, businessIdQuery);
    return this.mlService.getInvoiceRisk(businessId, tId, authorization, invoiceId);
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

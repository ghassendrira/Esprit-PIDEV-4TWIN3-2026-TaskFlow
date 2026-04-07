import { Body, Controller, Delete, Get, Param, Patch, Post, Logger, UseGuards, Req } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { CreateInvoiceDto, UpdateInvoiceDto } from './dto';
import { TenantGuard } from './tenant.guard';

@Controller('invoices')
@UseGuards(TenantGuard)
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);
  constructor(private service: InvoicesService) {}

  @Get('by-business/:businessId')
  async listByBusiness(@Param('businessId') businessId: string, @Req() req: any) {
    this.logger.log(`GET /invoices/by-business/${businessId}`);
    try {
      return await this.service.listByBusiness(businessId, req.tenantId);
    } catch (err: any) {
      this.logger.error(`Error in listByBusiness: ${err.message}`, err.stack);
      throw err;
    }
  }

  @Post()
  async create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    this.logger.log(`POST /invoices`);
    try {
      return await this.service.create(dto, req.tenantId);
    } catch (err: any) {
      this.logger.error(`Error in create: ${err.message}`, err.stack);
      throw err;
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto, @Req() req: any) {
    return this.service.update(id, dto, req.tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`GET /invoices/${id}`);
    return this.service.findOne(id, req.tenantId);
  }

  @Post(':id/send')
  async send(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`POST /invoices/${id}/send`);
    return this.service.send(id, req.tenantId);
  }
}

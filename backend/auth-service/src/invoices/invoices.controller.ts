import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { InvoicesProxyService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private service: InvoicesProxyService) {}

  @Get('by-business/:businessId')
  listByBusiness(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Param('businessId') businessId: string,
  ) {
    return this.service.listByBusiness(authorization, tenantId, businessId);
  }

  @Post()
  create(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    return this.service.create(authorization, tenantId, body);
  }

  @Patch(':id')
  update(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.update(authorization, tenantId, id, body);
  }

  @Delete(':id')
  remove(
    @Headers('authorization') authorization: string,
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(authorization, tenantId, id);
  }
}

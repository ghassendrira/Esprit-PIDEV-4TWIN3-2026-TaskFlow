import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { CreateInvoiceDto, UpdateInvoiceDto } from './dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private service: InvoicesService) {}

  @Get('by-business/:businessId')
  listByBusiness(@Param('businessId') businessId: string) {
    return this.service.listByBusiness(businessId);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

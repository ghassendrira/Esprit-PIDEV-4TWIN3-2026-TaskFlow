import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import type { CreateExpenseDto, UpdateExpenseDto } from './dto';

@Controller('expenses')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get('by-business/:businessId')
  listByBusiness(@Param('businessId') businessId: string) {
    return this.service.listByBusiness(businessId);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

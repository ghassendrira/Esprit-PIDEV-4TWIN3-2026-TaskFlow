import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { ExpensesService, UserContext } from './expenses.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ExpenseGuard } from './guards/expense-ownership.guard';

@Controller('expense-categories')
@UseGuards(ExpenseGuard)
export class CategoriesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  getCategories(@Headers('x-tenant-id') tenantId: string) {
    return this.expensesService.getCategories(tenantId);
  }

  @Post()
  createCategory(@Body() dto: CreateCategoryDto, @Req() req: any) {
    const ctx: UserContext = req.user;
    return this.expensesService.createCategory(dto, ctx);
  }
}

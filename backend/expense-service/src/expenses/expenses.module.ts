import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ExpensesController } from './expenses.controller';
import { CategoriesController } from './categories.controller';
import { ExpensesService } from './expenses.service';
import { RolesGuard } from '../roles/roles.guard';

@Module({
  controllers: [ExpensesController, CategoriesController],
  providers: [ExpensesService, PrismaService, RolesGuard],
})
export class ExpensesModule {}

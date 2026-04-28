import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesProxyService } from './expenses.service';

@Module({
  imports: [],
  controllers: [ExpensesController],
  providers: [ExpensesProxyService],
})
export class ExpensesModule {}

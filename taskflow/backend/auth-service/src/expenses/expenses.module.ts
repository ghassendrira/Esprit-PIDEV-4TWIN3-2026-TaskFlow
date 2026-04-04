import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ExpensesController } from './expenses.controller';
import { ExpensesProxyService } from './expenses.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ExpensesController],
  providers: [ExpensesProxyService],
})
export class ExpensesModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExpensesModule } from './expenses/expenses.module';
import { MlModule } from './ml/ml.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ExpensesModule, MlModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

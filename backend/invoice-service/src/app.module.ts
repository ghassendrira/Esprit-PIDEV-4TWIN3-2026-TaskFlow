import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoicesModule } from './invoices/invoices.module';
import { AIPredictionModule } from './ai/ai-prediction.module';

@Module({
  imports: [InvoicesModule, AIPredictionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

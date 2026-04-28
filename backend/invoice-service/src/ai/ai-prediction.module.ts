import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { AIPredictionService } from './ai-prediction.service';
import { AIPredictionController } from './ai-prediction.controller';
import { AIPredictionQueueService } from './ai-prediction-queue.service';
import { AIPredictionConsumer } from './ai-prediction-consumer';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    HttpModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'ai-predictions',
    }),
  ],
  controllers: [AIPredictionController],
  providers: [
    AIPredictionService,
    AIPredictionQueueService,
    AIPredictionConsumer,
    PrismaService,
  ],
  exports: [AIPredictionService, AIPredictionQueueService],
})
export class AIPredictionModule {}

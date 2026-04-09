import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class ChatPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatPrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL_NOTIFICATION
      ?? process.env.DATABASE_URL
      ?? 'postgresql://postgres:taskflow2026@localhost:5432/taskflow_notification';
    const adapter = new PrismaPg({ connectionString: url } as any);
    super({ adapter } as any);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Chat Prisma connected');
    } catch (e: any) {
      this.logger.error('Chat Prisma connection failed:', e.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

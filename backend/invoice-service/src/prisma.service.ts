import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  constructor() {
    const url = process.env.DATABASE_URL_INVOICE ?? process.env.DATABASE_URL;
    const adapter = url
      ? new PrismaPg({
          connectionString: url,
          pool: { maxConnections: 2 },
        } as any)
      : undefined;
    super(adapter ? ({ adapter } as any) : undefined);
    
    if (url) {
      this.logger.log('Prisma initialized with pg adapter (auth-style)');
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (err: any) {
      this.logger.error(`Database connection error: ${err.message}`);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

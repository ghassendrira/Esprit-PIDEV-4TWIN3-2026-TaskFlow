import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly dbUrlSource: 'DATABASE_URL_AUTH' | 'DATABASE_URL' | 'none';

  constructor() {
    // Prefer auth-service specific URL, fallback to generic one.
    const authUrl = process.env.DATABASE_URL_AUTH;
    const defaultUrl = process.env.DATABASE_URL;
    const url = authUrl ?? defaultUrl;
    const dbUrlSource = authUrl
      ? 'DATABASE_URL_AUTH'
      : defaultUrl
        ? 'DATABASE_URL'
        : 'none';

    const adapter = url
      ? new PrismaPg({
          connectionString: url,
          // keep pool small to avoid exhausting Postgres max_connections
          pool: { maxConnections: 2 },
        } as any)
      : undefined;
    super(adapter ? ({ adapter } as any) : undefined);
    this.dbUrlSource = dbUrlSource;

    // Helpful startup debug (no password printed).
    if (url) {
      try {
        const u = new URL(url);
        // eslint-disable-next-line no-console
        console.log('[Prisma] db url', {
          source: this.dbUrlSource,
          host: u.hostname,
          port: u.port,
          user: u.username,
          database: u.pathname?.replace(/^\//, ''),
        });
      } catch {
        // ignore invalid URL formats; Prisma will surface errors later
      }
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error: any) {
      const code = error?.code;
      const authHint =
        code === 'P1000'
          ? 'Database authentication failed. Check username/password in .env for the selected DB URL.'
          : 'Database connection failed.';

      throw new Error(
        `[Prisma] ${authHint} source=${this.dbUrlSource}. ` +
          `Set DATABASE_URL_AUTH (preferred) or DATABASE_URL with valid Postgres credentials.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

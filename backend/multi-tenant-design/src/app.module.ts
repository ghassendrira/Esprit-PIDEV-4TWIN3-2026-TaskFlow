import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { User } from './entities/User.entity';
import { Company } from './entities/Company.entity';
import { Invoice } from './entities/Invoice.entity';
import { Client } from './entities/Client.entity';
import { Expense } from './entities/Expense.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'taskflow',
      entities: [User, Company, Invoice, Client, Expense],
      synchronize: true, // Be careful in production
    }),
    AuthModule,
    BusinessModule,
  ],
})
export class AppModule {}

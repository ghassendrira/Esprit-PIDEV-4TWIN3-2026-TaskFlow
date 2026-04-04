import { Global, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { SettingsModule } from './settings/settings.module';
import { PrismaService } from './prisma.service';
import { AdminModule } from './admin/admin.module';

import { RolesModule } from './roles/roles.module';

@Global()
@Module({
  imports: [AuthModule, OnboardingModule, SettingsModule, AdminModule, RolesModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { SettingsController, BusinessSettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({})],
  controllers: [SettingsController, BusinessSettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}

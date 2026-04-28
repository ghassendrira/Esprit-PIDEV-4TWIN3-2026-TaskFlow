import { Module } from '@nestjs/common';
import { SettingsController, BusinessSettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [],
  controllers: [SettingsController, BusinessSettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}

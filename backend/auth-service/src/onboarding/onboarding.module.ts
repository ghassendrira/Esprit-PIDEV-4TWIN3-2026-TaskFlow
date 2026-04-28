import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService, JwtService],
})
export class OnboardingModule {}

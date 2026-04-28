import { Module } from '@nestjs/common';
import { MlController } from './ml.controller';
import { MlService } from './ml.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  controllers: [MlController],
  providers: [MlService, JwtAuthGuard],
  exports: [MlService],
})
export class MlModule {}

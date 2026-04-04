import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}

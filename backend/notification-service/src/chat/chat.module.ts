import { Module } from '@nestjs/common';
import { ChatPrismaService } from './prisma.service';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

@Module({
  controllers: [ChatController],
  providers: [ChatPrismaService, ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}

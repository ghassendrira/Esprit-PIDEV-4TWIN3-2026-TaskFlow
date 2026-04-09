import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: no token`);
        client.disconnect();
        return;
      }

      const secret = process.env.JWT_SECRET ?? 'change-me';
      const decoded: any = jwt.verify(token, secret);
      (client as any).user = decoded;
      this.logger.log(`Client connected: ${decoded.sub} (${decoded.name || decoded.email})`);
    } catch (err: any) {
      this.logger.warn(`Client ${client.id} disconnected: invalid token — ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    if (user) {
      this.logger.log(`Client disconnected: ${user.sub}`);
    }
  }

  @SubscribeMessage('joinTeamRoom')
  async handleJoinTeamRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { businessId: string },
  ) {
    const room = await this.chatService.getOrCreateTeamRoom(data.businessId);
    const roomKey = `team-${data.businessId}`;
    client.join(roomKey);
    client.emit('joinedRoom', { roomId: room.id, roomKey, type: 'BUSINESS_TEAM' });
  }

  @SubscribeMessage('joinSupportRoom')
  async handleJoinSupportRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const roomKey = `support-${data.roomId}`;
    client.join(roomKey);
    client.emit('joinedRoom', { roomId: data.roomId, roomKey, type: 'SUPPORT' });
  }

  @SubscribeMessage('sendTeamMessage')
  async handleTeamMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { businessId: string; content: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    try {
      const message = await this.chatService.sendTeamMessage(
        data.businessId,
        user.sub,
        user.name || user.firstName || 'User',
        user.roles?.[0] || 'TEAM_MEMBER',
        data.content,
      );

      this.server.to(`team-${data.businessId}`).emit('newMessage', message);
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  @SubscribeMessage('askTeamQuestion')
  async handleAskTeamQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { businessId: string; questionCode: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    try {
      const result = await this.chatService.askTeamQuestion(
        data.businessId,
        data.questionCode,
        user,
      );

      for (const message of result.messages) {
        this.server.to(`team-${data.businessId}`).emit('newMessage', message);
      }
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  @SubscribeMessage('sendSupportMessage')
  async handleSupportMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    try {
      const message = await this.chatService.sendSupportMessage(
        data.roomId,
        user.sub,
        user.name || user.firstName || 'User',
        user.roles?.[0] || 'BUSINESS_OWNER',
        data.content,
      );

      this.server.to(`support-${data.roomId}`).emit('newMessage', message);
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }
}

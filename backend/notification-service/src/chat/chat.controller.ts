import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  // ─── TEAM CHAT ───

  @Get('team/:businessId/messages')
  async getTeamMessages(
    @Param('businessId') businessId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    this.logger.log(`GET team messages for business ${businessId}`);
    return this.chatService.getTeamMessages(
      businessId,
      limit ? parseInt(limit, 10) : 100,
      before,
    );
  }

  @Post('team/:businessId/messages')
  async sendTeamMessage(
    @Param('businessId') businessId: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    const user = req.user;
    return this.chatService.sendTeamMessage(
      businessId,
      user.sub,
      user.name || user.firstName || 'User',
      user.roles?.[0] || 'TEAM_MEMBER',
      body.content,
    );
  }

  @Get('team/:businessId/room')
  async getTeamRoom(@Param('businessId') businessId: string) {
    return this.chatService.getOrCreateTeamRoom(businessId);
  }

  @Get('team/:businessId/questions')
  async getTeamQuestions(@Req() req: any) {
    return this.chatService.listTeamQuestions(req.user);
  }

  @Post('team/:businessId/questions/:questionCode/ask')
  async askTeamQuestion(
    @Param('businessId') businessId: string,
    @Param('questionCode') questionCode: string,
    @Req() req: any,
  ) {
    this.logger.log(
      `POST interactive question ${questionCode} for business ${businessId} by ${req.user?.sub}`,
    );
    return this.chatService.askTeamQuestion(businessId, questionCode, req.user);
  }

  // ─── SUPPORT CHAT ───

  @Get('support/rooms')
  async listSupportRooms(@Req() req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((r: string) => r.toUpperCase() === 'SUPER_ADMIN')) {
      throw new ForbiddenException('Only SUPER_ADMIN can list all support rooms');
    }
    return this.chatService.listSupportRooms();
  }

  @Post('support/:businessId/init')
  async initSupportRoom(@Param('businessId') businessId: string, @Req() req: any) {
    const user = req.user;
    return this.chatService.getOrCreateSupportRoom(businessId, user.sub);
  }

  @Get('support/:roomId/messages')
  async getSupportMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.getSupportMessages(
      roomId,
      limit ? parseInt(limit, 10) : 100,
      before,
    );
  }

  @Post('support/:roomId/messages')
  async sendSupportMessage(
    @Param('roomId') roomId: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    const user = req.user;
    return this.chatService.sendSupportMessage(
      roomId,
      user.sub,
      user.name || user.firstName || 'User',
      user.roles?.[0] || 'BUSINESS_OWNER',
      body.content,
    );
  }

  @Post('support/:roomId/read')
  async markAsRead(@Param('roomId') roomId: string, @Req() req: any) {
    return this.chatService.markAsRead(roomId, req.user.sub);
  }

  @Get('support/:roomId/unread')
  async getUnreadCount(@Param('roomId') roomId: string, @Req() req: any) {
    const count = await this.chatService.countUnread(roomId, req.user.sub);
    return { unread: count };
  }
}

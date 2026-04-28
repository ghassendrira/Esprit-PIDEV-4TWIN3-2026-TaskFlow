import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export type ChatMessageKind = 'FREE_TEXT' | 'PREDEFINED_QUESTION' | 'AUTOMATED_RESPONSE';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  kind?: ChatMessageKind;
  questionCode?: string | null;
  metadata?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  type: string;
  businessId: string;
  ownerId?: string;
  name: string;
  createdAt: string;
  messages?: ChatMessage[];
}

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private socket: Socket | null = null;

  readonly connected = signal(false);
  readonly supportMessages = signal<ChatMessage[]>([]);

  connect() {
    if (this.socket?.connected) return;

    const token = this.auth.token();
    if (!token) return;

    this.socket = io('http://localhost:3004/chat', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
    });

    this.socket.on('newMessage', (msg: ChatMessage) => {
      this.appendIncomingMessage(msg);
    });
  }

  private appendIncomingMessage(msg: ChatMessage) {
    const supportMsgs = this.supportMessages();

    if (supportMsgs.length > 0 && msg.roomId === supportMsgs[0]?.roomId) {
      if (!supportMsgs.find((message) => message.id === msg.id)) {
        this.supportMessages.set([...supportMsgs, msg]);
      }
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  // ─── SUPPORT CHAT ───

  loadSupportRooms() {
    return this.api.get<ChatRoom[]>('/chat/support/rooms');
  }

  initSupportRoom(businessId: string) {
    return this.api.post<ChatRoom>(`/chat/support/${businessId}/init`, {});
  }

  joinSupportRoom(roomId: string) {
    this.socket?.emit('joinSupportRoom', { roomId });
  }

  loadSupportMessages(roomId: string) {
    this.api.get<ChatMessage[]>(`/chat/support/${roomId}/messages`).subscribe({
      next: (messages) => this.supportMessages.set(messages),
      error: (err) => console.error('Failed to load support messages', err),
    });
  }

  sendSupportMessage(roomId: string, content: string) {
    if (this.socket?.connected) {
      this.socket.emit('sendSupportMessage', { roomId, content });
      return;
    }

    this.api.post<ChatMessage>(`/chat/support/${roomId}/messages`, { content }).subscribe({
      next: (message) => {
        this.supportMessages.update((messages) => [...messages, message]);
      },
      error: (err) => console.error('Failed to send support message', err),
    });
  }

  markSupportRead(roomId: string) {
    return this.api.post<any>(`/chat/support/${roomId}/read`, {});
  }

  getSupportUnread(roomId: string) {
    return this.api.get<{ unread: number }>(`/chat/support/${roomId}/unread`);
  }

  ngOnDestroy() {
    this.disconnect();
  }
}

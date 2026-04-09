import { Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { NgFor, NgIf, DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage, ChatRoom } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'tf-support-chat',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, NgClass, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-120px)] max-w-5xl mx-auto rounded-xl overflow-hidden"
         style="border: 1px solid var(--tf-border);">

      <!-- Left panel: room list (SUPER_ADMIN only) -->
      <div *ngIf="isSuperAdmin()" class="w-72 flex-shrink-0 border-r flex flex-col"
           style="border-color: var(--tf-border); background: var(--tf-surface);">
        <div class="px-4 py-4 border-b" style="border-color: var(--tf-border);">
          <h3 class="font-bold text-sm" style="color: var(--tf-heading);">
            <i class="fa-solid fa-headset mr-2"></i>Support Inbox
          </h3>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div *ngIf="rooms().length === 0" class="p-4 text-center text-sm" style="color: var(--tf-muted);">
            No support conversations yet.
          </div>
          <button *ngFor="let room of rooms()"
                  (click)="selectRoom(room)"
                  class="w-full px-4 py-3 text-left hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors border-b"
                  [ngClass]="selectedRoomId() === room.id ? 'bg-primary-50 dark:bg-primary-900/10' : ''"
                  style="border-color: var(--tf-border);">
            <p class="text-sm font-semibold truncate" style="color: var(--tf-text);">{{ room.name }}</p>
            <p class="text-xs truncate" style="color: var(--tf-muted);">
              {{ room.messages?.[0]?.content || 'No messages' }}
            </p>
          </button>
        </div>
      </div>

      <!-- Right panel: chat area -->
      <div class="flex-1 flex flex-col">
        <!-- Header -->
        <div class="flex items-center gap-3 px-6 py-4 border-b" style="border-color: var(--tf-border); background: var(--tf-surface);">
          <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <i class="fa-solid fa-headset text-purple-600 dark:text-purple-400"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold" style="color: var(--tf-heading);">
              {{ isSuperAdmin() ? (selectedRoomName() || 'Select a conversation') : 'Support Chat' }}
            </h2>
            <p class="text-xs" style="color: var(--tf-muted);">
              {{ isSuperAdmin() ? 'Reply to business owners' : 'Chat with the admin team' }}
            </p>
          </div>
        </div>

        <!-- Messages -->
        <div #scrollContainer class="flex-1 overflow-y-auto px-6 py-4 space-y-3" style="background: var(--tf-bg);">
          <div *ngIf="!selectedRoomId() && isSuperAdmin()"
               class="flex flex-col items-center justify-center h-full opacity-50">
            <i class="fa-solid fa-inbox text-4xl mb-2" style="color: var(--tf-muted);"></i>
            <p style="color: var(--tf-muted);">Select a conversation from the left panel.</p>
          </div>

          <div *ngIf="selectedRoomId() && chatService.supportMessages().length === 0"
               class="flex flex-col items-center justify-center h-full opacity-50">
            <i class="fa-solid fa-comments text-4xl mb-2" style="color: var(--tf-muted);"></i>
            <p style="color: var(--tf-muted);">No messages yet. Start the conversation!</p>
          </div>

          <div *ngFor="let msg of chatService.supportMessages()"
               class="flex"
               [ngClass]="msg.senderId === userId() ? 'justify-end' : 'justify-start'">
            <div class="max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm"
                 [ngClass]="msg.senderId === userId()
                   ? 'bg-purple-600 text-white rounded-br-md'
                   : 'rounded-bl-md'"
                 [style]="msg.senderId !== userId() ? 'background: var(--tf-surface-2); color: var(--tf-text);' : ''">
              <div *ngIf="msg.senderId !== userId()" class="text-xs font-semibold mb-1 opacity-70">
                {{ msg.senderName }}
                <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] uppercase"
                      style="background: var(--tf-border);">{{ msg.senderRole }}</span>
              </div>
              <p class="text-sm whitespace-pre-wrap break-words">{{ msg.content }}</p>
              <p class="text-[10px] mt-1 opacity-60 text-right">
                {{ msg.createdAt | date:'HH:mm' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div *ngIf="selectedRoomId()" class="px-6 py-4 border-t"
             style="border-color: var(--tf-border); background: var(--tf-surface);">
          <form (ngSubmit)="send()" class="flex gap-3">
            <input
              [(ngModel)]="newMessage"
              name="message"
              type="text"
              placeholder="Type a message..."
              class="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-purple-500"
              style="background: var(--tf-surface-2); color: var(--tf-text); border: 1px solid var(--tf-border);"
              autocomplete="off"
            />
            <button
              type="submit"
              [disabled]="!newMessage.trim()"
              class="px-5 py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <i class="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class SupportChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  chatService = inject(ChatService);
  private auth = inject(AuthService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  newMessage = '';
  rooms = signal<ChatRoom[]>([]);
  selectedRoomId = signal<string>('');
  selectedRoomName = signal<string>('');
  userId = signal('');
  isSuperAdmin = signal(false);
  private shouldScroll = true;

  ngOnInit() {
    const user = this.auth.user();
    this.userId.set(user?.id ?? '');
    this.isSuperAdmin.set(this.auth.hasRole('SUPER_ADMIN'));

    this.chatService.connect();

    if (this.isSuperAdmin()) {
      // Load all support rooms
      this.chatService.loadSupportRooms().subscribe({
        next: rooms => this.rooms.set(rooms),
        error: err => console.error('Failed to load support rooms', err),
      });
    } else {
      // Owner: auto-init support room
      const businessId = localStorage.getItem('tenantId') ?? '';
      if (businessId) {
        this.chatService.initSupportRoom(businessId).subscribe({
          next: room => {
            this.selectedRoomId.set(room.id);
            this.selectedRoomName.set('Support');
            this.chatService.loadSupportMessages(room.id);
            setTimeout(() => this.chatService.joinSupportRoom(room.id), 500);
          },
          error: err => console.error('Failed to init support room', err),
        });
      }
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
    }
  }

  selectRoom(room: ChatRoom) {
    this.selectedRoomId.set(room.id);
    this.selectedRoomName.set(room.name);
    this.chatService.loadSupportMessages(room.id);
    this.chatService.joinSupportRoom(room.id);
    this.chatService.markSupportRead(room.id).subscribe();
    this.shouldScroll = true;
  }

  send() {
    const content = this.newMessage.trim();
    const roomId = this.selectedRoomId();
    if (!content || !roomId) return;

    this.chatService.sendSupportMessage(roomId, content);
    this.newMessage = '';
    this.shouldScroll = true;
  }

  private scrollToBottom() {
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  ngOnDestroy() {}
}

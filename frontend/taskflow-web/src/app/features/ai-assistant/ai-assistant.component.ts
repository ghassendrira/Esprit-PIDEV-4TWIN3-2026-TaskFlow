import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiChatService, ChatMessage } from '../../core/services/ai-chat.service';

interface DisplayMessage extends ChatMessage {
  _showSources?: boolean;
}

@Component({
  selector: 'tf-ai-assistant',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, FormsModule],
  template: `
    <div class="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto rounded-xl overflow-hidden"
         style="border: 1px solid var(--tf-border);">
      <div class="flex items-center gap-3 px-6 py-4 border-b"
           style="border-color: var(--tf-border); background: var(--tf-surface);">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <i class="fa-solid fa-robot text-emerald-600 dark:text-emerald-400"></i>
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-bold" style="color: var(--tf-heading);">Finance AI Assistant</h2>
          <p class="text-xs" style="color: var(--tf-muted);">Posez vos questions sur la finance</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full" [class]="isOnline() ? 'bg-emerald-500' : 'bg-red-500'"></span>
          <span class="text-xs" style="color: var(--tf-muted);">{{ isOnline() ? 'En ligne' : 'Hors ligne' }}</span>
        </div>
      </div>
      <div #scrollContainer class="flex-1 overflow-y-auto px-6 py-4 space-y-4" style="background: var(--tf-bg);">
        <div *ngIf="messages().length === 0" class="flex flex-col items-center justify-center h-full text-center">
          <div class="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
            <i class="fa-solid fa-robot text-2xl text-emerald-600 dark:text-emerald-400"></i>
          </div>
          <h3 class="text-lg font-bold mb-2" style="color: var(--tf-heading);">Bienvenue !</h3>
          <p class="text-sm max-w-md" style="color: var(--tf-muted);">
            Je suis votre assistant financier. Posez-moi des questions sur la comptabilit&eacute;, les ratios, les formules, etc.
          </p>
          <div class="flex flex-wrap gap-2 mt-4 justify-center">
            <button *ngFor="let q of suggestions"
                    (click)="askSuggestion(q)"
                    class="px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                    style="border: 1px solid var(--tf-border); color: var(--tf-text);">
              {{ q }}
            </button>
          </div>
        </div>
        <div *ngFor="let msg of messages()" class="flex" [class]="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          <div class="max-w-[80%]">
            <div class="rounded-2xl px-4 py-3 shadow-sm"
                 [class]="msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-md' : 'rounded-bl-md'"
                 [style]="msg.role !== 'user' ? 'background: var(--tf-surface); color: var(--tf-text); border: 1px solid var(--tf-border);' : ''">
              <p class="text-sm whitespace-pre-wrap break-words">{{ msg.content }}</p>
              <p class="text-[10px] mt-1 opacity-60 text-right">{{ msg.timestamp | date:'HH:mm' }}</p>
            </div>
            <div *ngIf="msg.sources && msg.sources.length > 0" class="mt-2 ml-2">
              <button (click)="toggleSources(msg)"
                      class="text-xs flex items-center gap-1 transition-colors hover:text-emerald-600"
                      style="color: var(--tf-muted);">
                <i class="fa-solid fa-book-open text-[10px]"></i>
                {{ msg._showSources ? 'Masquer' : 'Voir' }} les sources ({{ msg.sources.length }})
              </button>
              <div *ngIf="msg._showSources" class="mt-1 space-y-1">
                <div *ngFor="let src of msg.sources"
                     class="text-xs px-3 py-2 rounded-lg"
                     style="background: var(--tf-surface-2); color: var(--tf-muted);">
                  <span class="font-semibold">{{ src.source }}</span>
                  <span class="ml-1 opacity-60">({{ (src.score * 100).toFixed(0) }}%)</span>
                  <p class="mt-0.5 line-clamp-2">{{ src.text }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div *ngIf="isLoading()" class="flex justify-start">
          <div class="rounded-2xl rounded-bl-md px-4 py-3"
               style="background: var(--tf-surface); border: 1px solid var(--tf-border);">
            <div class="flex items-center gap-2">
              <div class="flex gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style="animation-delay: 0ms"></span>
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style="animation-delay: 150ms"></span>
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style="animation-delay: 300ms"></span>
              </div>
              <span class="text-xs" style="color: var(--tf-muted);">Reflexion en cours...</span>
            </div>
          </div>
        </div>
      </div>
      <div class="px-6 py-4 border-t" style="border-color: var(--tf-border); background: var(--tf-surface);">
        <form (ngSubmit)="send()" class="flex gap-3">
          <input [(ngModel)]="newMessage" name="message" type="text"
            placeholder="Posez votre question financiere..."
            class="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-emerald-500"
            style="background: var(--tf-surface-2); color: var(--tf-text); border: 1px solid var(--tf-border);"
            autocomplete="off" [disabled]="isLoading()" />
          <button type="submit" [disabled]="!newMessage.trim() || isLoading()"
            class="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  `,
})
export class AiAssistantComponent implements AfterViewChecked {
  private aiChat = inject(AiChatService);
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages = signal<DisplayMessage[]>([]);
  isLoading = signal(false);
  isOnline = signal(false);
  newMessage = '';
  private shouldScroll = false;

  suggestions = [
    "Qu'est-ce que l'EBITDA ?",
    'Comment calculer le ratio de liquidite ?',
    'Explique le modele CAPM',
    'Quelle est la formule du Sharpe Ratio ?',
  ];

  constructor() {
    this.aiChat.health().subscribe({
      next: () => this.isOnline.set(true),
      error: () => this.isOnline.set(false),
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  askSuggestion(q: string): void {
    this.newMessage = q;
    this.send();
  }

  toggleSources(msg: DisplayMessage): void {
    msg._showSources = !msg._showSources;
  }

  send(): void {
    const content = this.newMessage.trim();
    if (!content || this.isLoading()) return;

    const userMsg: DisplayMessage = { role: 'user', content, timestamp: new Date() };
    this.messages.update(msgs => [...msgs, userMsg]);
    this.newMessage = '';
    this.isLoading.set(true);
    this.shouldScroll = true;

    const history = this.messages().map(m => ({ role: m.role, content: m.content }));

    this.aiChat.send(content, history).subscribe({
      next: (res) => {
        const assistantMsg: DisplayMessage = {
          role: 'assistant', content: res.answer, sources: res.sources,
          timestamp: new Date(), _showSources: false,
        };
        this.messages.update(msgs => [...msgs, assistantMsg]);
        this.isLoading.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        const errorMsg: DisplayMessage = {
          role: 'assistant',
          content: "Desole, je n'ai pas pu traiter votre question. Verifiez que le serveur IA est demarre.",
          timestamp: new Date(),
        };
        this.messages.update(msgs => [...msgs, errorMsg]);
        this.isLoading.set(false);
        this.shouldScroll = true;
      },
    });
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) { el.scrollTop = el.scrollHeight; }
    } catch { /* ignore */ }
  }
}

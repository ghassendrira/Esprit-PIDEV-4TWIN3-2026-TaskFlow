import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { text: string; source: string; score: number }[];
  timestamp: Date;
}

interface ChatApiResponse {
  answer: string;
  sources: { text: string; source: string; score: number }[];
}

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private api = inject(ApiService);

  send(message: string, history: { role: string; content: string }[]): Observable<ChatApiResponse> {
    return this.api.post<ChatApiResponse>('/chatbot/chat', { message, history });
  }

  health(): Observable<any> {
    return this.api.get('/chatbot/health');
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  send(message: string, history: { role: string; content: string }[]): Observable<ChatApiResponse> {
    return this.http.post<ChatApiResponse>(`${this.apiUrl}/chat`, { message, history });
  }

  health(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = signal<string>(environment.apiUrl);
  
  setBaseUrl(url: string) {
    this.baseUrl.set(url.replace(/\/+$/, ''));
  }

  getBaseUrl(): string {
    return this.baseUrl();
  }

  private url(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl()}${normalized}`;
  }

  get<T>(path: string, options?: { headers?: HttpHeaders; params?: HttpParams; context?: HttpContext }): Observable<T> {
    return this.http.get<T>(this.url(path), options);
  }
  post<T>(path: string, body: unknown, options?: { headers?: HttpHeaders; params?: HttpParams; context?: HttpContext }): Observable<T> {
    return this.http.post<T>(this.url(path), body, options);
  }
  put<T>(path: string, body: unknown, options?: { headers?: HttpHeaders; params?: HttpParams; context?: HttpContext }): Observable<T> {
    return this.http.put<T>(this.url(path), body, options);
  }
  patch<T>(path: string, body: unknown, options?: { headers?: HttpHeaders; params?: HttpParams; context?: HttpContext }): Observable<T> {
    return this.http.patch<T>(this.url(path), body, options);
  }
  delete<T>(path: string, options?: { headers?: HttpHeaders; params?: HttpParams; context?: HttpContext }): Observable<T> {
    return this.http.delete<T>(this.url(path), options);
  }

  postBlob(path: string, body: unknown, options?: { headers?: HttpHeaders; params?: HttpParams; context?: HttpContext }): Observable<Blob> {
    return this.http.post(this.url(path), body, {
      ...options,
      responseType: 'blob',
    });
  }
}

import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { BusinessSelectionService } from './business-selection.service';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceDetail {
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  totalAmount: number;
  taxAmount: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class InvoicePdfService {
  private http = inject(HttpClient);
  private businessSelection = inject(BusinessSelectionService);
  private apiUrl = 'http://localhost:3004';

  downloadInvoicePdf(invoiceId: string): Observable<HttpResponse<Blob>> {
    const tenantId = this.businessSelection.selectedTenantId()
      || localStorage.getItem('activeTenantId')
      || localStorage.getItem('tenantId')
      || localStorage.getItem('businessTenantId')
      || '';

    let headers = new HttpHeaders().set('Accept', 'application/pdf');
    if (tenantId) {
      headers = headers.set('X-Tenant-Id', tenantId);
    }
    // Authorization is attached automatically by `jwtInterceptor`.

    return this.http.get(
      `${this.apiUrl}/notification/invoice-pdf`,
      {
        headers,
        params: { invoiceId },
        responseType: 'blob',
        observe: 'response'
      }
    ).pipe(
      map((response: HttpResponse<Blob>) => response),
      catchError(error => {
        console.error('PDF Error détaillé:', error);

        if (error.status === 0) {
          throw new Error(
            'Service PDF inaccessible. ' +
            'Vérifiez que le serveur tourne sur le port 3004'
          );
        }
        if (error.status === 401) {
          throw new Error('Non autorisé: Session expirée ou jeton manquant');
        }
        if (error.status === 403) {
          throw new Error('Accès refusé au PDF');
        }
        if (error.status === 404) {
          throw new Error('Facture introuvable');
        }
        throw new Error('Erreur génération PDF');
      })
    );
  }
}

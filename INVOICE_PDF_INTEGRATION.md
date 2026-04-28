# Intégration PDF Invoice - TaskFlow

## 🎯 Vue d'ensemble

Le système de génération PDF d'invoice a été intégré dans le service de notification. Vous pouvez maintenant générer et télécharger des PDFs d'invoices professionnels directement depuis votre application.

## 📍 Endpoints Disponibles

### 1. Générer PDF d'Invoice
```
POST /notification/invoice-pdf
```

**Description:** Génère et retourne un PDF d'invoice basé sur les données fournies.

**Content-Type:** `application/json`

**Response:** PDF file (application/pdf) avec header `Content-Disposition: attachment`

## 📝 Format des Données

```json
{
  "invoiceNumber": "INV-2026-00042",
  "issueDate": "April 7, 2026",
  "dueDate": "May 7, 2026",
  "businessName": "TaskFlow Inc.",
  "businessAddress": "123 Business Street, San Francisco, CA 94102",
  "businessPhone": "+1 (555) 123-4567",
  "clientName": "Acme Corporation",
  "clientEmail": "john.smith@acme.com",
  "clientAddress": "456 Enterprise Ave, New York, NY 10001",
  "items": [
    {
      "description": "TaskFlow Pro - Annual Subscription",
      "quantity": 1,
      "unitPrice": 3600
    }
  ],
  "subtotal": 5000,
  "taxRate": 0.08,
  "taxAmount": 400,
  "totalAmount": 5400,
  "notes": "Thank you for your business!",
  "status": "PENDING",
  "currency": "$"
}
```

## 🚀 Utilisation

### Frontend (JavaScript)

```javascript
const downloadInvoicePdf = async (invoiceData) => {
  try {
    const response = await fetch('/notification/invoice-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData),
    });

    if (!response.ok) throw new Error('Failed to generate PDF');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceData.invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### cURL

```bash
curl -X POST http://localhost:3000/notification/invoice-pdf \
  -H "Content-Type: application/json" \
  -d @invoice-data.json \
  --output invoice-INV-2026-00042.pdf
```

### Postman
1. **Method:** POST
2. **URL:** `http://localhost:3000/notification/invoice-pdf`
3. **Headers:** `Content-Type: application/json`
4. **Body:** Raw JSON avec les données d'invoice
5. **Send** → Le PDF se téléchargera automatiquement

## 🧪 Test

### Démarrer le service
```bash
cd backend/notification-service
npm run start:dev
```

### Lancer le test
```bash
node test-invoice-pdf.js
```

## 📋 Champs Obligatoires

| Champ | Type | Description |
|-------|------|-------------|
| `invoiceNumber` | string | Numéro unique de l'invoice |
| `issueDate` | string | Date d'émission |
| `dueDate` | string | Date d'échéance |
| `businessName` | string | Nom de l'entreprise |
| `clientName` | string | Nom du client |
| `items` | array | Liste des articles |
| `status` | string | Statut (PENDING, PAID, OVERDUE) |

## 📋 Champs Optionnels

| Champ | Type | Défaut | Description |
|-------|------|--------|-------------|
| `businessAddress` | string | "" | Adresse de l'entreprise |
| `businessPhone` | string | "" | Téléphone de l'entreprise |
| `clientEmail` | string | "" | Email du client |
| `clientAddress` | string | "" | Adresse du client |
| `subtotal` | number | calculé | Sous-total |
| `taxRate` | number | 0.08 | Taux de taxe (8%) |
| `taxAmount` | number | calculé | Montant de la taxe |
| `totalAmount` | number | calculé | Total |
| `notes` | string | "" | Notes additionnelles |
| `currency` | string | "$" | Devise |

## 🎨 Design du PDF

- **Format:** A4 (210mm × 297mm)
- **Marge:** 0.5 pouce de chaque côté
- **Police:** Système (Arial, sans-serif)
- **Couleur principale:** #4F46E5 (violet TaskFlow)
- **Mode sombre/clair:** Support automatique
- **Impression:** Optimisé pour l'impression

## 🔧 Intégration avec la Base de Données

Pour intégrer avec vos données réelles :

```javascript
// Exemple d'intégration avec Prisma
const invoice = await prisma.invoice.findUnique({
  where: { id: invoiceId },
  include: { items: true, client: true }
});

const pdfData = {
  invoiceNumber: invoice.number,
  issueDate: invoice.createdAt.toLocaleDateString(),
  dueDate: invoice.dueDate.toLocaleDateString(),
  businessName: 'TaskFlow Inc.',
  clientName: invoice.client.name,
  // ... mapper les autres champs
  items: invoice.items.map(item => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice
  }))
};

await downloadInvoicePdf(pdfData);
```

## 🚨 Dépannage

### Erreur 500
- Vérifiez que Puppeteer est installé : `npm install puppeteer`
- Vérifiez les logs du serveur pour les détails de l'erreur

### PDF vide ou corrompu
- Vérifiez que toutes les données requises sont fournies
- Assurez-vous que les montants sont des nombres valides

### Timeout
- La génération peut prendre quelques secondes
- Augmentez le timeout côté client si nécessaire

## 📚 Ressources

- [Template HTML statique](invoice-template.html)
- [Générateur JavaScript](invoice-generator.js)
- [Guide complet du design](INVOICE_DESIGN_GUIDE.md)
- [Exemples d'utilisation](invoice-pdf-example.js)

---

**Service:** notification-service  
**Endpoint:** `POST /notification/invoice-pdf`  
**Version:** 1.0  
**Date:** April 7, 2026
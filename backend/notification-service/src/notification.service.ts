import { Injectable } from '@nestjs/common';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

type WelcomeParams = { email: string; fullName: string; userId: string };
type AdminRegistrationParams = {
  adminEmail: string;
  applicantName: string;
  applicantEmail: string;
  companyName: string;
};
type ApprovalEmailParams = {
  email: string;
  fullName: string;
  tempPassword: string;
};
type RejectionEmailParams = {
  email: string;
  fullName: string;
  reason: string;
};

type EmployeeWelcomeEmailParams = {
  email: string;
  fullName: string;
  role: string;
  tempPassword: string;
  companyName: string;
};

type ResetPasswordParams = {
  email: string;
  firstName: string;
  lastName: string;
  resetToken: string;
};

type SendInvoiceEmailParams = {
  email: string;
  clientName: string;
  businessName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
};

type ExpenseNotificationParams = {
  email: string;
  userName: string;
  amount: number;
  message: string;
  link: string;
};

type AdminPasswordRequestParams = {
  userEmail: string;
  userName: string;
  userId: string;
};

@Injectable()
export class NotificationService {
  async sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    const from = process.env.MAIL_FROM ?? 'TaskFlow <noreply@taskflow.tn>';
    const client = SibApiV3Sdk.ApiClient.instance;
    (client.authentications as any)['api-key'].apiKey = apiKey;
    const api = new (SibApiV3Sdk as any).TransactionalEmailsApi();

    const logoUrl = 'https://via.placeholder.com/150x50/4F46E5/FFFFFF?text=TaskFlow';
    const primaryColor = '#4F46E5';

    const itemsHtml = (params.items || []).map(it => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:14px">${this.escapeHtml(it.description || '')}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:center">${it.quantity || 0}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right">${(Number(it.unitPrice) || 0).toFixed(2)}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;font-weight:bold">${(Number(it.amount) || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const subtotal = Number(params.subtotal) || 0;
    const taxAmount = Number(params.taxAmount) || 0;
    const totalAmount = Number(params.totalAmount) || 0;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow Invoice</title>
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
    }
    .email-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
    }
    .header {
      background-color: ${primaryColor};
      padding: 20px;
      text-align: center;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .content {
      padding: 30px 20px;
    }
    .card {
      background-color: #f8f9fa;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 15px;
      text-align: center;
    }
    .message {
      margin-bottom: 20px;
    }
    .invoice-details {
      background-color: #e8eaf6;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .invoice-table th {
      background-color: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
    }
    .invoice-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    .invoice-table td:nth-child(2) { text-align: center; }
    .invoice-table td:nth-child(3), .invoice-table td:nth-child(4) { text-align: right; }
    .total-section {
      margin-left: auto;
      width: 240px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      color: #475569;
    }
    .total-row.total {
      border-top: 2px solid #e2e8f0;
      margin-top: 8px;
      padding-top: 16px;
      font-weight: bold;
      color: #0f172a;
      font-size: 18px;
    }
    .notes {
      margin-top: 20px;
      padding: 15px;
      border-radius: 6px;
      border: 1px dashed #e2e8f0;
      background-color: #fcfcfc;
    }
    .notes h4 {
      margin: 0 0 8px 0;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: #64748b;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .content {
        padding: 20px 15px;
      }
      .title {
        font-size: 20px;
      }
      .total-section {
        width: 100%;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">
  <table class="email-container" cellpadding="0" cellspacing="0" border="0" align="center">
    <tr>
      <td class="header">
        <img src="${logoUrl}" alt="TaskFlow Logo" class="logo" style="display: block; margin: 0 auto;">
      </td>
    </tr>
    <tr>
      <td class="content">
        <div class="card">
          <h1 class="title">Invoice from ${this.escapeHtml(params.businessName)}</h1>
          <p class="message">Hi ${this.escapeHtml(params.clientName)},</p>
          <p class="message">Please find below the details of your invoice ${this.escapeHtml(params.invoiceNumber)}.</p>

          <div class="invoice-details">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b;">Issue Date</span>
              <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${params.issueDate ? new Date(params.issueDate).toLocaleDateString('en-US') : '---'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b;">Due Date</span>
              <span style="font-size: 14px; font-weight: 700; color: #ef4444;">${params.dueDate ? new Date(params.dueDate).toLocaleDateString('en-US') : '---'}</span>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span style="font-weight: 600;">${subtotal.toFixed(2)} TND</span>
            </div>
            <div class="total-row">
              <span>Tax:</span>
              <span style="font-weight: 600;">+${taxAmount.toFixed(2)} TND</span>
            </div>
            <div class="total-row total">
              <span>TOTAL:</span>
              <span style="color: ${primaryColor};">${totalAmount.toFixed(2)} TND</span>
            </div>
          </div>

          ${params.notes ? `
          <div class="notes">
            <h4>Notes & Payment Instructions</h4>
            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #475569;">${this.escapeHtml(params.notes)}</p>
          </div>
          ` : ''}

          <div style="margin-top: 30px; text-align: center; padding-top: 20px; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">This email was sent by ${this.escapeHtml(params.businessName)} via TaskFlow.</p>
          </div>
        </div>
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p>© 2026 TaskFlow. All rights reserved.</p>
        <p>Questions? Contact us at <a href="mailto:support@taskflow.com" style="color: ${primaryColor};">support@taskflow.com</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      const sender = this.parseSender(from);
      await api.sendTransacEmail({
        sender,
        to: [{ email: params.email, name: params.clientName }],
        subject: `Invoice ${params.invoiceNumber} from ${params.businessName} - TaskFlow`,
        htmlContent: html,
      });
      console.log('Brevo invoice email sent result for:', params.invoiceNumber);
    } catch (e) {
      console.error('Brevo invoice email error:', e);
      throw new Error('Failed to send invoice email');
    }
  }
  async sendWelcomeEmail({ email, fullName }: WelcomeParams): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    const from = process.env.MAIL_FROM ?? 'TaskFlow <noreply@taskflow.tn>';
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:4200').replace(/\/+$/, '');
    const client = SibApiV3Sdk.ApiClient.instance;
    (client.authentications as any)['api-key'].apiKey = apiKey;
    const api = new (SibApiV3Sdk as any).TransactionalEmailsApi();

    const bg = '#0d2418';
    const primary = '#1e7a3e';
    const link = `${frontend}/onboarding/company-setup`;
    const html = `
      <div style="background:${bg};padding:24px;font-family:Arial,sans-serif;color:#eaf2ec">
        <div style="max-width:640px;margin:0 auto;background:#0f2b1d;border-radius:10px;overflow:hidden">
          <div style="padding:24px">
            <h1 style="margin:0 0 12px 0;color:#eaf2ec;font-size:22px">Bienvenue sur TaskFlow 🎉</h1>
            <p style="margin:0 0 16px 0;color:#cfe0d6">Bonjour ${this.escapeHtml(fullName)},</p>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              Bienvenue sur TaskFlow ! Pour commencer, complétez votre profil en 2 étapes simples :
            </p>
            <div style="display:flex;gap:12px;margin:18px 0">
              <div style="flex:1;background:#123424;border:1px solid #1a4a30;border-radius:8px;padding:14px">
                <div style="font-size:20px">🏢</div>
                <div style="font-weight:bold;margin-top:6px;color:#eaf2ec">Configuration de l'entreprise</div>
                <div style="margin-top:6px;color:#cfe0d6">Ajoutez votre adresse, téléphone et logo</div>
              </div>
              <div style="flex:1;background:#123424;border:1px solid #1a4a30;border-radius:8px;padding:14px">
                <div style="font-size:20px">💼</div>
                <div style="font-weight:bold;margin-top:6px;color:#eaf2ec">Créer votre Business</div>
                <div style="margin-top:6px;color:#cfe0d6">Configurez votre devise (TND) et taux de TVA (19%)</div>
              </div>
            </div>
            <a href="${link}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold">
              Commencer la configuration →
            </a>
            <p style="margin-top:24px;color:#86b29a;font-size:12px">© 2026 TaskFlow | Tunis, Tunisie</p>
          </div>
        </div>
      </div>
    `;

    try {
      const sender = this.parseSender(from);
      const res = await api.sendTransacEmail({
        sender,
        to: [{ email, name: fullName }],
        subject: 'Bienvenue sur TaskFlow 🎉',
        htmlContent: html,
      });
      console.log('Brevo send result:', res?.messageId ?? '');
    } catch (e) {
      console.log('Brevo send error:', e);
    }
  }

  private escapeHtml(s: string): string {
    return String(s).replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#039;';
        default:
          return ch;
      }
    });
  }

  private parseSender(from: string): { email: string; name?: string } {
    const m = from.match(/^(.*)<(.+)>$/);
    if (m) {
      return { name: m[1].trim().replace(/(^"|"$)/g, ''), email: m[2].trim() };
    }
    return { email: from.trim() };
  }

  async sendAdminRegistrationNotification(params: AdminRegistrationParams): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:4200').replace(/\/+$/, '');
    const from = process.env.MAIL_FROM ?? 'TaskFlow <noreply@taskflow.tn>';
    const client = SibApiV3Sdk.ApiClient.instance;
    (client.authentications as any)['api-key'].apiKey = apiKey;
    const api = new (SibApiV3Sdk as any).TransactionalEmailsApi();

    const bg = '#0d2418';
    const primary = '#1e7a3e';
    const link = `${frontend}/admin/registrations`;
    const html = `
      <div style="background:${bg};padding:24px;font-family:Arial,sans-serif;color:#eaf2ec">
        <div style="max-width:640px;margin:0 auto;background:#0f2b1d;border-radius:10px;overflow:hidden">
          <div style="padding:24px">
            <h1 style="margin:0 0 12px 0;color:#eaf2ec;font-size:22px">New Registration Request - TaskFlow</h1>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              A new business owner has requested access to TaskFlow.
            </p>
            <div style="margin:16px 0;padding:14px;border-radius:8px;background:#123424;border:1px solid #1a4a30;color:#cfe0d6">
              <div><strong>Name:</strong> ${this.escapeHtml(params.applicantName)}</div>
              <div><strong>Email:</strong> ${this.escapeHtml(params.applicantEmail)}</div>
              <div><strong>Company:</strong> ${this.escapeHtml(params.companyName)}</div>
            </div>
            <a href="${link}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold">
              Review Request
            </a>
            <p style="margin-top:24px;color:#86b29a;font-size:12px">© 2026 TaskFlow</p>
          </div>
        </div>
      </div>
    `;

    try {
      const sender = this.parseSender(from);
      await api.sendTransacEmail({
        sender,
        to: [{ email: params.adminEmail }],
        subject: 'New Registration Request - TaskFlow',
        htmlContent: html,
      });
    } catch (e) {
      console.log('Brevo admin registration email error:', e);
    }
  }

  async sendApprovalEmail(params: ApprovalEmailParams): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is missing');
    }
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:4200').replace(/\/+$/, '');
    const from = process.env.MAIL_FROM ?? 'TaskFlow <noreply@taskflow.tn>';
    const client = SibApiV3Sdk.ApiClient.instance;
    (client.authentications as any)['api-key'].apiKey = apiKey;
    const api = new (SibApiV3Sdk as any).TransactionalEmailsApi();

    const bg = '#0d2418';
    const primary = '#1e7a3e';
    const link = `${frontend}/auth/login`;
    const html = `
      <div style="background:${bg};padding:24px;font-family:Arial,sans-serif;color:#eaf2ec">
        <div style="max-width:640px;margin:0 auto;background:#0f2b1d;border-radius:10px;overflow:hidden">
          <div style="padding:24px">
            <h1 style="margin:0 0 12px 0;color:#eaf2ec;font-size:22px">Your TaskFlow Account is Approved! 🎉</h1>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              Congratulations ${this.escapeHtml(params.fullName)}! Your TaskFlow account has been approved.
            </p>
            <div style="margin:16px 0;padding:14px;border-radius:8px;background:#123424;border:1px solid #1a4a30;color:#cfe0d6">
              <div><strong>Email:</strong> ${this.escapeHtml(params.email)}</div>
              <div><strong>Temporary password:</strong> ${this.escapeHtml(params.tempPassword)}</div>
            </div>
            <a href="${link}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold">
              Login Now
            </a>
            <p style="margin-top:16px;color:#cfe0d6;font-size:13px">
              Please change your password after your first login.
            </p>
            <p style="margin-top:24px;color:#86b29a;font-size:12px">© 2026 TaskFlow</p>
          </div>
        </div>
      </div>
    `;

    const sender = this.parseSender(from);
    try {
      await api.sendTransacEmail({
        sender,
        to: [{ email: params.email, name: params.fullName }],
        subject: 'Your TaskFlow Account is Approved! 🎉',
        htmlContent: html,
      });
    } catch (e) {
      console.log('Brevo approval email error:', e);
      throw new Error('Failed to send approval email');
    }
  }

  async sendRejectionEmail(params: RejectionEmailParams): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is missing');
    }
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:4200').replace(/\/+$/, '');
    const from = process.env.MAIL_FROM ?? 'TaskFlow <noreply@taskflow.tn>';
    const client = SibApiV3Sdk.ApiClient.instance;
    (client.authentications as any)['api-key'].apiKey = apiKey;
    const api = new (SibApiV3Sdk as any).TransactionalEmailsApi();

    const bg = '#0d2418';
    const primary = '#1e7a3e';
    const link = `${frontend}/auth/register`;
    const html = `
      <div style="background:${bg};padding:24px;font-family:Arial,sans-serif;color:#eaf2ec">
        <div style="max-width:640px;margin:0 auto;background:#0f2b1d;border-radius:10px;overflow:hidden">
          <div style="padding:24px">
            <h1 style="margin:0 0 12px 0;color:#eaf2ec;font-size:22px">TaskFlow Registration Update</h1>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              Unfortunately, your registration was not approved.
            </p>
            <div style="margin:16px 0;padding:14px;border-radius:8px;background:#3b211f;border:1px solid #6b2c2c;color:#f3d1d1">
              <div><strong>Reason:</strong></div>
              <div>${this.escapeHtml(params.reason)}</div>
            </div>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              If you believe this is a mistake, please contact our support team or reply to this email.
            </p>
            <a href="${link}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:bold">
              Visit TaskFlow
            </a>
            <p style="margin-top:24px;color:#86b29a;font-size:12px">© 2026 TaskFlow</p>
          </div>
        </div>
      </div>
    `;

    const sender = this.parseSender(from);
    try {
      await api.sendTransacEmail({
        sender,
        to: [{ email: params.email, name: params.fullName }],
        subject: 'TaskFlow Registration Update',
        htmlContent: html,
      });
    } catch (e) {
      console.log('Brevo rejection email error:', e);
      throw new Error('Failed to send rejection email');
    }
  }

  async sendEmployeeWelcomeEmail(
    params: EmployeeWelcomeEmailParams,
  ): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:4200').replace(/\/+$/, '');
    const from = process.env.MAIL_FROM ?? 'TaskFlow <noreply@taskflow.tn>';

    const client = SibApiV3Sdk.ApiClient.instance;
    (client.authentications as any)['api-key'].apiKey = apiKey;
    const api = new (SibApiV3Sdk as any).TransactionalEmailsApi();

    const bg = '#0d2418';
    const primary = '#1e7a3e';
    const loginLink = `${frontend}/auth/login`;

    const html = `
      <div style="background:${bg};padding:24px;font-family:Arial,sans-serif;color:#eaf2ec">
        <div style="max-width:640px;margin:0 auto;background:#0f2b1d;border-radius:10px;overflow:hidden">
          <div style="padding:24px">
            <h1 style="margin:0 0 12px 0;color:#eaf2ec;font-size:22px">Bienvenue dans l'équipe - TaskFlow 🎉</h1>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              Bonjour ${this.escapeHtml(params.fullName)},
            </p>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              Votre compte a été créé sur TaskFlow par votre entreprise ${this.escapeHtml(params.companyName)}.
            </p>
            <div style="margin:16px 0;padding:14px;border-radius:8px;background:#123424;border:1px solid #1a4a30;color:#cfe0d6">
              <div><strong>Votre rôle:</strong> ${this.escapeHtml(params.role)}</div>
              <div style="margin-top:10px"><strong>Vos informations de connexion:</strong></div>
              <div><strong>Email:</strong> ${this.escapeHtml(params.email)}</div>
              <div><strong>Mot de passe temporaire:</strong> ${this.escapeHtml(params.tempPassword)}</div>
            </div>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              Veuillez changer votre mot de passe lors de votre première connexion.
            </p>
            <a href="${loginLink}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold">
              Se connecter
            </a>
            <p style="margin-top:24px;color:#86b29a;font-size:12px">© 2026 TaskFlow | Tunis, Tunisie</p>
          </div>
        </div>
      </div>
    `;

    try {
      const sender = this.parseSender(from);
      await api.sendTransacEmail({
        sender,
        to: [{ email: params.email, name: params.fullName }],
        subject: "Bienvenue dans l'équipe - TaskFlow 🎉",
        htmlContent: html,
      });
    } catch (e) {
      console.log('Brevo employee-welcome email error:', e);
    }
  }

  async sendResetPasswordEmail(params: ResetPasswordParams): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:4200').replace(/\/+$/, '');
    const from = process.env.MAIL_FROM ?? 'TaskFlow <noreply@taskflow.tn>';
    const client = SibApiV3Sdk.ApiClient.instance;
    (client.authentications as any)['api-key'].apiKey = apiKey;
    const api = new (SibApiV3Sdk as any).TransactionalEmailsApi();

    const bg = '#0d2418';
    const primary = '#1e7a3e';
    const resetLink = `${frontend}/reset-password?token=${params.resetToken}`;

    const html = `
      <div style="background:${bg};padding:24px;font-family:Arial,sans-serif;color:#eaf2ec">
        <div style="max-width:640px;margin:0 auto;background:#0f2b1d;border-radius:10px;overflow:hidden">
          <div style="padding:24px">
            <h1 style="margin:0 0 12px 0;color:#eaf2ec;font-size:22px">Réinitialisation de mot de passe - TaskFlow</h1>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              Bonjour ${this.escapeHtml(params.firstName)},
            </p>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              Vous avez demandé la réinitialisation de votre mot de passe TaskFlow.
            </p>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valide pendant 15 minutes.
            </p>
            <a href="${resetLink}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold">
              Réinitialiser mon mot de passe
            </a>
            <p style="margin-top:16px;color:#cfe0d6;font-size:13px">
              Si vous n'avez pas demandé cette action, vous pouvez ignorer cet email en toute sécurité.
            </p>
            <p style="margin-top:24px;color:#86b29a;font-size:12px">© 2026 TaskFlow | Tunis, Tunisie</p>
          </div>
        </div>
      </div>
    `;

    try {
      const sender = this.parseSender(from);
      await api.sendTransacEmail({
        sender,
        to: [{ email: params.email, name: `${params.firstName} ${params.lastName}` }],
        subject: 'Réinitialisation de votre mot de passe - TaskFlow',
        htmlContent: html,
      });
    } catch (e) {
      console.log('Brevo reset-password email error:', e);
    }
  }

  async sendAdminPasswordRequestNotification(params: AdminPasswordRequestParams): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    const adminEmail = process.env.ADMIN_EMAIL ?? 'nour.hasni02@gmail.com';
    const from = process.env.MAIL_FROM ?? 'TaskFlow <noreply@taskflow.tn>';
    const client = SibApiV3Sdk.ApiClient.instance;
    (client.authentications as any)['api-key'].apiKey = apiKey;
    const api = new (SibApiV3Sdk as any).TransactionalEmailsApi();

    const bg = '#0d2418';
    const primary = '#1e7a3e';

    const html = `
      <div style="background:${bg};padding:24px;font-family:Arial,sans-serif;color:#eaf2ec">
        <div style="max-width:640px;margin:0 auto;background:#0f2b1d;border-radius:10px;overflow:hidden">
          <div style="padding:24px">
            <h1 style="margin:0 0 12px 0;color:#eaf2ec;font-size:22px">Password Recovery Request - TaskFlow</h1>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              A user is requesting manual password recovery assistance.
            </p>
            <div style="margin:16px 0;padding:14px;border-radius:8px;background:#123424;border:1px solid #1a4a30;color:#cfe0d6">
              <div><strong>User:</strong> ${this.escapeHtml(params.userName)}</div>
              <div><strong>Email:</strong> ${this.escapeHtml(params.userEmail)}</div>
              <div><strong>User ID:</strong> ${this.escapeHtml(params.userId)}</div>
            </div>
            <p style="margin:0 0 16px 0;color:#cfe0d6">
              Please contact the user or reset their password from the admin panel.
            </p>
            <p style="margin-top:24px;color:#86b29a;font-size:12px">© 2026 TaskFlow</p>
          </div>
        </div>
      </div>
    `;

    try {
      const sender = this.parseSender(from);
      await api.sendTransacEmail({
        sender,
        to: [{ email: adminEmail }],
        subject: 'Password Recovery Request - TaskFlow',
        htmlContent: html,
      });
    } catch (e) {
      console.log('Brevo admin-password-request email error:', e);
    }
  }

  private generateTaskFlowEmailTemplate(params: {
    title: string;
    userName: string;
    message: string;
    amount?: number;
    link: string;
    linkText: string;
  }): string {
    const logoUrl = 'https://via.placeholder.com/150x50/4F46E5/FFFFFF?text=TaskFlow';
    const primaryColor = '#4F46E5';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow Notification</title>
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
    }
    .email-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
    }
    .header {
      background-color: ${primaryColor};
      padding: 20px;
      text-align: center;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .content {
      padding: 30px 20px;
    }
    .card {
      background-color: #f8f9fa;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 15px;
      text-align: center;
    }
    .message {
      margin-bottom: 20px;
    }
    .highlight {
      background-color: #e8eaf6;
      padding: 10px;
      border-radius: 4px;
      margin: 15px 0;
      font-weight: bold;
    }
    .cta-button {
      display: inline-block;
      background-color: ${primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
    }
    .cta-button:hover {
      background-color: #3730a3;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .content {
        padding: 20px 15px;
      }
      .title {
        font-size: 20px;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">
  <table class="email-container" cellpadding="0" cellspacing="0" border="0" align="center">
    <tr>
      <td class="header">
        <img src="${logoUrl}" alt="TaskFlow Logo" class="logo" style="display: block; margin: 0 auto;">
      </td>
    </tr>
    <tr>
      <td class="content">
        <div class="card">
          <h1 class="title">${this.escapeHtml(params.title)}</h1>
          <p class="message">Hi ${this.escapeHtml(params.userName)},</p>
          <p class="message">${this.escapeHtml(params.message)}</p>
          ${params.amount ? `<div class="highlight">Amount: $${params.amount.toFixed(2)}</div>` : ''}
          <a href="${params.link}" class="cta-button">${this.escapeHtml(params.linkText)}</a>
        </div>
      </td>
    </tr>
    <tr>
      <td class="footer">
        <p>© 2026 TaskFlow. All rights reserved.</p>
        <p>Questions? Contact us at <a href="mailto:support@taskflow.com" style="color: ${primaryColor};">support@taskflow.com</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendExpenseApprovedEmail(params: ExpenseNotificationParams): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    const from = process.env.MAIL_FROM ?? 'TaskFlow <noreply@taskflow.tn>';
    const client = SibApiV3Sdk.ApiClient.instance;
    (client.authentications as any)['api-key'].apiKey = apiKey;
    const api = new (SibApiV3Sdk as any).TransactionalEmailsApi();

    const html = this.generateTaskFlowEmailTemplate({
      title: 'Expense Approved',
      userName: params.userName,
      message: params.message,
      amount: params.amount,
      link: params.link,
      linkText: 'View Expense',
    });

    try {
      const sender = this.parseSender(from);
      await api.sendTransacEmail({
        sender,
        to: [{ email: params.email, name: params.userName }],
        subject: 'Your Expense Has Been Approved - TaskFlow',
        htmlContent: html,
      });
    } catch (e) {
      console.log('Brevo expense approved email error:', e);
      throw new Error('Failed to send expense approved email');
    }
  }

  async sendExpenseRejectedEmail(params: ExpenseNotificationParams): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY ?? '';
    const from = process.env.MAIL_FROM ?? 'TaskFlow <noreply@taskflow.tn>';
    const client = SibApiV3Sdk.ApiClient.instance;
    (client.authentications as any)['api-key'].apiKey = apiKey;
    const api = new (SibApiV3Sdk as any).TransactionalEmailsApi();

    const html = this.generateTaskFlowEmailTemplate({
      title: 'Expense Rejected',
      userName: params.userName,
      message: params.message,
      amount: params.amount,
      link: params.link,
      linkText: 'View Expense',
    });

    try {
      const sender = this.parseSender(from);
      await api.sendTransacEmail({
        sender,
        to: [{ email: params.email, name: params.userName }],
        subject: 'Expense Update - TaskFlow',
        htmlContent: html,
      });
    } catch (e) {
      console.log('Brevo expense rejected email error:', e);
      throw new Error('Failed to send expense rejected email');
    }
  }
}

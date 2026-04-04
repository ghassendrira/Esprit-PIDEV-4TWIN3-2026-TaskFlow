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

type AdminPasswordRequestParams = {
  userEmail: string;
  userName: string;
  userId: string;
};

@Injectable()
export class NotificationService {
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
}

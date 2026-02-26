import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '0');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.from =
      this.config.get<string>('SMTP_FROM') ?? 'no-reply@taskflow.local';

    if (!host || !port) {
      this.transporter = null;
      this.logger.warn('SMTP not configured; emails will be logged to console');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: false, // <--- ajoute cette ligne ici
      },
    });
  }

  async send(to: string | string[], subject: string, text: string) {
    if (!this.transporter) {
      this.logger.log(
        `MAIL TO=${Array.isArray(to) ? to.join(',') : to} SUBJECT=${subject}\n${text}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      text,
    });
  }
}

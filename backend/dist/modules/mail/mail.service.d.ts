import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly config;
    private readonly logger;
    private readonly transporter;
    private readonly from;
    constructor(config: ConfigService);
    send(to: string | string[], subject: string, text: string): Promise<void>;
}

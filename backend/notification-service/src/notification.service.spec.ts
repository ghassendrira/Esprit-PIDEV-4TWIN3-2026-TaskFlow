import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';

jest.mock('sib-api-v3-sdk', () => ({
  ApiClient: {
    instance: {
      authentications: {
        'api-key': {},
      },
    },
  },
  TransactionalEmailsApi: jest.fn().mockImplementation(() => ({
    sendTransacEmail: jest.fn().mockResolvedValue({ messageId: '1' }),
  })),
}));

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send welcome email', async () => {
    await service.sendWelcomeEmail({ email: 'test@test.com', fullName: 'Test', userId: '1' });
    expect(service).toBeDefined();
  });

  it('should send admin registration email', async () => {
    await service.sendAdminRegistrationNotification({
      adminEmail: 'admin@test.com',
      applicantName: 'App',
      applicantEmail: 'app@test.com',
      companyName: 'Comp',
    });
    expect(service).toBeDefined();
  });

  it('should send reset password email', async () => {
    await service.sendResetPasswordEmail({
      email: 'test@test.com',
      firstName: 'F',
      lastName: 'L',
      resetToken: 'token',
    });
    expect(service).toBeDefined();
  });

  it('should send approval email', async () => {
    process.env.BREVO_API_KEY = 'key';
    await service.sendApprovalEmail({
      email: 'test@test.com',
      fullName: 'Test',
      tempPassword: 'pass',
    });
    expect(service).toBeDefined();
  });

  it('should send rejection email', async () => {
    await service.sendRejectionEmail({
      email: 'test@test.com',
      fullName: 'Test',
      reason: 'reason',
    });
    expect(service).toBeDefined();
  });

  it('should send employee welcome email', async () => {
    await service.sendEmployeeWelcomeEmail({
      email: 'test@test.com',
      fullName: 'Test',
      role: 'ADMIN',
      tempPassword: 'pass',
      companyName: 'Comp',
    });
    expect(service).toBeDefined();
  });

  it('should send admin password request notification', async () => {
    await service.sendAdminPasswordRequestNotification({
      userEmail: 'test@test.com',
      userName: 'Test',
      userId: '1',
    });
    expect(service).toBeDefined();
  });

  it('should throw error if BREVO_API_KEY is missing in sendRejectionEmail', async () => {
    delete process.env.BREVO_API_KEY;
    await expect(service.sendRejectionEmail({
      email: 'test@test.com',
      fullName: 'Test',
      reason: 'reason',
    })).rejects.toThrow('BREVO_API_KEY is missing');
  });

  it('should throw error if sendTransacEmail fails', async () => {
    process.env.BREVO_API_KEY = 'key';
    const mockSend = jest.fn().mockRejectedValue(new Error('Brevo error'));
    require('sib-api-v3-sdk').TransactionalEmailsApi.mockImplementation(() => ({
      sendTransacEmail: mockSend,
    }));

    await expect(service.sendRejectionEmail({
      email: 'test@test.com',
      fullName: 'Test',
      reason: 'reason',
    })).rejects.toThrow('Failed to send rejection email');
  });
});

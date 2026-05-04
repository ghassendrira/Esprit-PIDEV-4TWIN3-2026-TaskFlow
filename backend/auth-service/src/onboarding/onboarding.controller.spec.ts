import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

describe('OnboardingController', () => {
  let controller: OnboardingController;
  let service: OnboardingService;

  const mockService = {
    companySetup: jest.fn(),
    createBusiness: jest.fn(),
    status: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [{ provide: OnboardingService, useValue: mockService }],
    }).compile();

    controller = module.get<OnboardingController>(OnboardingController);
    service = module.get<OnboardingService>(OnboardingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should handle company setup (patch)', async () => {
    const dto = { name: 'Acme' };
    mockService.companySetup.mockResolvedValue({ success: true });
    await controller.companySetup('Bearer token', 'tenant-1', dto as any);
    expect(service.companySetup).toHaveBeenCalledWith('Bearer token', dto, 'tenant-1');
  });

  it('should handle company setup (post)', async () => {
    const dto = { name: 'Acme' };
    mockService.companySetup.mockResolvedValue({ success: true });
    await controller.companySetupPost('Bearer token', 'tenant-1', dto as any);
    expect(service.companySetup).toHaveBeenCalledWith('Bearer token', dto, 'tenant-1');
  });

  it('should create business', async () => {
    const dto = { name: 'Biz' };
    mockService.createBusiness.mockResolvedValue({ success: true });
    await controller.createBusiness('Bearer token', 'tenant-1', dto as any);
    expect(service.createBusiness).toHaveBeenCalledWith('Bearer token', dto, 'tenant-1');
  });

  it('should get status', async () => {
    mockService.status.mockResolvedValue({ step: 1 });
    await controller.status('Bearer token', 'tenant-1');
    expect(service.status).toHaveBeenCalledWith('Bearer token', 'tenant-1');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoicesProxyService } from './invoices.service';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let service: InvoicesProxyService;

  const mockService = {
    listByBusiness: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesProxyService, useValue: mockService }],
    }).compile();

    controller = module.get<InvoicesController>(InvoicesController);
    service = module.get<InvoicesProxyService>(InvoicesProxyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list by business', async () => {
    mockService.listByBusiness.mockResolvedValue([]);
    await controller.listByBusiness('Bearer token', 'tenant-1', 'biz-1');
    expect(service.listByBusiness).toHaveBeenCalledWith('Bearer token', 'tenant-1', 'biz-1');
  });

  it('should create invoice', async () => {
    const body = { amount: 100 };
    mockService.create.mockResolvedValue({ id: '1' });
    await controller.create('Bearer token', 'tenant-1', body);
    expect(service.create).toHaveBeenCalledWith('Bearer token', 'tenant-1', body);
  });

  it('should update invoice', async () => {
    const body = { amount: 200 };
    mockService.update.mockResolvedValue({ id: '1' });
    await controller.update('Bearer token', 'tenant-1', '1', body);
    expect(service.update).toHaveBeenCalledWith('Bearer token', 'tenant-1', '1', body);
  });

  it('should remove invoice', async () => {
    mockService.remove.mockResolvedValue({ success: true });
    await controller.remove('Bearer token', 'tenant-1', '1');
    expect(service.remove).toHaveBeenCalledWith('Bearer token', 'tenant-1', '1');
  });
});

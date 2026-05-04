import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: ClientsService;

  const mockService = {
    listByBusiness: jest.fn(),
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [{ provide: ClientsService, useValue: mockService }],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
    service = module.get<ClientsService>(ClientsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list by business', async () => {
    mockService.listByBusiness.mockResolvedValue([]);
    await controller.listByBusiness('Bearer token', 'tenant-1', 'biz-1');
    expect(service.listByBusiness).toHaveBeenCalledWith('Bearer token', 'tenant-1', 'biz-1');
  });

  it('should create client', async () => {
    const body = { businessId: 'biz-1', name: 'Client' };
    mockService.create.mockResolvedValue({ id: '1' });
    await controller.create('Bearer token', 'tenant-1', body);
    expect(service.create).toHaveBeenCalledWith('Bearer token', 'tenant-1', body);
  });

  it('should get client', async () => {
    mockService.get.mockResolvedValue({ id: '1' });
    await controller.get('Bearer token', 'tenant-1', '1');
    expect(service.get).toHaveBeenCalledWith('Bearer token', 'tenant-1', '1');
  });

  it('should update client', async () => {
    const body = { name: 'Updated' };
    mockService.update.mockResolvedValue({ id: '1' });
    await controller.update('Bearer token', 'tenant-1', '1', body);
    expect(service.update).toHaveBeenCalledWith('Bearer token', 'tenant-1', '1', body);
  });

  it('should remove client', async () => {
    mockService.remove.mockResolvedValue({ success: true });
    await controller.remove('Bearer token', 'tenant-1', '1');
    expect(service.remove).toHaveBeenCalledWith('Bearer token', 'tenant-1', '1');
  });
});

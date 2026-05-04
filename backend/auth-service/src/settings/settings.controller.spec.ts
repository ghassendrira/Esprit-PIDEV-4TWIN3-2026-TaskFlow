import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController, BusinessSettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

describe('SettingsControllers', () => {
  let settingsController: SettingsController;
  let businessSettingsController: BusinessSettingsController;
  let service: SettingsService;

  const mockService = {
    getTenant: jest.fn(),
    countries: jest.fn(),
    getAllTenants: jest.fn(),
    requestTenant: jest.fn(),
    updateTenant: jest.fn(),
    getBusinesses: jest.fn(),
    categories: jest.fn(),
    createBusiness: jest.fn(),
    updateBusiness: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController, BusinessSettingsController],
      providers: [{ provide: SettingsService, useValue: mockService }],
    }).compile();

    settingsController = module.get<SettingsController>(SettingsController);
    businessSettingsController = module.get<BusinessSettingsController>(BusinessSettingsController);
    service = module.get<SettingsService>(SettingsService);
  });

  describe('SettingsController', () => {
    it('should be defined', () => {
      expect(settingsController).toBeDefined();
    });

    it('should get current tenant', async () => {
      mockService.getTenant.mockResolvedValue({});
      await settingsController.tenant('Bearer token', 'tenant-1');
      expect(service.getTenant).toHaveBeenCalledWith('Bearer token', 'tenant-1');
    });

    it('should get countries', async () => {
      mockService.countries.mockResolvedValue([]);
      await settingsController.countries();
      expect(service.countries).toHaveBeenCalled();
    });

    it('should get all tenants', async () => {
      mockService.getAllTenants.mockResolvedValue([]);
      await settingsController.allTenants('Bearer token');
      expect(service.getAllTenants).toHaveBeenCalledWith('Bearer token');
    });

    it('should request tenant', async () => {
      const dto = { name: 'New' };
      mockService.requestTenant.mockResolvedValue({});
      await settingsController.requestTenant('Bearer token', dto);
      expect(service.requestTenant).toHaveBeenCalledWith('Bearer token', dto);
    });

    it('should update tenant', async () => {
      const dto = { name: 'Updated' };
      mockService.updateTenant.mockResolvedValue({});
      await settingsController.updateTenant('Bearer token', 'tenant-1', dto as any);
      expect(service.updateTenant).toHaveBeenCalledWith('Bearer token', dto, 'tenant-1');
    });
  });

  describe('BusinessSettingsController', () => {
    it('should be defined', () => {
      expect(businessSettingsController).toBeDefined();
    });

    it('should get businesses', async () => {
      mockService.getBusinesses.mockResolvedValue([]);
      await businessSettingsController.businesses('Bearer token', 'tenant-1');
      expect(service.getBusinesses).toHaveBeenCalledWith('Bearer token', 'tenant-1');
    });

    it('should get categories', async () => {
      mockService.categories.mockResolvedValue([]);
      await businessSettingsController.categories();
      expect(service.categories).toHaveBeenCalled();
    });

    it('should create business', async () => {
      const dto = { name: 'New' };
      mockService.createBusiness.mockResolvedValue({});
      await businessSettingsController.createBusiness('Bearer token', 'tenant-1', dto as any);
      expect(service.createBusiness).toHaveBeenCalledWith('Bearer token', dto, 'tenant-1');
    });

    it('should update business', async () => {
      const dto = { name: 'Updated' };
      mockService.updateBusiness.mockResolvedValue({});
      await businessSettingsController.updateBusiness('Bearer token', 'tenant-1', 'biz-1', dto as any);
      expect(service.updateBusiness).toHaveBeenCalledWith('Bearer token', 'biz-1', dto, 'tenant-1');
    });
  });
});

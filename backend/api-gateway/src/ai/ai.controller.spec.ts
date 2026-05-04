import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let service: AiService;

  const mockAiService = {
    getModelSnapshot: jest.fn(),
    getTrainingExamples: jest.fn().mockReturnValue([]),
    predict: jest.fn(),
    retrain: jest.fn(),
    getInvoiceDelayModelSnapshot: jest.fn(),
    getInvoiceDelayTrainingExamples: jest.fn().mockReturnValue([]),
    predictInvoiceDelay: jest.fn(),
    retrainInvoiceDelay: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: mockAiService }],
    }).compile();

    controller = module.get<AiController>(AiController);
    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get model', () => {
    controller.getModel();
    expect(service.getModelSnapshot).toHaveBeenCalled();
  });

  it('should get examples', () => {
    controller.getExamples();
    expect(service.getTrainingExamples).toHaveBeenCalled();
  });

  it('should predict', () => {
    controller.predict({ text: 'test' });
    expect(service.predict).toHaveBeenCalledWith('test');
  });

  it('should train', () => {
    controller.train({ examples: [] });
    expect(service.retrain).toHaveBeenCalledWith([]);
  });

  it('should get invoice delay model', () => {
    controller.getInvoiceDelayModel();
    expect(service.getInvoiceDelayModelSnapshot).toHaveBeenCalled();
  });

  it('should get invoice delay examples', () => {
    controller.getInvoiceDelayExamples();
    expect(service.getInvoiceDelayTrainingExamples).toHaveBeenCalled();
  });

  it('should predict invoice delay', async () => {
    await controller.predictInvoiceDelay({});
    expect(service.predictInvoiceDelay).toHaveBeenCalled();
  });

  it('should train invoice delay', async () => {
    await controller.trainInvoiceDelay({ examples: [] });
    expect(service.retrainInvoiceDelay).toHaveBeenCalled();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { BadRequestException } from '@nestjs/common';

describe('AiService', () => {
  let service: AiService;

  beforeAll(() => {
    global.fetch = jest.fn();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return model snapshot', () => {
    const snapshot = service.getModelSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.trainingExamples).toBeGreaterThan(0);
  });

  it('should predict category', () => {
    const result = service.predict('achat matériel');
    expect(result.label).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should throw error if text is empty', () => {
    expect(() => service.predict('')).toThrow(BadRequestException);
  });

  it('should retrain model', () => {
    const snapshot = service.retrain();
    expect(snapshot).toBeDefined();
  });

  it('should get training examples', () => {
    const examples = service.getTrainingExamples();
    expect(examples.length).toBeGreaterThan(0);
  });

  it('should get invoice delay model snapshot', () => {
    const snapshot = service.getInvoiceDelayModelSnapshot();
    expect(snapshot).toBeDefined();
  });

  describe('predictInvoiceDelay', () => {
    it('should predict with default dataset if no businessId', async () => {
      const result = await service.predictInvoiceDelay({ amount: 100, dueDays: 30, clientLateRatio: 0, previousLateCount: 0, openInvoiceCount: 0, overdueInvoiceCount: 0 } as any);
      expect(result.label).toBeDefined();
    });

    it('should fetch invoices and predict if businessId provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify([])),
      });

      const result = await service.predictInvoiceDelay({ businessId: 'b1', clientId: 'c1', amount: 100, dueDays: 30, clientLateRatio: 0, previousLateCount: 0, openInvoiceCount: 0, overdueInvoiceCount: 0 } as any);
      expect(result.label).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('retrainInvoiceDelay', () => {
    it('should retrain with provided examples', async () => {
      const examples = [{ features: { amount: 1, dueDays: 1, clientLateRatio: 0, previousLateCount: 0, openInvoiceCount: 0, overdueInvoiceCount: 0 }, late: true }];
      const snapshot = await service.retrainInvoiceDelay({ examples });
      expect(snapshot.trainingExamples).toBe(1);
    });

    it('should retrain with DB examples if businessId provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify([])),
      });

      const snapshot = await service.retrainInvoiceDelay({ businessId: 'b1' });
      expect(snapshot).toBeDefined();
    });
  });

  describe('normalizeInvoiceDelayFeatures', () => {
    it('should throw error if amount is invalid', () => {
      expect(() => (service as any).normalizeInvoiceDelayFeatures({ amount: -1 })).toThrow('amount must be a positive number');
    });

    it('should throw error if dueDays is invalid', () => {
      expect(() => (service as any).normalizeInvoiceDelayFeatures({ amount: 1, dueDays: -1 })).toThrow('dueDays must be a positive number');
    });

    it('should throw error if clientLateRatio is invalid', () => {
      expect(() => (service as any).normalizeInvoiceDelayFeatures({ amount: 1, dueDays: 30, clientLateRatio: 2 })).toThrow('clientLateRatio must be between 0 and 1');
    });

    it('should throw error if previousLateCount is invalid', () => {
      expect(() => (service as any).normalizeInvoiceDelayFeatures({ amount: 1, dueDays: 30, clientLateRatio: 0.5, previousLateCount: -1 })).toThrow('previousLateCount must be a positive number');
    });
  });
});

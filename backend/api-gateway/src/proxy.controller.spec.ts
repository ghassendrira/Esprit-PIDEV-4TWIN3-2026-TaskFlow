import { Test, TestingModule } from '@nestjs/testing';
import { ProxyController } from './proxy.controller';
import { BadRequestException } from '@nestjs/common';

describe('ProxyController', () => {
  let controller: ProxyController;

  beforeAll(() => {
    global.fetch = jest.fn();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
    }).compile();

    controller = module.get<ProxyController>(ProxyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('normalizeInvoiceStatus', () => {
    it('should normalize PAID', () => {
      expect((controller as any).normalizeInvoiceStatus('PAID')).toBe('PAID');
      expect((controller as any).normalizeInvoiceStatus('PAYE')).toBe('PAID');
      expect((controller as any).normalizeInvoiceStatus('PAYÉ')).toBe('PAID');
    });

    it('should normalize PENDING', () => {
      expect((controller as any).normalizeInvoiceStatus('PENDING')).toBe('PENDING');
      expect((controller as any).normalizeInvoiceStatus('EN ATTENTE')).toBe('PENDING');
    });

    it('should return UNKNOWN for empty status', () => {
      expect((controller as any).normalizeInvoiceStatus('')).toBe('UNKNOWN');
      expect((controller as any).normalizeInvoiceStatus(null)).toBe('UNKNOWN');
    });
  });

  describe('normalizeExpenseStatus', () => {
    it('should normalize APPROVED', () => {
      expect((controller as any).normalizeExpenseStatus('APPROVED')).toBe('APPROVED');
      expect((controller as any).normalizeExpenseStatus('APPROUVÉ')).toBe('APPROVED');
    });
  });

  describe('fetchJson', () => {
    it('should throw BadRequestException if fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      await expect((controller as any).fetchJson('http://test.com')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if response not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Error',
        text: jest.fn().mockResolvedValue('fail'),
      });
      await expect((controller as any).fetchJson('http://test.com')).rejects.toThrow(BadRequestException);
    });

    it('should return empty array if no text', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });
      const result = await (controller as any).fetchJson('http://test.com');
      expect(result).toEqual([]);
    });

    it('should parse JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('{"a":1}'),
      });
      const result = await (controller as any).fetchJson('http://test.com');
      expect(result).toEqual({ a: 1 });
    });
  });
});

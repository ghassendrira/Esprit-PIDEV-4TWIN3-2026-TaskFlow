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

    it('should normalize OVERDUE', () => {
      expect((controller as any).normalizeInvoiceStatus('OVERDUE')).toBe('OVERDUE');
      expect((controller as any).normalizeInvoiceStatus('EN RETARD')).toBe('OVERDUE');
    });

    it('should normalize DRAFT', () => {
      expect((controller as any).normalizeInvoiceStatus('DRAFT')).toBe('DRAFT');
    });

    it('should normalize CANCELLED', () => {
      expect((controller as any).normalizeInvoiceStatus('CANCELLED')).toBe('CANCELLED');
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

    it('should normalize PENDING', () => {
      expect((controller as any).normalizeExpenseStatus('PENDING')).toBe('PENDING');
    });

    it('should normalize REJECTED', () => {
      expect((controller as any).normalizeExpenseStatus('REJECTED')).toBe('REJECTED');
    });
  });

  describe('isInvoicePaid', () => {
    it('should return true for PAID', () => {
      expect((controller as any).isInvoicePaid('PAID')).toBe(true);
      expect((controller as any).isInvoicePaid('PENDING')).toBe(false);
    });
  });

  describe('isInvoiceOverdue', () => {
    it('should return true if overdue', () => {
      const invoice = { status: 'OVERDUE' };
      expect((controller as any).isInvoiceOverdue(invoice)).toBe(true);
    });

    it('should return true if past due date and not paid', () => {
      const invoice = { status: 'PENDING', dueDate: new Date(Date.now() - 10000).toISOString() };
      expect((controller as any).isInvoiceOverdue(invoice)).toBe(true);
    });

    it('should return false if paid even if past due date', () => {
      const invoice = { status: 'PAID', dueDate: new Date(Date.now() - 10000).toISOString() };
      expect((controller as any).isInvoiceOverdue(invoice)).toBe(false);
    });
  });

  describe('getHeaders', () => {
    it('should extract auth and tenant headers', () => {
      const mockReq = {
        headers: { authorization: 'Bearer token', 'x-tenant-id': 't1' },
        header: jest.fn().mockReturnValue('t1'),
      } as any;
      const headers = (controller as any).getHeaders(mockReq, { extra: 'val' });
      expect(headers['Authorization']).toBe('Bearer token');
      expect(headers['x-tenant-id']).toBe('t1');
      expect(headers['extra']).toBe('val');
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

import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/Invoice.entity';
import { Client } from '../entities/Client.entity';
import { Expense } from '../entities/Expense.entity';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  /**
   * Fetch all expenses for a specific company.
   */
  async getExpenses(companyId: string) {
    return this.expenseRepository.find({
      where: { company_id: companyId },
    });
  }

  /**
   * Create an expense for the current company context.
   */
  async createExpense(companyId: string, expenseData: Partial<Expense>) {
    const expense = this.expenseRepository.create({
      ...expenseData,
      company_id: companyId,
    });

    return this.expenseRepository.save(expense);
  }

  /**
   * Fetch all invoices for a specific company.
   * Every query filters by company_id from the context.
   */
  async getInvoices(companyId: string) {
    return this.invoiceRepository.find({
      where: { company_id: companyId },
    });
  }

  /**
   * Fetch a specific invoice for a company.
   * Ensures the invoice belongs to the correct company context.
   */
  async getInvoiceById(id: string, companyId: string) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, company_id: companyId },
    });

    if (!invoice) {
      throw new ForbiddenException('Invoice not found or access denied');
    }

    return invoice;
  }

  /**
   * Create an invoice for the current company context.
   */
  async createInvoice(companyId: string, invoiceData: Partial<Invoice>) {
    const invoice = this.invoiceRepository.create({
      ...invoiceData,
      company_id: companyId,
    });

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Fetch all clients for a specific company.
   */
  async getClients(companyId: string) {
    return this.clientRepository.find({
      where: { company_id: companyId },
    });
  }

  /**
   * Create a client for the current company context.
   */
  async createClient(companyId: string, clientData: Partial<Client>) {
    const client = this.clientRepository.create({
      ...clientData,
      company_id: companyId,
    });

    return this.clientRepository.save(client);
  }
}

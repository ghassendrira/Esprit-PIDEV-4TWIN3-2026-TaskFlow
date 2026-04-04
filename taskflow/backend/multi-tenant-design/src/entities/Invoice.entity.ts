import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from './BaseTenant.entity';
import { Company } from './Company.entity';

@Entity('invoices')
export class Invoice extends BaseTenantEntity {
  @Column()
  invoiceNumber: string;

  @Column('decimal')
  amount: number;

  @Column()
  status: string;

  @Column({ type: 'date' })
  dueDate: Date;

  @ManyToOne(() => Company, (company) => company.invoices)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}

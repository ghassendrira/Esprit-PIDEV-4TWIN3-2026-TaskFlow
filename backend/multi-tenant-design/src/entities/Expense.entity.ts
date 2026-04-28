import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from './BaseTenant.entity';
import { Company } from './Company.entity';

@Entity('expenses')
export class Expense extends BaseTenantEntity {
  @Column()
  description: string;

  @Column('decimal')
  amount: number;

  @Column()
  category: string;

  @ManyToOne(() => Company, (company) => company.expenses)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}

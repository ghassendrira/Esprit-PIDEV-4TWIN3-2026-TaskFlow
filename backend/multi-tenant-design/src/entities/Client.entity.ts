import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from './BaseTenant.entity';
import { Company } from './Company.entity';

@Entity('clients')
export class Client extends BaseTenantEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @ManyToOne(() => Company, (company) => company.clients)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}

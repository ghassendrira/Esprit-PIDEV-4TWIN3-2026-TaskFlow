import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User.entity';
import { Invoice } from './Invoice.entity';
import { Client } from './Client.entity';
import { Expense } from './Expense.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'uuid' })
  owner_id: string;

  @ManyToOne(() => User, (user) => user.ownedCompanies)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => Invoice, (invoice) => invoice.company)
  invoices: Invoice[];

  @OneToMany(() => Client, (client) => client.company)
  clients: Client[];

  @OneToMany(() => Expense, (expense) => expense.company)
  expenses: Expense[];
}

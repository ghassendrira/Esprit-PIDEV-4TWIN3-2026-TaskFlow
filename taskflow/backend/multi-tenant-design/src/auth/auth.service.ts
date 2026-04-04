import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '../entities/User.entity';
import { Company } from '../entities/Company.entity';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Logic for a Business Owner to create a new company.
   */
  async createCompany(ownerId: string, companyName: string) {
    const owner = await this.userRepository.findOne({ where: { id: ownerId } });
    if (!owner || !owner.is_owner) {
      throw new ForbiddenException('Only a Business Owner can create a company');
    }

    const company = this.companyRepository.create({
      name: companyName,
      owner_id: ownerId,
    });

    const savedCompany = await this.companyRepository.save(company);

    // After creating a company, the owner automatically enters its context
    // This could be part of the response to update the frontend state/token
    return this.switchCompany(ownerId, savedCompany.id);
  }

  /**
   * Switch the current company context for an owner.
   * Generates a new JWT with the updated company_id.
   */
  async switchCompany(ownerId: string, companyId: string) {
    const owner = await this.userRepository.findOne({ 
      where: { id: ownerId },
      relations: ['ownedCompanies'] 
    });

    if (!owner || !owner.is_owner) {
      throw new ForbiddenException('Not authorized');
    }

    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company || company.owner_id !== ownerId) {
      throw new ForbiddenException('This company does not belong to you');
    }

    // Update the user's current company_id context (if needed in DB or just in JWT)
    owner.company_id = companyId;
    await this.userRepository.save(owner);

    // Return a new JWT with the new company_id context
    const payload = { 
      sub: owner.id, 
      email: owner.email, 
      role: owner.role, 
      company_id: companyId 
    };

    return {
      access_token: this.jwtService.sign(payload),
      company: {
        id: company.id,
        name: company.name
      }
    };
  }

  /**
   * Create an employee or admin for a specific company.
   */
  async createUser(companyId: string, userData: { email: string, role: string, firstName?: string, lastName?: string }) {
    // 1. Check if email already exists globally (to maintain uniqueness)
    const existing = await this.userRepository.findOne({ where: { email: userData.email } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // 2. Only allow ADMIN or EMPLOYEE for standard users linked to a company
    if (userData.role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot create another owner for a company');
    }

    const newUser = this.userRepository.create({
      ...userData,
      company_id: companyId,
      is_owner: false,
      passwordHash: await bcrypt.hash('temporary_password', 10), // Set temporary password
    });

    return this.userRepository.save(newUser);
  }

  /**
   * Fetch all users belonging to a specific company.
   */
  async getUsersByCompany(companyId: string) {
    return this.userRepository.find({
      where: { company_id: companyId },
      // Include firstName and lastName for the list display
      select: ['id', 'email', 'role', 'firstName', 'lastName', 'is_owner', 'company_id'],
      order: { createdAt: 'DESC' }
    });
  }
}

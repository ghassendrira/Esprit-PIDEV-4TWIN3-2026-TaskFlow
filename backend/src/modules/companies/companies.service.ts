import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompanyRole,
  RegistrationStatus,
  RegistrationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    return this.prisma.companyUser.findMany({
      where: { userId },
      include: { company: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getCompanyForMember(companyId: string, userId: string) {
    const membership = await this.prisma.companyUser.findUnique({
      where: { companyId_userId: { companyId, userId } },
      include: { company: true },
    });
    if (!membership)
      throw new ForbiddenException('Not a member of this company');
    return membership.company;
  }

  async createCompanyAsOwner(
    userId: string,
    data: {
      name: string;
      category: string;
      logoUrl?: string;
      matricule?: string;
    },
  ) {
    const company = await this.prisma.company.create({
      data: {
        name: data.name,
        category: data.category,
        logoUrl: data.logoUrl,
        matricule: data.matricule,
        users: {
          create: {
            userId,
            role: CompanyRole.OWNER,
          },
        },
      },
    });

    return company;
  }

  async updateCompany(
    companyId: string,
    userId: string,
    patch: {
      name?: string;
      category?: string;
      logoUrl?: string;
      matricule?: string;
    },
  ) {
    const membership = await this.prisma.companyUser.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership)
      throw new ForbiddenException('Not a member of this company');

    if (
      membership.role !== CompanyRole.OWNER &&
      membership.role !== CompanyRole.ADMIN
    ) {
      throw new ForbiddenException('Insufficient company role');
    }

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: patch,
    });
    return company;
  }

  async createEmployeeInviteRequest(
    companyId: string,
    creatorUserId: string,
    dto: {
      email: string;
      firstName: string;
      lastName: string;
      role: CompanyRole;
    },
  ) {
    const creatorMembership = await this.prisma.companyUser.findUnique({
      where: { companyId_userId: { companyId, userId: creatorUserId } },
    });
    if (!creatorMembership)
      throw new ForbiddenException('Not a member of this company');
    if (
      creatorMembership.role !== CompanyRole.OWNER &&
      creatorMembership.role !== CompanyRole.ADMIN
    ) {
      throw new ForbiddenException('Insufficient company role');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ForbiddenException('User with this email already exists');
    }

    const req = await this.prisma.registrationRequest.create({
      data: {
        type: RegistrationType.EMPLOYEE_INVITE,
        status: RegistrationStatus.PENDING,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        requestedCompanyId: companyId,
        requestedCompanyRole: dto.role,
        createdByUserId: creatorUserId,
      },
    });

    return req;
  }

  async ensureCompanyExists(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }
}

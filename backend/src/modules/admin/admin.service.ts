import { Injectable } from '@nestjs/common';
import { RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrationsService } from '../registrations/registrations.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registrations: RegistrationsService,
  ) {}

  async listRequests(status: RegistrationStatus) {
    return this.prisma.registrationRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveRequest(requestId: string, decidedByAdminId: string) {
    return this.registrations.approveRequest(requestId, decidedByAdminId);
  }

  async rejectRequest(
    requestId: string,
    decidedByAdminId: string,
    reason: string,
  ) {
    return this.registrations.rejectRequest(
      requestId,
      decidedByAdminId,
      reason,
    );
  }
}

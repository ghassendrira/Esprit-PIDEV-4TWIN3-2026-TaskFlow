import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async setSecurityQAs(
    userId: string,
    qas: { question: string; answer: string }[],
  ) {
    if (!qas.length) {
      throw new BadRequestException(
        'At least one security question is required',
      );
    }

    const normalized = qas.map((q) => ({
      question: q.question.trim(),
      answer: q.answer,
    }));

    await this.prisma.userSecurityQA.deleteMany({ where: { userId } });

    await this.prisma.userSecurityQA.createMany({
      data: await Promise.all(
        normalized.map(async (q) => ({
          userId,
          question: q.question,
          answerHash: await bcrypt.hash(q.answer, 12),
        })),
      ),
    });

    return { ok: true };
  }

  async getMyCompanies(userId: string) {
    const memberships = await this.prisma.companyUser.findMany({
      where: { userId },
      include: { company: true },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      companyId: m.companyId,
      role: m.role,
      company: {
        id: m.company.id,
        name: m.company.name,
        category: m.company.category,
        logoUrl: m.company.logoUrl,
        matricule: m.company.matricule,
      },
    }));
  }
}

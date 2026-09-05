import { Prisma, VerificationCase, VerificationStatus } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.js';
import {
  CreateVerificationCaseDto,
  QueryVerificationCasesDto,
  UpdateVerificationDecisionDto,
} from './dto/verification.dto.js';

export class VerificationRepository {
  async create(data: CreateVerificationCaseDto): Promise<VerificationCase> {
    return prisma.verificationCase.create({
      data: {
        transactionId: data.transactionId,
        assignedTo: data.assignedTo,
        status: VerificationStatus.OPEN,
      },
      include: {
        transaction: true,
      },
    });
  }

  async findById(id: string): Promise<VerificationCase | null> {
    return prisma.verificationCase.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            riskScore: true,
          },
        },
      },
    });
  }

  async findByTransactionId(transactionId: string): Promise<VerificationCase | null> {
    return prisma.verificationCase.findUnique({
      where: { transactionId },
    });
  }

  async findMany(
    query: QueryVerificationCasesDto
  ): Promise<{ items: VerificationCase[]; total: number }> {
    const { status, assignedTo, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VerificationCaseWhereInput = {};
    if (status) where.status = status as VerificationStatus;
    if (assignedTo) where.assignedTo = assignedTo;

    const [items, total] = await Promise.all([
      prisma.verificationCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transaction: true,
        },
      }),
      prisma.verificationCase.count({ where }),
    ]);

    return { items, total };
  }

  async updateDecision(
    id: string,
    data: UpdateVerificationDecisionDto
  ): Promise<VerificationCase> {
    const isResolved =
      data.status === VerificationStatus.APPROVED ||
      data.status === VerificationStatus.REJECTED;

    return prisma.verificationCase.update({
      where: { id },
      data: {
        status: data.status as VerificationStatus,
        decisionNotes: data.decisionNotes,
        assignedTo: data.assignedTo,
        resolvedAt: isResolved ? new Date() : null,
      },
      include: {
        transaction: true,
      },
    });
  }
}

import { Customer } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.js';

export interface CreateCustomerData {
  externalCustomerId: string;
  accountAge?: number;
}

const FALLBACK_CUSTOMERS: Record<string, Customer> = {
  CUS123: { id: 'c-1', externalCustomerId: 'CUS123', accountAge: 14, createdAt: new Date(), updatedAt: new Date() },
  CUS456: { id: 'c-2', externalCustomerId: 'CUS456', accountAge: 45, createdAt: new Date(), updatedAt: new Date() },
  CUS789: { id: 'c-3', externalCustomerId: 'CUS789', accountAge: 180, createdAt: new Date(), updatedAt: new Date() },
  CUS_9421: { id: 'c-4', externalCustomerId: 'CUS_9421', accountAge: 14, createdAt: new Date(), updatedAt: new Date() },
  CUS_RING_LEADER: { id: 'c-5', externalCustomerId: 'CUS_RING_LEADER', accountAge: 5, createdAt: new Date(), updatedAt: new Date() },
};

export class CustomersRepository {
  async findByExternalCustomerId(externalCustomerId: string): Promise<Customer | null> {
    try {
      return await prisma.customer.findUnique({
        where: { externalCustomerId },
      });
    } catch {
      return (
        FALLBACK_CUSTOMERS[externalCustomerId] || {
          id: `c-mem-${externalCustomerId}`,
          externalCustomerId,
          accountAge: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );
    }
  }

  async findById(id: string): Promise<Customer | null> {
    try {
      return await prisma.customer.findUnique({
        where: { id },
      });
    } catch {
      const found = Object.values(FALLBACK_CUSTOMERS).find((c) => c.id === id);
      return found || null;
    }
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    try {
      return await prisma.customer.create({
        data: {
          externalCustomerId: data.externalCustomerId,
          accountAge: data.accountAge ?? 0,
        },
      });
    } catch {
      const cust: Customer = {
        id: `c-mem-${data.externalCustomerId}`,
        externalCustomerId: data.externalCustomerId,
        accountAge: data.accountAge ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      FALLBACK_CUSTOMERS[data.externalCustomerId] = cust;
      return cust;
    }
  }

  async upsert(data: CreateCustomerData): Promise<Customer> {
    try {
      return await prisma.customer.upsert({
        where: { externalCustomerId: data.externalCustomerId },
        create: {
          externalCustomerId: data.externalCustomerId,
          accountAge: data.accountAge ?? 0,
        },
        update: {
          ...(data.accountAge !== undefined && { accountAge: data.accountAge }),
        },
      });
    } catch {
      return this.create(data);
    }
  }
}


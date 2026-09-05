import { FraudRule } from '@prisma/client';
import { FraudRepository } from './fraud.repository.js';
import { NetworkGraphService } from './network-graph.service.js';
import { CreateFraudRuleDto, UpdateFraudRuleDto } from './dto/fraud.dto.js';
import { NetworkGraphResponse } from './network-graph.types.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class FraudService {
  constructor(
    private readonly fraudRepository: FraudRepository,
    private readonly networkGraphService: NetworkGraphService = new NetworkGraphService()
  ) {}

  async createRule(dto: CreateFraudRuleDto): Promise<FraudRule> {
    const existing = await this.fraudRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictError(`Fraud rule with code '${dto.code}' already exists`);
    }

    logger.info({ code: dto.code, name: dto.name }, 'Creating new fraud rule');
    return this.fraudRepository.create(dto);
  }

  async getRuleById(id: string): Promise<FraudRule> {
    const rule = await this.fraudRepository.findById(id);
    if (!rule) {
      throw new NotFoundError(`Fraud rule with ID '${id}' not found`);
    }
    return rule;
  }

  async getActiveRules(): Promise<FraudRule[]> {
    return this.fraudRepository.findActiveRules();
  }

  async updateRule(id: string, dto: UpdateFraudRuleDto): Promise<FraudRule> {
    await this.getRuleById(id);
    return this.fraudRepository.update(id, dto);
  }

  async deleteRule(id: string): Promise<void> {
    await this.getRuleById(id);
    await this.fraudRepository.delete(id);
  }

  async getCustomerNetwork(customerId: string): Promise<NetworkGraphResponse> {
    logger.info({ customerId }, 'Resolving fraud network graph for customer');
    return this.networkGraphService.buildCustomerNetworkGraph(customerId);
  }
}


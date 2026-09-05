export type NetworkNodeType =
  | 'CUSTOMER'
  | 'DEVICE'
  | 'IP'
  | 'PAYMENT_INSTRUMENT'
  | 'TRANSACTION';

export type EntityRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NetworkNode {
  id: string;
  type: NetworkNodeType;
  label: string;
  subLabel?: string;
  riskLevel: EntityRiskLevel;
  riskScore?: number;
  status?: string;
  isOrigin?: boolean;
  metadata?: {
    accountAge?: number;
    amount?: number;
    currency?: string;
    createdAt?: string;
    connectionCount?: number;
    suspiciousCount?: number;
    ipCountry?: string;
    deviceType?: string;
    paymentType?: string;
    [key: string]: unknown;
  };
}

export type NetworkRelationshipType =
  | 'PERFORMED'
  | 'USED_DEVICE'
  | 'USED_IP'
  | 'USED_PAYMENT'
  | 'ASSOCIATED_WITH'
  | 'SHARED_IDENTIFIER';

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  relationship: NetworkRelationshipType;
  label?: string;
  weight: number;
}

export interface NetworkSignals {
  customerId: string;
  sharedDeviceCount: number;
  sharedIpCount: number;
  sharedPaymentCount: number;
  connectedCustomersCount: number;
  connectedTransactionsCount: number;
  flaggedAccountConnections: number;
  flaggedTransactionsCount: number;
  networkRiskScore: number;
  isHighRiskRing: boolean;
  summary: string;
}

export interface NetworkGraphResponse {
  customerId: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
  signals: NetworkSignals;
  analyzedAt: string;
}

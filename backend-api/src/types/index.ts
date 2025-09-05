// Enhanced TypeScript interfaces for DigBiz3

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  phone?: string;
  linkedin?: string;
  avatar?: string;
  bio?: string;
  subscriptionTier: 'free' | 'professional' | 'enterprise';
  isVerified: boolean;
  reputation: number;
  networkValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessCard {
  id: string;
  userId: string;
  templateId: string;
  data: object;
  isAR: boolean;
  isNFT: boolean;
  qrCode: string;
  shareCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Connection {
  id: string;
  requesterId: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'blocked';
  matchScore: number;
  tags: string[];
  lastInteraction: Date;
  connectionStrength: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  initiatorId: string;
  participantId: string;
  title: string;
  description: string;
  value: number;
  status: 'negotiating' | 'pending' | 'completed' | 'cancelled';
  commission: number;
  aiScore: number;
  contracts: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIInsight {
  id: string;
  userId: string;
  type: 'opportunity' | 'market_trend' | 'competitor' | 'network_analysis';
  title: string;
  description: string;
  confidence: number;
  data: object;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

export interface SubscriptionTier {
  name: 'free' | 'professional' | 'enterprise';
  price: number;
  features: {
    connections: number | 'unlimited';
    messages: number | 'unlimited';
    advancedAI: boolean;
    videoMeetings: boolean;
    analytics: 'none' | 'basic' | 'advanced';
    apiAccess: boolean;
    whiteLabeling: boolean;
  };
  commission: number;
}

export interface MarketIntelligence {
  industryTrends: object[];
  competitorAnalysis: object[];
  investmentOpportunities: object[];
  priceOptimization: object[];
  demandForecasting: object[];
}

export interface SmartMatchingFeatures {
  intentBasedMatching: boolean;
  personalityCompatibility: boolean;
  successPrediction: boolean;
  optimalTimingAI: boolean;
  crossIndustryOpportunities: boolean;
}

export interface ARBusinessCard {
  scanAndSave: boolean;
  holographicDisplay: boolean;
  contextualInformation: boolean;
  virtualMeetingRooms: boolean;
  productDemonstrations: boolean;
}

export interface BlockchainFeatures {
  identityVerification: boolean;
  reputationTokens: boolean;
  smartContracts: boolean;
  nftBusinessCards: boolean;
  verifiedReviews: boolean;
}
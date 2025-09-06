/**
 * Test Data Factory for DigBiz3 E2E Tests
 * 
 * Generates realistic test data for all platform entities including users,
 * deals, events, connections, business cards, and blockchain transactions.
 * 
 * @version 2.0.0
 * @author DigBiz3 Testing Team
 */

import { faker } from '@faker-js/faker';

export interface User {
  id: string;
  email: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  subscriptionTier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE';
  isVerified: boolean;
  reputation: number;
  tokens: number;
  createdAt: Date;
  bio?: string;
  linkedin?: string;
  website?: string;
  phone?: string;
  complianceRequired?: boolean;
  password?: string;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  value: number;
  currency: string;
  status: 'NEGOTIATING' | 'COMPLETED' | 'CANCELLED' | 'PENDING';
  category: 'strategic-partnership' | 'investment' | 'acquisition' | 'joint-venture';
  userId: string;
  timeline: number; // months
  createdAt: Date;
  participants?: string[];
  attachments?: string[];
}

export interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  strength: number; // 0-1
  createdAt: Date;
  message?: string;
  tags?: string[];
}

export interface Event {
  id: string;
  name: string;
  description: string;
  type: 'conference' | 'networking' | 'workshop' | 'virtual';
  startDate: Date;
  endDate: Date;
  location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  attendeeCount: number;
  isVirtual: boolean;
  industry: string;
  createdAt: Date;
}

export interface BusinessCardData {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website?: string;
  linkedin?: string;
  industry: string;
  bio: string;
  nftTokenId?: string;
  isVerified: boolean;
  holographic?: boolean;
  userId: string;
}

export interface BlockchainTransaction {
  id: string;
  type: 'token_mint' | 'token_transfer' | 'nft_mint' | 'contract_deploy';
  fromAddress: string;
  toAddress: string;
  amount?: number;
  tokenId?: string;
  contractAddress?: string;
  gasUsed: number;
  transactionHash: string;
  blockNumber: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
}

export interface AIAnalysis {
  id: string;
  type: 'compatibility' | 'deal_success' | 'network_value' | 'market_trends';
  inputData: any;
  results: {
    score?: number;
    confidence: number;
    factors: string[];
    recommendations: string[];
  };
  modelVersion: string;
  processingTime: number; // milliseconds
  createdAt: Date;
}

export class TestDataFactory {
  private static userCounter = 0;
  private static dealCounter = 0;
  private static eventCounter = 0;

  /**
   * Create a realistic user with industry-appropriate details
   */
  static createUser(overrides: Partial<User> = {}): User {
    this.userCounter++;
    
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const industry = overrides.industry || faker.helpers.arrayElement([
      'technology', 'finance', 'healthcare', 'manufacturing', 'consulting',
      'real-estate', 'entertainment', 'education', 'retail', 'energy'
    ]);
    
    // Industry-specific titles and companies
    const industryData = this.getIndustrySpecificData(industry);
    
    return {
      id: `user_${Date.now()}_${this.userCounter}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${faker.internet.domainName()}`,
      name: `${firstName} ${lastName}`,
      title: faker.helpers.arrayElement(industryData.titles),
      company: faker.helpers.arrayElement(industryData.companies) + faker.company.companySuffix(),
      industry,
      subscriptionTier: 'FREE',
      isVerified: faker.datatype.boolean(0.7), // 70% verified
      reputation: faker.number.int({ min: 0, max: 100 }),
      tokens: faker.number.int({ min: 0, max: 500 }),
      bio: faker.lorem.sentences(faker.number.int({ min: 2, max: 4 })),
      linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
      website: faker.datatype.boolean(0.4) ? faker.internet.url() : undefined,
      phone: faker.phone.number(),
      password: 'TestPassword123!',
      createdAt: faker.date.past({ years: 2 }),
      ...overrides
    };
  }

  /**
   * Create a high-value business deal
   */
  static createDeal(overrides: Partial<Deal> = {}): Deal {
    this.dealCounter++;
    
    const dealTypes = [
      {
        title: 'Strategic Technology Partnership',
        description: 'Collaboration to develop next-generation AI-powered solutions',
        value: faker.number.int({ min: 500000, max: 5000000 }),
        category: 'strategic-partnership' as const
      },
      {
        title: 'Series B Investment Round',
        description: 'Funding round to accelerate market expansion and product development',
        value: faker.number.int({ min: 2000000, max: 50000000 }),
        category: 'investment' as const
      },
      {
        title: 'Acquisition Opportunity',
        description: 'Strategic acquisition to enhance market position and capabilities',
        value: faker.number.int({ min: 10000000, max: 100000000 }),
        category: 'acquisition' as const
      }
    ];
    
    const dealTemplate = faker.helpers.arrayElement(dealTypes);
    
    return {
      id: `deal_${Date.now()}_${this.dealCounter}`,
      title: dealTemplate.title,
      description: dealTemplate.description,
      value: dealTemplate.value,
      currency: 'USD',
      status: faker.helpers.arrayElement(['NEGOTIATING', 'COMPLETED', 'CANCELLED', 'PENDING']),
      category: dealTemplate.category,
      userId: this.createUser().id,
      timeline: faker.number.int({ min: 3, max: 24 }),
      participants: Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, 
        () => this.createUser().id
      ),
      attachments: Array.from({ length: faker.number.int({ min: 0, max: 3 }) },
        () => `document_${faker.string.alphanumeric(8)}.pdf`
      ),
      createdAt: faker.date.recent({ days: 90 }),
      ...overrides
    };
  }

  /**
   * Create a professional networking event
   */
  static createEvent(overrides: Partial<Event> = {}): Event {
    this.eventCounter++;
    
    const eventTypes = [
      'TechCrunch Disrupt', 'CES Innovation Summit', 'Web Summit',
      'Money 20/20', 'Dreamforce', 'SXSW Interactive',
      'Digital Marketing World Forum', 'AI Summit'
    ];
    
    const cities = [
      { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
      { name: 'New York', lat: 40.7128, lng: -74.0060 },
      { name: 'Austin', lat: 30.2672, lng: -97.7431 },
      { name: 'Las Vegas', lat: 36.1699, lng: -115.1398 },
      { name: 'Miami', lat: 25.7617, lng: -80.1918 }
    ];
    
    const city = faker.helpers.arrayElement(cities);
    const isVirtual = faker.datatype.boolean(0.3); // 30% virtual events
    
    return {
      id: `event_${Date.now()}_${this.eventCounter}`,
      name: faker.helpers.arrayElement(eventTypes) + ` ${faker.date.future().getFullYear()}`,
      description: faker.lorem.paragraphs(2),
      type: faker.helpers.arrayElement(['conference', 'networking', 'workshop', 'virtual']),
      startDate: faker.date.future({ years: 1 }),
      endDate: faker.date.future({ years: 1 }),
      location: {
        name: isVirtual ? 'Virtual Event' : `${city.name} Convention Center`,
        address: isVirtual ? 'Online' : faker.location.streetAddress(),
        latitude: city.lat,
        longitude: city.lng
      },
      attendeeCount: faker.number.int({ min: 100, max: 10000 }),
      isVirtual,
      industry: faker.helpers.arrayElement([
        'technology', 'finance', 'healthcare', 'marketing', 'startups'
      ]),
      createdAt: faker.date.past({ months: 6 }),
      ...overrides
    };
  }

  /**
   * Create a professional connection between users
   */
  static createConnection(overrides: Partial<Connection> = {}): Connection {
    const connectionMessages = [
      'Great to meet you at the conference!',
      'Loved your presentation on AI innovation.',
      'Would love to discuss potential collaboration opportunities.',
      'Your insights on market trends were very valuable.',
      'Excited to connect and explore synergies between our companies.'
    ];
    
    return {
      id: `conn_${Date.now()}_${Math.random()}`,
      requesterId: this.createUser().id,
      receiverId: this.createUser().id,
      status: faker.helpers.arrayElement(['PENDING', 'ACCEPTED', 'DECLINED']),
      strength: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
      message: faker.helpers.arrayElement(connectionMessages),
      tags: faker.helpers.arrayElements([
        'potential-partner', 'investor', 'client', 'mentor', 'industry-expert'
      ], faker.number.int({ min: 1, max: 3 })),
      createdAt: faker.date.recent({ days: 30 }),
      ...overrides
    };
  }

  /**
   * Create an AR/NFT-enabled business card
   */
  static createBusinessCard(overrides: Partial<BusinessCardData> = {}): BusinessCardData {
    const user = this.createUser();
    
    return {
      id: `card_${Date.now()}_${Math.random()}`,
      name: user.name,
      title: user.title,
      company: user.company,
      email: user.email,
      phone: user.phone || faker.phone.number(),
      website: user.website,
      linkedin: user.linkedin,
      industry: user.industry,
      bio: user.bio || faker.lorem.sentences(2),
      nftTokenId: faker.datatype.boolean(0.6) ? `nft_${faker.string.alphanumeric(12)}` : undefined,
      isVerified: user.isVerified,
      holographic: faker.datatype.boolean(0.4), // 40% have holographic effects
      userId: user.id,
      ...overrides
    };
  }

  /**
   * Create blockchain transaction records
   */
  static createBlockchainTransaction(overrides: Partial<BlockchainTransaction> = {}): BlockchainTransaction {
    return {
      id: `tx_${Date.now()}_${Math.random()}`,
      type: faker.helpers.arrayElement(['token_mint', 'token_transfer', 'nft_mint', 'contract_deploy']),
      fromAddress: faker.finance.ethereumAddress(),
      toAddress: faker.finance.ethereumAddress(),
      amount: faker.number.int({ min: 1, max: 1000 }),
      tokenId: faker.string.alphanumeric(8),
      contractAddress: faker.finance.ethereumAddress(),
      gasUsed: faker.number.int({ min: 21000, max: 500000 }),
      transactionHash: `0x${faker.string.hexadecimal({ length: 64 }).toLowerCase()}`,
      blockNumber: faker.number.int({ min: 15000000, max: 20000000 }),
      status: faker.helpers.arrayElement(['pending', 'confirmed', 'failed']),
      createdAt: faker.date.recent({ days: 7 }),
      ...overrides
    };
  }

  /**
   * Create AI analysis results
   */
  static createAIAnalysis(overrides: Partial<AIAnalysis> = {}): AIAnalysis {
    const analysisTypes = {
      compatibility: {
        score: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
        factors: ['industry_match', 'experience_level', 'network_overlap', 'geographic_proximity'],
        recommendations: [
          'Schedule a coffee meeting to explore synergies',
          'Introduce through mutual connection for better rapport',
          'Focus on shared industry challenges in conversation'
        ]
      },
      deal_success: {
        score: faker.number.float({ min: 0.2, max: 0.95, fractionDigits: 2 }),
        factors: ['market_timing', 'participant_reputation', 'deal_structure', 'historical_patterns'],
        recommendations: [
          'Adjust timeline to align with market conditions',
          'Include risk mitigation clauses',
          'Consider bringing in additional strategic partners'
        ]
      },
      network_value: {
        score: faker.number.int({ min: 50000, max: 2000000 }),
        factors: ['connection_quality', 'industry_influence', 'deal_facilitation_potential'],
        recommendations: [
          'Focus on building connections in emerging markets',
          'Strengthen relationships with top 10% of network',
          'Attend more industry-specific events'
        ]
      }
    };
    
    const type = overrides.type || faker.helpers.arrayElement(Object.keys(analysisTypes)) as keyof typeof analysisTypes;
    const typeData = analysisTypes[type];
    
    return {
      id: `ai_${Date.now()}_${Math.random()}`,
      type,
      inputData: { placeholder: 'analysis input data' },
      results: {
        score: typeData.score,
        confidence: faker.number.float({ min: 0.6, max: 0.95, fractionDigits: 2 }),
        factors: typeData.factors,
        recommendations: faker.helpers.arrayElements(typeData.recommendations, 
          faker.number.int({ min: 2, max: typeData.recommendations.length })
        )
      },
      modelVersion: `v${faker.number.int({ min: 1, max: 5 })}.${faker.number.int({ min: 0, max: 9 })}`,
      processingTime: faker.number.int({ min: 150, max: 2000 }),
      createdAt: faker.date.recent({ days: 1 }),
      ...overrides
    };
  }

  /**
   * Create a complete user ecosystem with connections and deals
   */
  static createUserEcosystem(userOverrides: Partial<User> = {}) {
    const primaryUser = this.createUser(userOverrides);
    
    // Create connections
    const connections = Array.from({ length: faker.number.int({ min: 10, max: 50 }) }, () =>
      this.createConnection({
        requesterId: primaryUser.id,
        status: faker.helpers.arrayElement(['ACCEPTED', 'PENDING'])
      })
    );
    
    // Create deals for premium users
    const deals = primaryUser.subscriptionTier !== 'FREE' 
      ? Array.from({ length: faker.number.int({ min: 2, max: 10 }) }, () =>
          this.createDeal({ userId: primaryUser.id })
        )
      : [];
    
    // Create business card
    const businessCard = this.createBusinessCard({ userId: primaryUser.id });
    
    // Create AI analyses
    const analyses = Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () =>
      this.createAIAnalysis()
    );
    
    return {
      user: primaryUser,
      connections,
      deals,
      businessCard,
      analyses
    };
  }

  /**
   * Get industry-specific data for realistic user generation
   */
  private static getIndustrySpecificData(industry: string) {
    const industryData: Record<string, { titles: string[], companies: string[] }> = {
      technology: {
        titles: ['Software Engineer', 'CTO', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'AI Researcher'],
        companies: ['TechFlow', 'DataCorp', 'CloudStream', 'InnovateTech', 'QuantumSoft', 'NeuralNet']
      },
      finance: {
        titles: ['Investment Banker', 'Portfolio Manager', 'Financial Analyst', 'Risk Manager', 'Hedge Fund Manager'],
        companies: ['CapitalVentures', 'QuantFund', 'FinanceFirst', 'WealthBuilders', 'InvestmentCore']
      },
      healthcare: {
        titles: ['Chief Medical Officer', 'Healthcare Administrator', 'Biotech Researcher', 'Medical Director'],
        companies: ['HealthTech', 'MedicalSolutions', 'BioInnovate', 'CareSystem', 'HealthFirst']
      },
      consulting: {
        titles: ['Principal Consultant', 'Strategy Director', 'Management Consultant', 'Business Analyst'],
        companies: ['StrategyPro', 'ConsultCorp', 'BusinessSolutions', 'AdvisoryGroup', 'ExpertConsult']
      }
    };
    
    return industryData[industry] || industryData.technology;
  }

  /**
   * Generate test data for specific test scenarios
   */
  static createTestScenario(scenario: 'premium_upgrade' | 'event_networking' | 'deal_negotiation' | 'ai_analysis') {
    switch (scenario) {
      case 'premium_upgrade':
        return {
          freeUser: this.createUser({ subscriptionTier: 'FREE' }),
          premiumFeatures: ['ai_matching', 'network_analytics', 'deal_maker', 'advanced_search']
        };
        
      case 'event_networking':
        const event = this.createEvent();
        const attendees = Array.from({ length: 25 }, () => this.createUser());
        return { event, attendees };
        
      case 'deal_negotiation':
        const dealOwner = this.createUser({ subscriptionTier: 'PROFESSIONAL' });
        const deal = this.createDeal({ userId: dealOwner.id });
        const participants = Array.from({ length: 3 }, () => this.createUser());
        return { dealOwner, deal, participants };
        
      case 'ai_analysis':
        const user = this.createUser({ subscriptionTier: 'ENTERPRISE' });
        const analyses = [
          this.createAIAnalysis({ type: 'compatibility' }),
          this.createAIAnalysis({ type: 'deal_success' }),
          this.createAIAnalysis({ type: 'network_value' })
        ];
        return { user, analyses };
    }
  }
}

// Export commonly used test data generators
export const createTestUser = (overrides?: Partial<User>) => TestDataFactory.createUser(overrides);
export const createTestDeal = (overrides?: Partial<Deal>) => TestDataFactory.createDeal(overrides);
export const createTestEvent = (overrides?: Partial<Event>) => TestDataFactory.createEvent(overrides);
export const createTestConnection = (overrides?: Partial<Connection>) => TestDataFactory.createConnection(overrides);
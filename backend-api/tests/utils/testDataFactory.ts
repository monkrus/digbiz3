import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export interface TestUser {
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
  password?: string;
  token?: string;
}

export interface TestDeal {
  id: string;
  title: string;
  description: string;
  value: number;
  currency: string;
  status: 'DRAFT' | 'NEGOTIATING' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
  userId: string;
  partnerId?: string;
  aiScore?: number;
  successProbability?: number;
}

export interface TestConnection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  strength: number;
  connectionType: 'PROFESSIONAL' | 'PERSONAL';
}

export interface TestBusinessCard {
  id: string;
  userId: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  industry: string;
  bio?: string;
  nftTokenId?: string;
  isVerified: boolean;
  cardData: object;
  qrCode: string;
}

export class TestDataFactory {
  // User Factory
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    const industries = ['technology', 'finance', 'healthcare', 'marketing', 'consulting'];
    const tiers: Array<'FREE' | 'PROFESSIONAL' | 'ENTERPRISE'> = ['FREE', 'PROFESSIONAL', 'ENTERPRISE'];
    
    return {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
      title: faker.person.jobTitle(),
      company: faker.company.name(),
      industry: faker.helpers.arrayElement(industries),
      subscriptionTier: faker.helpers.arrayElement(tiers),
      isVerified: faker.datatype.boolean({ probability: 0.7 }),
      reputation: faker.number.int({ min: 0, max: 500 }),
      tokens: faker.number.int({ min: 0, max: 1000 }),
      password: 'TestPassword123!',
      ...overrides
    };
  }

  static async createUserInDB(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const userData = this.createUser(overrides);
    const hashedPassword = await bcrypt.hash(userData.password || 'TestPassword123!', 12);
    
    const dbUser = await prisma.user.create({
      data: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        title: userData.title,
        company: userData.company,
        industry: userData.industry,
        subscriptionTier: userData.subscriptionTier,
        isVerified: userData.isVerified,
        reputation: userData.reputation,
        tokens: userData.tokens,
        password: hashedPassword,
        bio: faker.lorem.paragraph(),
        avatar: faker.image.avatar(),
        linkedinUrl: `https://linkedin.com/in/${faker.internet.userName()}`,
        websiteUrl: faker.internet.url(),
        phoneNumber: faker.phone.number(),
        location: faker.location.city(),
        timezone: faker.location.timeZone(),
        emailVerified: true,
        emailVerificationToken: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: dbUser.id, 
        email: dbUser.email,
        subscriptionTier: dbUser.subscriptionTier 
      },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '24h' }
    );

    return {
      ...userData,
      token
    };
  }

  // Deal Factory
  static createDeal(overrides: Partial<TestDeal> = {}): TestDeal {
    const statuses: Array<'DRAFT' | 'NEGOTIATING' | 'PENDING' | 'COMPLETED' | 'CANCELLED'> = 
      ['DRAFT', 'NEGOTIATING', 'PENDING', 'COMPLETED', 'CANCELLED'];
    
    return {
      id: `deal_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      title: faker.company.buzzPhrase(),
      description: faker.lorem.paragraph(),
      value: faker.number.int({ min: 5000, max: 500000 }),
      currency: 'USD',
      status: faker.helpers.arrayElement(statuses),
      userId: `user_${Math.random().toString(36).substring(7)}`,
      aiScore: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
      successProbability: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
      ...overrides
    };
  }

  static async createDealInDB(userId: string, overrides: Partial<TestDeal> = {}): Promise<TestDeal> {
    const dealData = this.createDeal({ userId, ...overrides });
    
    const dbDeal = await prisma.deal.create({
      data: {
        id: dealData.id,
        title: dealData.title,
        description: dealData.description,
        value: dealData.value,
        currency: dealData.currency,
        status: dealData.status,
        userId: dealData.userId,
        partnerId: dealData.partnerId,
        aiScore: dealData.aiScore,
        successProbability: dealData.successProbability,
        contractUrl: faker.internet.url(),
        terms: {
          deliveryDays: faker.number.int({ min: 7, max: 90 }),
          milestones: faker.number.int({ min: 1, max: 5 }),
          paymentTerms: faker.helpers.arrayElement(['NET30', 'NET60', 'UPFRONT', '50_50'])
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return dealData;
  }

  // Connection Factory
  static createConnection(overrides: Partial<TestConnection> = {}): TestConnection {
    const statuses: Array<'PENDING' | 'ACCEPTED' | 'DECLINED'> = ['PENDING', 'ACCEPTED', 'DECLINED'];
    const types: Array<'PROFESSIONAL' | 'PERSONAL'> = ['PROFESSIONAL', 'PERSONAL'];
    
    return {
      id: `conn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      requesterId: `user_${Math.random().toString(36).substring(7)}`,
      receiverId: `user_${Math.random().toString(36).substring(7)}`,
      status: faker.helpers.arrayElement(statuses),
      strength: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
      connectionType: faker.helpers.arrayElement(types),
      ...overrides
    };
  }

  static async createConnectionInDB(
    requesterId: string, 
    receiverId: string, 
    overrides: Partial<TestConnection> = {}
  ): Promise<TestConnection> {
    const connectionData = this.createConnection({ requesterId, receiverId, ...overrides });
    
    await prisma.connection.create({
      data: {
        id: connectionData.id,
        requesterId: connectionData.requesterId,
        receiverId: connectionData.receiverId,
        status: connectionData.status,
        strength: connectionData.strength,
        connectionType: connectionData.connectionType,
        message: faker.lorem.sentence(),
        connectedAt: connectionData.status === 'ACCEPTED' ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return connectionData;
  }

  // Business Card Factory
  static createBusinessCard(overrides: Partial<TestBusinessCard> = {}): TestBusinessCard {
    const industries = ['technology', 'finance', 'healthcare', 'marketing', 'consulting'];
    
    return {
      id: `card_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: `user_${Math.random().toString(36).substring(7)}`,
      name: faker.person.fullName(),
      title: faker.person.jobTitle(),
      company: faker.company.name(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      website: faker.internet.url(),
      linkedin: `https://linkedin.com/in/${faker.internet.userName()}`,
      industry: faker.helpers.arrayElement(industries),
      bio: faker.lorem.sentences(2),
      nftTokenId: `nft_${faker.string.alphanumeric(8)}`,
      isVerified: faker.datatype.boolean({ probability: 0.8 }),
      cardData: {
        backgroundColor: faker.color.rgb(),
        textColor: faker.color.rgb(),
        logoUrl: faker.image.url(),
        theme: faker.helpers.arrayElement(['modern', 'classic', 'minimal', 'bold'])
      },
      qrCode: `digbiz3://card/${faker.string.alphanumeric(12)}`,
      ...overrides
    };
  }

  // AI Prediction Data Factory
  static createAIPredictionData() {
    return {
      user1: this.createUser({ industry: 'technology', subscriptionTier: 'PROFESSIONAL' }),
      user2: this.createUser({ industry: 'technology', subscriptionTier: 'PROFESSIONAL' }),
      context: {
        eventType: faker.helpers.arrayElement(['networking', 'conference', 'meeting', 'social']),
        location: faker.location.city(),
        industry: faker.helpers.arrayElement(['technology', 'finance', 'healthcare']),
        mutualConnections: faker.number.int({ min: 0, max: 20 })
      },
      expectedScore: faker.number.float({ min: 0.3, max: 0.95, fractionDigits: 2 })
    };
  }

  // Blockchain Test Data Factory
  static createBlockchainTestData() {
    return {
      verificationData: {
        publicKey: `0x${faker.string.hexadecimal({ length: 40, casing: 'lower' })}`,
        signature: `0x${faker.string.hexadecimal({ length: 128, casing: 'lower' })}`,
        message: faker.lorem.sentence(),
        documents: ['passport.pdf', 'utility_bill.pdf'],
        biometric: faker.string.hexadecimal({ length: 64, casing: 'lower' })
      },
      tokenData: {
        amount: faker.number.int({ min: 10, max: 1000 }),
        reason: faker.helpers.arrayElement([
          'successful_deal', 'positive_review', 'network_contribution',
          'identity_verification', 'community_participation', 'referral_bonus'
        ])
      },
      nftCardData: {
        name: faker.person.fullName(),
        title: faker.person.jobTitle(),
        company: faker.company.name(),
        email: faker.internet.email(),
        avatar: faker.image.avatar(),
        rarity: faker.helpers.arrayElement(['common', 'rare', 'legendary'])
      },
      dealContractData: {
        buyerId: `user_${faker.string.alphanumeric(8)}`,
        sellerId: `user_${faker.string.alphanumeric(8)}`,
        amount: faker.number.int({ min: 1000, max: 100000 }),
        terms: {
          deliveryDays: faker.number.int({ min: 7, max: 90 }),
          milestones: faker.number.int({ min: 1, max: 5 }),
          escrowPercentage: faker.number.float({ min: 0.1, max: 1, fractionDigits: 2 })
        }
      }
    };
  }

  // Premium Feature Test Data
  static createPremiumFeatureTestData() {
    return {
      networkAnalytics: {
        totalConnections: faker.number.int({ min: 10, max: 1000 }),
        networkValue: faker.number.float({ min: 1000, max: 1000000, fractionDigits: 2 }),
        growthRate: faker.number.float({ min: -0.5, max: 2.0, fractionDigits: 2 }),
        influenceScore: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
        industryRank: faker.number.int({ min: 1, max: 100 })
      },
      marketIntelligence: {
        trends: Array.from({ length: 5 }, () => ({
          topic: faker.company.buzzNoun(),
          score: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
          trend: faker.helpers.arrayElement(['rising', 'falling', 'stable'])
        })),
        opportunities: Array.from({ length: 3 }, () => ({
          title: faker.company.buzzPhrase(),
          description: faker.lorem.paragraph(),
          score: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
          category: faker.helpers.arrayElement(['investment', 'partnership', 'acquisition'])
        }))
      },
      dealPrediction: {
        successProbability: faker.number.float({ min: 0.1, max: 0.95, fractionDigits: 2 }),
        confidence: faker.number.float({ min: 0.6, max: 0.99, fractionDigits: 2 }),
        keyFactors: Array.from({ length: 5 }, () => ({
          factor: faker.helpers.arrayElement([
            'Industry Compatibility', 'Experience Level', 'Network Overlap',
            'Geographic Proximity', 'Past Success Rate'
          ]),
          importance: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
          currentValue: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
          impact: faker.helpers.arrayElement(['positive', 'negative'])
        })),
        recommendations: Array.from({ length: 3 }, () => faker.lorem.sentence()),
        riskLevel: faker.helpers.arrayElement(['Low', 'Medium', 'High']),
        recommendedAction: faker.lorem.sentence()
      }
    };
  }

  // Mock API Response Factory
  static createMockApiResponse<T>(data: T, success: boolean = true) {
    return {
      success,
      data,
      message: success ? 'Operation completed successfully' : 'Operation failed',
      timestamp: new Date().toISOString(),
      requestId: faker.string.uuid()
    };
  }

  // Performance Test Data Factory
  static createPerformanceTestData(userCount: number = 100) {
    return {
      users: Array.from({ length: userCount }, () => this.createUser()),
      connections: Array.from({ length: userCount * 5 }, () => this.createConnection()),
      deals: Array.from({ length: userCount / 2 }, () => this.createDeal()),
      messages: Array.from({ length: userCount * 10 }, () => ({
        id: faker.string.uuid(),
        senderId: `user_${faker.string.alphanumeric(8)}`,
        receiverId: `user_${faker.string.alphanumeric(8)}`,
        content: faker.lorem.sentence(),
        timestamp: faker.date.recent()
      }))
    };
  }

  // Error Scenario Factory
  static createErrorScenarios() {
    return {
      validation: {
        invalidEmail: 'invalid-email',
        shortPassword: '123',
        negativeAmount: -100,
        invalidTokenId: '',
        maliciousScript: '<script>alert("xss")</script>'
      },
      authorization: {
        expiredToken: 'expired.jwt.token',
        invalidToken: 'invalid.jwt.token',
        insufficientTier: 'FREE',
        unauthorizedAction: 'admin_action_attempt'
      },
      business: {
        insufficientFunds: 0,
        duplicateConnection: 'already_connected',
        dealNotFound: 'non_existent_deal_id',
        blockchainFailure: 'network_timeout'
      }
    };
  }
}

// Database Seeder Class
export class TestDatabaseSeeder {
  static async seedTestData() {
    console.log('🌱 Seeding test database...');
    
    try {
      // Create test users
      const users = await Promise.all([
        // Free tier users
        ...Array.from({ length: 20 }, () => 
          TestDataFactory.createUserInDB({ subscriptionTier: 'FREE' })
        ),
        // Professional users
        ...Array.from({ length: 10 }, () =>
          TestDataFactory.createUserInDB({ subscriptionTier: 'PROFESSIONAL' })
        ),
        // Enterprise users
        ...Array.from({ length: 5 }, () =>
          TestDataFactory.createUserInDB({ subscriptionTier: 'ENTERPRISE' })
        )
      ]);

      console.log(`✅ Created ${users.length} test users`);

      // Create connections between users
      const connectionPromises = [];
      for (let i = 0; i < 50; i++) {
        const requester = faker.helpers.arrayElement(users);
        const receiver = faker.helpers.arrayElement(users.filter(u => u.id !== requester.id));
        
        connectionPromises.push(
          TestDataFactory.createConnectionInDB(
            requester.id,
            receiver.id,
            { status: faker.helpers.arrayElement(['PENDING', 'ACCEPTED', 'DECLINED']) }
          )
        );
      }

      await Promise.all(connectionPromises);
      console.log(`✅ Created ${connectionPromises.length} test connections`);

      // Create deals for premium users
      const premiumUsers = users.filter(u => 
        u.subscriptionTier === 'PROFESSIONAL' || u.subscriptionTier === 'ENTERPRISE'
      );

      const dealPromises = premiumUsers.map(user =>
        TestDataFactory.createDealInDB(user.id)
      );

      await Promise.all(dealPromises);
      console.log(`✅ Created ${dealPromises.length} test deals`);

      console.log('🎉 Test database seeding completed successfully');
      
      return {
        users,
        connections: connectionPromises.length,
        deals: dealPromises.length
      };
    } catch (error) {
      console.error('❌ Test database seeding failed:', error);
      throw error;
    }
  }

  static async cleanupTestData() {
    console.log('🧹 Cleaning up test database...');
    
    try {
      await prisma.deal.deleteMany({});
      await prisma.connection.deleteMany({});
      await prisma.user.deleteMany({});
      
      console.log('✅ Test database cleanup completed');
    } catch (error) {
      console.error('❌ Test database cleanup failed:', error);
      throw error;
    }
  }
}

export default TestDataFactory;
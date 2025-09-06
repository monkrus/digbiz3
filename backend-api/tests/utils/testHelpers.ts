import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { TestUser, TestDataFactory } from './testDataFactory';

const prisma = new PrismaClient();

export interface TestContext {
  app: Express;
  testUser?: TestUser;
  testUsers?: TestUser[];
  cleanupFunctions: (() => Promise<void>)[];
}

export class TestHelpers {
  // Authentication helpers
  static async authenticatedRequest(
    app: Express, 
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string,
    user: TestUser,
    data?: any
  ) {
    const requestAgent = request(app)[method](endpoint);
    
    if (user.token) {
      requestAgent.set('Authorization', `Bearer ${user.token}`);
    }
    
    if (data && (method === 'post' || method === 'put' || method === 'patch')) {
      requestAgent.send(data);
    }
    
    return requestAgent;
  }

  static async createAuthenticatedUser(
    subscriptionTier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE' = 'FREE'
  ): Promise<TestUser> {
    const user = await TestDataFactory.createUserInDB({ subscriptionTier });
    return user;
  }

  static async createMultipleAuthenticatedUsers(
    count: number,
    subscriptionTier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE' = 'FREE'
  ): Promise<TestUser[]> {
    return Promise.all(
      Array.from({ length: count }, () => 
        this.createAuthenticatedUser(subscriptionTier)
      )
    );
  }

  // Database helpers
  static async cleanupDatabase() {
    const tablesToCleanup = [
      'Deal', 'Connection', 'Review', 'Message', 
      'ARBusinessCard', 'User'
    ];

    for (const table of tablesToCleanup) {
      try {
        await (prisma as any)[table.toLowerCase()].deleteMany({});
      } catch (error) {
        // Table might not exist, continue cleanup
        console.warn(`Warning: Could not cleanup table ${table}:`, error.message);
      }
    }
  }

  static async setupTestDatabase() {
    await this.cleanupDatabase();
    // Run any necessary migrations or setup
  }

  // Mock external services
  static mockStripeService() {
    const originalStripe = jest.requireActual('stripe');
    return {
      customers: {
        create: jest.fn().mockResolvedValue({
          id: 'cus_test123',
          email: 'test@example.com'
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'cus_test123',
          subscriptions: {
            data: [{
              id: 'sub_test123',
              status: 'active',
              items: {
                data: [{
                  price: {
                    id: 'price_professional',
                    unit_amount: 2900
                  }
                }]
              }
            }]
          }
        })
      },
      subscriptions: {
        create: jest.fn().mockResolvedValue({
          id: 'sub_test123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
        }),
        update: jest.fn().mockResolvedValue({
          id: 'sub_test123',
          status: 'active'
        }),
        cancel: jest.fn().mockResolvedValue({
          id: 'sub_test123',
          status: 'canceled'
        })
      },
      paymentMethods: {
        attach: jest.fn().mockResolvedValue({
          id: 'pm_test123'
        })
      }
    };
  }

  static mockOpenAIService() {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  compatibility_score: 0.85,
                  key_factors: [
                    { factor: 'Industry Compatibility', score: 0.9 },
                    { factor: 'Experience Level', score: 0.8 }
                  ],
                  recommendations: ['Schedule a video call', 'Prepare talking points']
                })
              }
            }]
          })
        }
      }
    };
  }

  static mockBlockchainService() {
    return {
      verifyIdentity: jest.fn().mockResolvedValue({
        verified: true,
        confidence: 0.95,
        verificationMethod: 'multi-layer-blockchain',
        blockchainTxHash: '0x1234567890abcdef',
        timestamp: new Date()
      }),
      mintReputationTokens: jest.fn().mockResolvedValue({
        tokenId: 'token_123',
        txHash: '0xabcdef1234567890',
        amount: 50,
        reason: 'successful_deal'
      }),
      mintNFTBusinessCard: jest.fn().mockResolvedValue({
        tokenId: 'nft_123',
        metadataUri: 'ipfs://QmExample123',
        mintTx: '0xnftmint123',
        rarity: 'rare'
      }),
      createDealContract: jest.fn().mockResolvedValue({
        contractId: 'contract_123',
        contractAddress: '0xcontract123',
        deploymentTx: '0xdeploy123',
        status: 'active'
      })
    };
  }

  static mockAIService() {
    return {
      calculateCompatibility: jest.fn().mockResolvedValue(0.85),
      predictMeetingSuccess: jest.fn().mockResolvedValue({
        success_probability: 0.78,
        confidence: 0.91,
        key_factors: [
          { factor: 'Industry Compatibility', importance: 0.9, current_value: 0.85, impact: 'positive' },
          { factor: 'Network Overlap', importance: 0.7, current_value: 0.6, impact: 'positive' }
        ],
        recommendations: ['Prepare industry-specific talking points', 'Mention mutual connections'],
        risk_level: 'Low',
        recommended_action: 'Proceed with meeting setup'
      }),
      generateMarketIntelligence: jest.fn().mockResolvedValue({
        trends: [
          { topic: 'AI Integration', score: 0.92, trend: 'rising' },
          { topic: 'Remote Work', score: 0.78, trend: 'stable' }
        ],
        opportunities: [
          { title: 'AI Consulting Services', score: 0.88, category: 'service' }
        ]
      }),
      predictDealSuccess: jest.fn().mockResolvedValue({
        success_probability: 0.82,
        confidence: 0.87,
        key_factors: [
          { factor: 'Deal Size', importance: 0.8, current_value: 0.7, impact: 'positive' },
          { factor: 'Timeline', importance: 0.6, current_value: 0.9, impact: 'positive' }
        ],
        recommendations: ['Negotiate payment terms', 'Set clear milestones'],
        risk_level: 'Medium',
        recommended_action: 'Proceed with caution'
      })
    };
  }

  // API response helpers
  static expectSuccessResponse(response: any, expectedStatus: number = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('message');
  }

  static expectErrorResponse(
    response: any, 
    expectedStatus: number, 
    errorMessage?: string
  ) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    
    if (errorMessage) {
      expect(response.body.error).toContain(errorMessage);
    }
  }

  static expectPremiumFeatureBlocked(response: any) {
    this.expectErrorResponse(response, 403, 'Premium subscription required');
  }

  static expectAuthenticationRequired(response: any) {
    this.expectErrorResponse(response, 401, 'Authentication required');
  }

  // Validation helpers
  static validateUserObject(user: any) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('subscriptionTier');
    expect(user).not.toHaveProperty('password');
  }

  static validateDealObject(deal: any) {
    expect(deal).toHaveProperty('id');
    expect(deal).toHaveProperty('title');
    expect(deal).toHaveProperty('description');
    expect(deal).toHaveProperty('value');
    expect(deal).toHaveProperty('status');
    expect(deal).toHaveProperty('userId');
  }

  static validateConnectionObject(connection: any) {
    expect(connection).toHaveProperty('id');
    expect(connection).toHaveProperty('requesterId');
    expect(connection).toHaveProperty('receiverId');
    expect(connection).toHaveProperty('status');
    expect(['PENDING', 'ACCEPTED', 'DECLINED']).toContain(connection.status);
  }

  static validateNetworkAnalytics(analytics: any) {
    expect(analytics).toHaveProperty('networkValue');
    expect(analytics).toHaveProperty('totalConnections');
    expect(analytics).toHaveProperty('growthRate');
    expect(analytics).toHaveProperty('influenceScore');
    expect(typeof analytics.networkValue).toBe('number');
    expect(typeof analytics.totalConnections).toBe('number');
  }

  static validateAIPrediction(prediction: any) {
    expect(prediction).toHaveProperty('success_probability');
    expect(prediction).toHaveProperty('confidence');
    expect(prediction).toHaveProperty('key_factors');
    expect(prediction).toHaveProperty('recommendations');
    expect(Array.isArray(prediction.key_factors)).toBe(true);
    expect(Array.isArray(prediction.recommendations)).toBe(true);
    expect(prediction.success_probability).toBeGreaterThanOrEqual(0);
    expect(prediction.success_probability).toBeLessThanOrEqual(1);
  }

  static validateBlockchainResponse(response: any) {
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('txHash');
    expect(typeof response.txHash).toBe('string');
    expect(response.txHash).toMatch(/^0x[a-fA-F0-9]+$/);
  }

  // Performance testing helpers
  static async measureExecutionTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = process.hrtime();
    const result = await operation();
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const executionTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    
    return { result, executionTime };
  }

  static async measureApiResponseTime(
    app: Express,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string,
    user?: TestUser,
    data?: any
  ) {
    const startTime = process.hrtime();
    
    let requestAgent = request(app)[method](endpoint);
    
    if (user?.token) {
      requestAgent = requestAgent.set('Authorization', `Bearer ${user.token}`);
    }
    
    if (data && (method === 'post' || method === 'put' || method === 'patch')) {
      requestAgent = requestAgent.send(data);
    }
    
    const response = await requestAgent;
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1000000;
    
    return { response, responseTime };
  }

  // Load testing helpers
  static async simulateConcurrentRequests<T>(
    operation: () => Promise<T>,
    concurrency: number,
    duration?: number
  ): Promise<{ results: T[]; errors: Error[]; averageTime: number }> {
    const results: T[] = [];
    const errors: Error[] = [];
    const executionTimes: number[] = [];
    
    const promises = Array.from({ length: concurrency }, async () => {
      const startTime = Date.now();
      try {
        const result = await operation();
        const endTime = Date.now();
        executionTimes.push(endTime - startTime);
        results.push(result);
      } catch (error) {
        errors.push(error as Error);
      }
    });
    
    await Promise.all(promises);
    
    const averageTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    
    return { results, errors, averageTime };
  }

  // Security testing helpers
  static generateMaliciousPayloads() {
    return {
      xss: [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '"><script>alert("xss")</script>'
      ],
      sqlInjection: [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "1'; DELETE FROM users WHERE '1'='1"
      ],
      pathTraversal: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ],
      oversizedPayload: 'A'.repeat(1000000), // 1MB string
      nullBytes: 'file\x00.txt',
      unicodeAttacks: [
        '\u0000',
        '\uFEFF',
        '\u202E'
      ]
    };
  }

  static async testInputValidation(
    app: Express,
    endpoint: string,
    field: string,
    invalidValues: any[],
    user?: TestUser
  ) {
    const results = [];
    
    for (const invalidValue of invalidValues) {
      const payload = { [field]: invalidValue };
      
      const { response } = await this.measureApiResponseTime(
        app, 'post', endpoint, user, payload
      );
      
      results.push({
        value: invalidValue,
        status: response.status,
        blocked: response.status >= 400
      });
    }
    
    return results;
  }

  // Rate limiting testing helpers
  static async testRateLimit(
    app: Express,
    endpoint: string,
    user: TestUser,
    requestCount: number = 100
  ) {
    const responses = [];
    
    for (let i = 0; i < requestCount; i++) {
      const response = await this.authenticatedRequest(
        app, 'get', endpoint, user
      );
      responses.push({
        request: i + 1,
        status: response.status,
        rateLimited: response.status === 429
      });
    }
    
    return {
      responses,
      rateLimitHit: responses.some(r => r.rateLimited),
      firstRateLimitAt: responses.find(r => r.rateLimited)?.request
    };
  }

  // WebSocket testing helpers
  static createWebSocketClient(token: string) {
    const io = require('socket.io-client');
    return io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket']
    });
  }

  static async waitForSocketEvent(
    socket: any,
    event: string,
    timeout: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Socket event '${event}' not received within ${timeout}ms`));
      }, timeout);
      
      socket.once(event, (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  // Mobile app testing helpers (for API endpoints used by mobile)
  static createMobileApiHeaders() {
    return {
      'User-Agent': 'DigBiz3-Mobile/1.0.0 (iOS 17.0)',
      'X-Platform': 'mobile',
      'X-App-Version': '1.0.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  static async testMobileEndpoint(
    app: Express,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    endpoint: string,
    user: TestUser,
    data?: any
  ) {
    let requestAgent = request(app)[method](endpoint)
      .set(this.createMobileApiHeaders())
      .set('Authorization', `Bearer ${user.token}`);
    
    if (data && (method === 'post' || method === 'put' || method === 'patch')) {
      requestAgent = requestAgent.send(data);
    }
    
    return requestAgent;
  }
}

export default TestHelpers;
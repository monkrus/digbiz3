/**
 * Mock Services for DigBiz3 E2E Tests
 * 
 * Provides comprehensive mocking for external services including APIs,
 * blockchain, AI services, payment processing, and authentication.
 * 
 * @version 2.0.0
 * @author DigBiz3 Testing Team
 */

import { Page } from '@playwright/test';
import { authenticator } from 'otplib';
import crypto from 'crypto';

export interface MockAPIResponse {
  status: number;
  data?: any;
  error?: string;
}

export interface MockUser {
  id: string;
  email: string;
  password: string;
  subscriptionTier: string;
}

export interface MockPayment {
  paymentMethodId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
}

export interface MockBlockchainTransaction {
  transactionHash: string;
  blockNumber: number;
  gasUsed: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface MockAIResult {
  score: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
  processingTime: number;
}

export interface MockARCard {
  name: string;
  company: string;
  nftTokenId?: string;
  holographic?: boolean;
}

export class MockServices {
  private static mockUsers: Map<string, MockUser> = new Map();
  private static mockTokens: Map<string, string> = new Map();
  private static mockTransactions: Map<string, MockBlockchainTransaction> = new Map();
  private static mockEvents: Map<string, any> = new Map();
  private static isInitialized = false;

  /**
   * Initialize all mock services
   */
  static async initializeTestEnvironment() {
    if (this.isInitialized) return;
    
    console.log('🔧 Initializing mock services...');
    
    // Setup API mocks
    await this.setupAPIMocks();
    
    // Setup blockchain mocks
    await this.setupBlockchainMocks();
    
    // Setup AI service mocks
    await this.setupAIMocks();
    
    // Setup payment mocks
    await this.setupPaymentMocks();
    
    // Setup external service mocks
    await this.setupExternalServiceMocks();
    
    this.isInitialized = true;
    console.log('✅ Mock services initialized');
  }

  /**
   * Setup comprehensive API mocking
   */
  static async setupAPIMocks() {
    // Mock will be setup via Playwright route interception
    console.log('📡 API mocks configured');
  }

  /**
   * Setup mock APIs for testing
   */
  static async setupMockAPIs() {
    // This would typically setup MSW or similar mock server
    console.log('🌐 Mock APIs started');
  }

  /**
   * Create and store a test user
   */
  static async createUser(user: MockUser): Promise<void> {
    this.mockUsers.set(user.email, user);
    console.log(`👤 Mock user created: ${user.email}`);
  }

  /**
   * Authenticate user and return token
   */
  static async loginUser(email: string, password: string): Promise<string> {
    const user = this.mockUsers.get(email);
    if (!user || user.password !== password) {
      throw new Error('Invalid credentials');
    }
    
    const token = this.generateJWTToken(user);
    this.mockTokens.set(token, user.id);
    
    return token;
  }

  /**
   * Authenticate user in browser context
   */
  static async authenticateUser(page: Page, user: MockUser): Promise<void> {
    await page.evaluate((userData) => {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', 'mock_jwt_token_' + userData.id);
    }, user);
  }

  /**
   * Generate mock JWT token
   */
  private static generateJWTToken(user: MockUser): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      tier: user.subscriptionTier,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    })).toString('base64');
    
    return `${header}.${payload}.mock_signature`;
  }

  /**
   * Mock email verification process
   */
  static async getEmailVerificationToken(email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    console.log(`📧 Email verification token generated for ${email}: ${token}`);
    return token;
  }

  /**
   * Mock Stripe payment processing
   */
  static async mockStripePayment(overrides: Partial<MockPayment> = {}): Promise<MockPayment> {
    const payment: MockPayment = {
      paymentMethodId: 'pm_mock_card_visa',
      amount: 2900, // $29.00 for Professional tier
      currency: 'usd',
      status: 'succeeded',
      ...overrides
    };
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`💳 Mock payment processed: $${payment.amount / 100} ${payment.currency.toUpperCase()}`);
    return payment;
  }

  /**
   * Setup blockchain service mocks
   */
  static async setupBlockchainMocks() {
    console.log('⛓️ Blockchain mocks configured');
  }

  /**
   * Mock blockchain transaction
   */
  static async mockBlockchainTransaction(type: 'mint' | 'transfer' | 'deploy'): Promise<MockBlockchainTransaction> {
    const transaction: MockBlockchainTransaction = {
      transactionHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
      gasUsed: Math.floor(Math.random() * 200000) + 21000,
      status: 'confirmed'
    };
    
    // Simulate blockchain processing time
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    this.mockTransactions.set(transaction.transactionHash, transaction);
    console.log(`⛓️ Mock blockchain transaction: ${transaction.transactionHash}`);
    
    return transaction;
  }

  /**
   * Setup AI service mocks
   */
  static async setupAIMocks() {
    console.log('🤖 AI service mocks configured');
  }

  /**
   * Mock AI analysis processing
   */
  static async mockAIAnalysis(type: 'compatibility' | 'deal_success' | 'network_value', inputData: any): Promise<MockAIResult> {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
    
    const analysisResults: Record<string, Partial<MockAIResult>> = {
      compatibility: {
        score: Math.random() * 0.8 + 0.2, // 0.2 - 1.0
        factors: ['industry_alignment', 'experience_level', 'network_overlap', 'geographic_proximity'],
        recommendations: [
          'Schedule in-person meeting for better rapport',
          'Focus on shared industry challenges',
          'Leverage mutual connections for introduction'
        ]
      },
      deal_success: {
        score: Math.random() * 0.7 + 0.3, // 0.3 - 1.0
        factors: ['market_timing', 'participant_reputation', 'deal_structure', 'industry_trends'],
        recommendations: [
          'Consider adjusting timeline for optimal market conditions',
          'Include performance-based milestones',
          'Add risk mitigation clauses'
        ]
      },
      network_value: {
        score: Math.floor(Math.random() * 1000000) + 100000, // $100k - $1.1M
        factors: ['connection_quality', 'industry_influence', 'deal_facilitation'],
        recommendations: [
          'Focus on quality over quantity in connections',
          'Attend high-value industry events',
          'Strengthen top 10% of network relationships'
        ]
      }
    };
    
    const baseResult = analysisResults[type] || analysisResults.compatibility;
    
    const result: MockAIResult = {
      score: baseResult.score!,
      confidence: Math.random() * 0.3 + 0.7, // 0.7 - 1.0
      factors: baseResult.factors!,
      recommendations: baseResult.recommendations!,
      processingTime: Math.floor(Math.random() * 2000) + 500,
      ...baseResult
    };
    
    console.log(`🤖 Mock AI analysis (${type}): score ${result.score.toFixed(2)}, confidence ${result.confidence.toFixed(2)}`);
    return result;
  }

  /**
   * Setup payment service mocks
   */
  static async setupPaymentMocks() {
    console.log('💳 Payment service mocks configured');
  }

  /**
   * Mock external service integrations
   */
  static async setupExternalServiceMocks() {
    console.log('🌍 External service mocks configured');
  }

  /**
   * Mock event creation
   */
  static async createEvent(event: any, attendees: any[]): Promise<void> {
    this.mockEvents.set(event.id, { ...event, attendees });
    console.log(`🎫 Mock event created: ${event.name} with ${attendees.length} attendees`);
  }

  /**
   * Generate TOTP code for 2FA testing
   */
  static generateTOTPCode(secret: string): string {
    authenticator.options = { window: 1 };
    return authenticator.generate(secret);
  }

  /**
   * Mock biometric authentication
   */
  static async mockBiometricAuth(page: Page): Promise<void> {
    await page.evaluate(() => {
      // Simulate biometric success
      window.dispatchEvent(new CustomEvent('biometric-auth-success'));
    });
    
    console.log('👆 Mock biometric authentication successful');
  }

  /**
   * Mock AR card detection
   */
  static async mockARCardDetection(cardData: MockARCard): Promise<void> {
    // Simulate AR processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log(`📱 Mock AR card detected: ${cardData.name} from ${cardData.company}`);
    
    // This would trigger AR card display in the app
    // In real implementation, this would be handled by AR framework
  }

  /**
   * Mock push notification delivery
   */
  static async sendPushNotification(userId: string, notification: {
    type: string;
    title: string;
    message: string;
  }): Promise<void> {
    console.log(`📲 Mock push notification sent to ${userId}: ${notification.title}`);
    
    // In real tests, this would trigger notification UI
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Simulate event ending
   */
  static async simulateEventEnd(eventId: string): Promise<void> {
    const event = this.mockEvents.get(eventId);
    if (event) {
      event.status = 'ended';
      console.log(`🏁 Event ${event.name} has ended`);
    }
  }

  /**
   * Simulate time passage for testing
   */
  static async simulateTimePassage(days: number): Promise<void> {
    console.log(`⏰ Simulating ${days} days passage`);
    // This would typically update mock data to reflect time passage
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Mock security incident for testing
   */
  static async simulateSecurityIncident(type: string): Promise<void> {
    console.log(`🚨 Mock security incident triggered: ${type}`);
    
    // This would typically trigger security alerts in the application
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Mock geolocation services
   */
  static async mockGeolocation(page: Page, latitude: number, longitude: number): Promise<void> {
    await page.context().setGeolocation({ latitude, longitude });
    console.log(`📍 Mock geolocation set: ${latitude}, ${longitude}`);
  }

  /**
   * Mock network conditions (online/offline)
   */
  static async setNetworkConditions(page: Page, offline: boolean): Promise<void> {
    await page.context().setOffline(offline);
    console.log(`🌐 Network conditions: ${offline ? 'offline' : 'online'}`);
  }

  /**
   * Generate mock API responses
   */
  static mockAPIResponse(data: any, status = 200): MockAPIResponse {
    return { status, data };
  }

  /**
   * Mock file upload process
   */
  static async mockFileUpload(files: string[]): Promise<string[]> {
    const uploadedFiles = files.map(file => `uploaded_${Date.now()}_${file}`);
    
    // Simulate upload time
    await new Promise(resolve => setTimeout(resolve, 1000 * files.length));
    
    console.log(`📁 Mock file upload completed: ${uploadedFiles.length} files`);
    return uploadedFiles;
  }

  /**
   * Mock WebRTC/video call functionality
   */
  static async mockVideoCall(page: Page): Promise<void> {
    await page.evaluate(() => {
      // Mock successful WebRTC connection
      window.dispatchEvent(new CustomEvent('webrtc-connected'));
    });
    
    console.log('📹 Mock video call established');
  }

  /**
   * Mock integration with external platforms (LinkedIn, etc.)
   */
  static async mockSocialIntegration(platform: string, success = true): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (success) {
      console.log(`🔗 Mock ${platform} integration successful`);
      return {
        platform,
        connected: true,
        profileData: {
          id: `mock_${platform}_id`,
          name: 'Mock User',
          connections: Math.floor(Math.random() * 500) + 100
        }
      };
    } else {
      throw new Error(`Failed to connect to ${platform}`);
    }
  }

  /**
   * Clean up all mock services
   */
  static async cleanup(): Promise<void> {
    this.mockUsers.clear();
    this.mockTokens.clear();
    this.mockTransactions.clear();
    this.mockEvents.clear();
    console.log('🧹 Mock services cleaned up');
  }

  /**
   * Complete cleanup for test environment
   */
  static async cleanupTestEnvironment(): Promise<void> {
    await this.cleanup();
    this.isInitialized = false;
    console.log('🧹 Test environment cleanup completed');
  }

  /**
   * Get mock statistics for debugging
   */
  static getStatistics() {
    return {
      users: this.mockUsers.size,
      tokens: this.mockTokens.size,
      transactions: this.mockTransactions.size,
      events: this.mockEvents.size,
      initialized: this.isInitialized
    };
  }
}

// Utility functions for common mocking patterns
export const mockSuccessResponse = (data: any) => MockServices.mockAPIResponse(data, 200);
export const mockErrorResponse = (error: string, status = 400) => MockServices.mockAPIResponse({ error }, status);

// Export commonly used mock types
export type {
  MockUser,
  MockPayment,
  MockBlockchainTransaction,
  MockAIResult,
  MockARCard
};
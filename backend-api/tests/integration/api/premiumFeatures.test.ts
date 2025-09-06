import request from 'supertest';
import { Express } from 'express';
import { TestDataFactory, TestHelpers } from '../../utils';

describe('Premium Features API Integration Tests', () => {
  let app: Express;
  let freeUser: any;
  let professionalUser: any;
  let enterpriseUser: any;

  beforeAll(async () => {
    app = require('../../../src/app').default;
    await TestHelpers.setupTestDatabase();
  });

  beforeEach(async () => {
    await TestHelpers.cleanupDatabase();
    
    // Create test users with different subscription tiers
    freeUser = await TestDataFactory.createUserInDB({ 
      subscriptionTier: 'FREE',
      isVerified: true 
    });
    professionalUser = await TestDataFactory.createUserInDB({ 
      subscriptionTier: 'PROFESSIONAL',
      isVerified: true 
    });
    enterpriseUser = await TestDataFactory.createUserInDB({ 
      subscriptionTier: 'ENTERPRISE',
      isVerified: true 
    });
  });

  afterAll(async () => {
    await TestHelpers.cleanupDatabase();
  });

  describe('Network Analytics (Premium Feature)', () => {
    const networkAnalyticsEndpoint = '/api/v2/analytics/network-value';

    it('should allow professional users to access network analytics', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', networkAnalyticsEndpoint, professionalUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      TestHelpers.validateNetworkAnalytics(response.body.data);
      
      expect(response.body.data).toHaveProperty('networkValue');
      expect(response.body.data).toHaveProperty('totalConnections');
      expect(response.body.data).toHaveProperty('growthRate');
      expect(response.body.data).toHaveProperty('influenceScore');
      expect(response.body.data).toHaveProperty('industryRank');
      expect(response.body.data).toHaveProperty('connectionQuality');
      expect(response.body.data).toHaveProperty('revenueAttribution');
    });

    it('should allow enterprise users to access network analytics', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', networkAnalyticsEndpoint, enterpriseUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      TestHelpers.validateNetworkAnalytics(response.body.data);
      
      // Enterprise users should get additional metrics
      expect(response.body.data).toHaveProperty('teamAnalytics');
      expect(response.body.data).toHaveProperty('customMetrics');
    });

    it('should block free users from network analytics', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', networkAnalyticsEndpoint, freeUser
      ).expect(403);

      TestHelpers.expectPremiumFeatureBlocked(response);
      expect(response.body).toHaveProperty('upgradeUrl');
      expect(response.body).toHaveProperty('requiredTier', 'PROFESSIONAL');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(networkAnalyticsEndpoint)
        .expect(401);

      TestHelpers.expectAuthenticationRequired(response);
    });

    it('should handle query parameters for date range', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', `${networkAnalyticsEndpoint}?startDate=2024-01-01&endDate=2024-12-31`, 
        professionalUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('dateRange');
    });
  });

  describe('AI Deal Prediction (Premium Feature)', () => {
    const dealPredictionEndpoint = '/api/v2/ai/predict-deal';

    beforeEach(async () => {
      // Create test deals for premium users
      await TestDataFactory.createDealInDB(professionalUser.id);
      await TestDataFactory.createDealInDB(enterpriseUser.id);
    });

    it('should predict deal success for professional users', async () => {
      const dealData = {
        title: 'Software Development Contract',
        description: 'Custom CRM system development',
        value: 150000,
        duration_months: 8,
        match_score: 0.75
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', dealPredictionEndpoint, professionalUser, dealData
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      TestHelpers.validateAIPrediction(response.body.data.prediction);
      
      expect(response.body.data.prediction).toHaveProperty('success_probability');
      expect(response.body.data.prediction).toHaveProperty('confidence');
      expect(response.body.data.prediction).toHaveProperty('key_factors');
      expect(response.body.data.prediction).toHaveProperty('recommendations');
      expect(response.body.data.prediction).toHaveProperty('risk_level');
      expect(response.body.data.prediction).toHaveProperty('recommended_action');
    });

    it('should provide enhanced predictions for enterprise users', async () => {
      const dealData = {
        title: 'Enterprise Integration Project',
        description: 'Large-scale system integration',
        value: 500000,
        duration_months: 12,
        match_score: 0.85
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', dealPredictionEndpoint, enterpriseUser, dealData
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      // Enterprise users should get additional insights
      expect(response.body.data.prediction).toHaveProperty('competitive_analysis');
      expect(response.body.data.prediction).toHaveProperty('market_positioning');
      expect(response.body.data.prediction).toHaveProperty('custom_factors');
    });

    it('should block free users from AI predictions', async () => {
      const dealData = {
        title: 'Small Project',
        value: 5000
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', dealPredictionEndpoint, freeUser, dealData
      ).expect(403);

      TestHelpers.expectPremiumFeatureBlocked(response);
    });

    it('should validate deal data input', async () => {
      const invalidDealData = {
        // missing required fields
        value: -1000 // negative value
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', dealPredictionEndpoint, professionalUser, invalidDealData
      ).expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'validation');
    });

    it('should handle AI service unavailability', async () => {
      // Mock AI service failure
      const dealData = {
        title: 'Test Deal',
        value: 10000,
        force_ai_failure: true // Test flag to simulate AI failure
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', dealPredictionEndpoint, professionalUser, dealData
      ).expect(200);

      // Should return fallback prediction
      TestHelpers.expectSuccessResponse(response);
      expect(response.body.data.prediction).toHaveProperty('fallback', true);
      expect(response.body.data.prediction).toHaveProperty('success_probability');
    });
  });

  describe('Market Intelligence (Premium Feature)', () => {
    const marketIntelEndpoint = '/api/v2/intelligence/market-trends';

    it('should provide market intelligence to professional users', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', `${marketIntelEndpoint}?industry=technology`, professionalUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data).toHaveProperty('opportunities');
      expect(response.body.data).toHaveProperty('market_indicators');
      expect(response.body.data).toHaveProperty('generated_at');
      
      // Validate trends structure
      expect(Array.isArray(response.body.data.trends)).toBe(true);
      response.body.data.trends.forEach(trend => {
        expect(trend).toHaveProperty('topic');
        expect(trend).toHaveProperty('score');
        expect(trend).toHaveProperty('trend');
        expect(['rising', 'falling', 'stable']).toContain(trend.trend);
      });

      // Validate opportunities structure
      expect(Array.isArray(response.body.data.opportunities)).toBe(true);
      response.body.data.opportunities.forEach(opportunity => {
        expect(opportunity).toHaveProperty('title');
        expect(opportunity).toHaveProperty('score');
        expect(opportunity).toHaveProperty('category');
      });
    });

    it('should provide advanced intelligence to enterprise users', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', `${marketIntelEndpoint}?industry=finance&analysis_depth=advanced`, 
        enterpriseUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      // Enterprise users get additional data
      expect(response.body.data).toHaveProperty('competitive_landscape');
      expect(response.body.data).toHaveProperty('investment_opportunities');
      expect(response.body.data).toHaveProperty('regulatory_insights');
      expect(response.body.data).toHaveProperty('custom_research');
    });

    it('should block free users from market intelligence', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', marketIntelEndpoint, freeUser
      ).expect(403);

      TestHelpers.expectPremiumFeatureBlocked(response);
    });

    it('should validate industry parameter', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', `${marketIntelEndpoint}?industry=invalid_industry`, 
        professionalUser
      ).expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'Invalid industry');
    });

    it('should cache market intelligence data', async () => {
      const industry = 'technology';
      
      // First request
      const { response: response1, responseTime: time1 } = 
        await TestHelpers.measureApiResponseTime(
          app, 'get', `${marketIntelEndpoint}?industry=${industry}`, 
          professionalUser
        );

      expect(response1.status).toBe(200);
      
      // Second request (should be faster due to caching)
      const { response: response2, responseTime: time2 } = 
        await TestHelpers.measureApiResponseTime(
          app, 'get', `${marketIntelEndpoint}?industry=${industry}`, 
          professionalUser
        );

      expect(response2.status).toBe(200);
      expect(time2).toBeLessThan(time1 * 0.5); // Should be significantly faster
      expect(response2.body.data).toHaveProperty('cached', true);
    });
  });

  describe('AR/VR Features (Premium Feature)', () => {
    const arMeetingRoomsEndpoint = '/api/v2/ar/meeting-rooms';

    it('should list AR meeting rooms for professional users', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', arMeetingRoomsEndpoint, professionalUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      expect(response.body.data).toHaveProperty('meetingRooms');
      expect(Array.isArray(response.body.data.meetingRooms)).toBe(true);
      
      response.body.data.meetingRooms.forEach(room => {
        expect(room).toHaveProperty('id');
        expect(room).toHaveProperty('name');
        expect(room).toHaveProperty('theme');
        expect(room).toHaveProperty('capacity');
        expect(room).toHaveProperty('features');
        expect(room).toHaveProperty('availability');
      });
    });

    it('should create AR meeting room for enterprise users', async () => {
      const roomData = {
        name: 'Tech Innovation Hub',
        theme: 'futuristic',
        capacity: 10,
        features: ['holographic_displays', 'spatial_audio', '3d_whiteboards'],
        privacy_level: 'private'
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', arMeetingRoomsEndpoint, enterpriseUser, roomData
      ).expect(201);

      TestHelpers.expectSuccessResponse(response, 201);
      
      expect(response.body.data.room).toHaveProperty('id');
      expect(response.body.data.room.name).toBe(roomData.name);
      expect(response.body.data.room.ownerId).toBe(enterpriseUser.id);
      expect(response.body.data.room).toHaveProperty('accessUrl');
      expect(response.body.data.room).toHaveProperty('qrCode');
    });

    it('should block professional users from creating custom rooms', async () => {
      const roomData = {
        name: 'Custom Room',
        theme: 'modern'
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', arMeetingRoomsEndpoint, professionalUser, roomData
      ).expect(403);

      TestHelpers.expectErrorResponse(response, 403, 'Enterprise feature');
    });

    it('should block free users from AR features', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', arMeetingRoomsEndpoint, freeUser
      ).expect(403);

      TestHelpers.expectPremiumFeatureBlocked(response);
    });
  });

  describe('Revenue Attribution Tracking (Premium Feature)', () => {
    const revenueEndpoint = '/api/v2/revenue/attribution';

    beforeEach(async () => {
      // Create some completed deals for revenue tracking
      await TestDataFactory.createDealInDB(professionalUser.id, { 
        status: 'COMPLETED',
        value: 50000 
      });
      await TestDataFactory.createDealInDB(enterpriseUser.id, { 
        status: 'COMPLETED',
        value: 200000 
      });
    });

    it('should track revenue attribution for professional users', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', revenueEndpoint, professionalUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('platformCommission');
      expect(response.body.data).toHaveProperty('dealsFacilitated');
      expect(response.body.data).toHaveProperty('averageDealSize');
      expect(response.body.data).toHaveProperty('monthlyBreakdown');
      expect(response.body.data).toHaveProperty('topCategories');
      
      expect(typeof response.body.data.totalRevenue).toBe('number');
      expect(response.body.data.totalRevenue).toBeGreaterThan(0);
    });

    it('should provide detailed analytics for enterprise users', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', `${revenueEndpoint}?detailed=true`, enterpriseUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      // Enterprise users get additional metrics
      expect(response.body.data).toHaveProperty('teamRevenue');
      expect(response.body.data).toHaveProperty('departmentBreakdown');
      expect(response.body.data).toHaveProperty('roi_analysis');
      expect(response.body.data).toHaveProperty('forecasting');
    });

    it('should block free users from revenue tracking', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', revenueEndpoint, freeUser
      ).expect(403);

      TestHelpers.expectPremiumFeatureBlocked(response);
    });

    it('should handle date range queries', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', `${revenueEndpoint}?startDate=${startDate}&endDate=${endDate}`, 
        professionalUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('dateRange');
      expect(response.body.data.dateRange.start).toBe(startDate);
      expect(response.body.data.dateRange.end).toBe(endDate);
    });
  });

  describe('Advanced Matching (Premium Feature)', () => {
    const smartMatchingEndpoint = '/api/v2/matching/smart-match';

    it('should provide AI-powered matching for professional users', async () => {
      const matchingCriteria = {
        industry: 'technology',
        experience_level: 'senior',
        deal_size_range: [10000, 100000],
        location_preference: 'remote',
        availability: 'immediate'
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', smartMatchingEndpoint, professionalUser, matchingCriteria
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      expect(response.body.data).toHaveProperty('matches');
      expect(Array.isArray(response.body.data.matches)).toBe(true);
      expect(response.body.data).toHaveProperty('totalMatches');
      expect(response.body.data).toHaveProperty('averageCompatibility');
      
      response.body.data.matches.forEach(match => {
        expect(match).toHaveProperty('userId');
        expect(match).toHaveProperty('compatibilityScore');
        expect(match).toHaveProperty('matchingFactors');
        expect(match).toHaveProperty('meetingPrediction');
        expect(match.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(match.compatibilityScore).toBeLessThanOrEqual(1);
      });
    });

    it('should provide ultra-precise matching for enterprise users', async () => {
      const advancedCriteria = {
        industry: 'finance',
        custom_factors: {
          company_size: 'enterprise',
          certification_requirements: ['PMP', 'CFA'],
          security_clearance: 'required'
        },
        exclusions: ['competitors'],
        priority_factors: ['track_record', 'mutual_connections']
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', `${smartMatchingEndpoint}/advanced`, 
        enterpriseUser, advancedCriteria
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      // Enterprise matching includes additional features
      expect(response.body.data).toHaveProperty('matches');
      expect(response.body.data).toHaveProperty('exclusionAnalysis');
      expect(response.body.data).toHaveProperty('customFactorWeights');
      expect(response.body.data).toHaveProperty('competitorInsights');
    });

    it('should provide basic matching for free users', async () => {
      const basicCriteria = {
        industry: 'technology'
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', `${smartMatchingEndpoint}/basic`, freeUser, basicCriteria
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      // Free users get limited results
      expect(response.body.data.matches.length).toBeLessThanOrEqual(5);
      expect(response.body.data).toHaveProperty('upgradePrompt');
      expect(response.body.data.matches[0]).not.toHaveProperty('meetingPrediction');
    });

    it('should validate matching criteria', async () => {
      const invalidCriteria = {
        industry: 'invalid_industry',
        deal_size_range: [-1000, 'invalid'] // Invalid range
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', smartMatchingEndpoint, professionalUser, invalidCriteria
      ).expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'Invalid matching criteria');
    });
  });

  describe('Subscription Tier Validation', () => {
    it('should validate subscription tier changes', async () => {
      // Attempt to access enterprise feature with professional account
      const enterpriseFeatureEndpoint = '/api/v2/enterprise/team-management';
      
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', enterpriseFeatureEndpoint, professionalUser
      ).expect(403);

      TestHelpers.expectErrorResponse(response, 403, 'Enterprise subscription required');
      expect(response.body).toHaveProperty('currentTier', 'PROFESSIONAL');
      expect(response.body).toHaveProperty('requiredTier', 'ENTERPRISE');
    });

    it('should handle expired subscriptions', async () => {
      // Create user with expired subscription
      const expiredUser = await TestDataFactory.createUserInDB({
        subscriptionTier: 'PROFESSIONAL',
        subscriptionStatus: 'EXPIRED',
        isVerified: true
      });

      const response = await TestHelpers.authenticatedRequest(
        app, 'get', '/api/v2/analytics/network-value', expiredUser
      ).expect(403);

      TestHelpers.expectErrorResponse(response, 403, 'subscription has expired');
      expect(response.body).toHaveProperty('renewalUrl');
    });

    it('should handle subscription downgrades gracefully', async () => {
      // Test user who was downgraded from professional to free
      const downgraded = await TestDataFactory.createUserInDB({
        subscriptionTier: 'FREE',
        previousTier: 'PROFESSIONAL',
        isVerified: true
      });

      const response = await TestHelpers.authenticatedRequest(
        app, 'get', '/api/v2/analytics/network-value', downgraded
      ).expect(403);

      TestHelpers.expectPremiumFeatureBlocked(response);
      expect(response.body).toHaveProperty('wasDowngraded', true);
      expect(response.body).toHaveProperty('reactivationOffer');
    });
  });

  describe('Feature Usage Analytics', () => {
    it('should track premium feature usage', async () => {
      // Make several requests to track usage
      await TestHelpers.authenticatedRequest(
        app, 'get', '/api/v2/analytics/network-value', professionalUser
      );
      
      await TestHelpers.authenticatedRequest(
        app, 'get', '/api/v2/intelligence/market-trends?industry=technology', 
        professionalUser
      );

      const usageResponse = await TestHelpers.authenticatedRequest(
        app, 'get', '/api/v2/users/feature-usage', professionalUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(usageResponse);
      
      expect(usageResponse.body.data).toHaveProperty('monthlyUsage');
      expect(usageResponse.body.data).toHaveProperty('featureBreakdown');
      expect(usageResponse.body.data).toHaveProperty('usageQuota');
      expect(usageResponse.body.data.featureBreakdown).toHaveProperty('analytics');
      expect(usageResponse.body.data.featureBreakdown).toHaveProperty('intelligence');
    });

    it('should enforce feature usage limits', async () => {
      // Create user with exhausted quota
      const limitedUser = await TestDataFactory.createUserInDB({
        subscriptionTier: 'PROFESSIONAL',
        monthlyQuotaUsed: 1000,
        monthlyQuotaLimit: 1000,
        isVerified: true
      });

      const response = await TestHelpers.authenticatedRequest(
        app, 'get', '/api/v2/analytics/network-value', limitedUser
      ).expect(429);

      TestHelpers.expectErrorResponse(response, 429, 'monthly quota exceeded');
      expect(response.body).toHaveProperty('quotaReset');
      expect(response.body).toHaveProperty('upgradeOptions');
    });
  });
});
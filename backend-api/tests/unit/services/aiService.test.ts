import { TestDataFactory, TestHelpers } from '../../utils';
import AIService from '../../../src/services/aiService';

// Mock external dependencies
jest.mock('openai');
jest.mock('axios');

describe('AIService', () => {
  let aiService: AIService;
  let mockOpenAI: any;
  let mockAxios: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAI = TestHelpers.mockOpenAIService();
    mockAxios = require('axios');
    aiService = new AIService();
  });

  describe('Smart Matching Algorithm', () => {
    it('should calculate compatibility score between users', async () => {
      const testData = TestDataFactory.createAIPredictionData();
      
      // Mock AI service response
      mockAxios.post.mockResolvedValue({
        data: {
          compatibility_score: 0.85,
          key_factors: [
            { factor: 'Industry Compatibility', score: 0.9 },
            { factor: 'Experience Level', score: 0.8 },
            { factor: 'Network Overlap', score: 0.7 }
          ]
        }
      });

      const result = await aiService.calculateCompatibility(
        testData.user1, 
        testData.user2
      );

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.factors).toBeDefined();
      expect(Array.isArray(result.factors)).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle same industry users with higher compatibility', async () => {
      const user1 = TestDataFactory.createUser({ industry: 'technology' });
      const user2 = TestDataFactory.createUser({ industry: 'technology' });
      
      mockAxios.post.mockResolvedValue({
        data: {
          compatibility_score: 0.92,
          key_factors: [
            { factor: 'Industry Compatibility', score: 1.0 },
            { factor: 'Experience Level', score: 0.85 }
          ]
        }
      });

      const result = await aiService.calculateCompatibility(user1, user2);

      expect(result.score).toBeGreaterThan(0.8);
      expect(result.factors.find(f => f.factor === 'Industry Compatibility')?.score).toBe(1.0);
    });

    it('should handle cross-industry compatibility', async () => {
      const user1 = TestDataFactory.createUser({ industry: 'technology' });
      const user2 = TestDataFactory.createUser({ industry: 'finance' });
      
      mockAxios.post.mockResolvedValue({
        data: {
          compatibility_score: 0.73,
          key_factors: [
            { factor: 'Industry Compatibility', score: 0.6 },
            { factor: 'Complementary Skills', score: 0.85 }
          ]
        }
      });

      const result = await aiService.calculateCompatibility(user1, user2);

      expect(result.score).toBeGreaterThan(0.5);
      expect(result.score).toBeLessThan(0.9);
    });

    it('should validate input data before processing', async () => {
      const invalidUser1 = null;
      const validUser2 = TestDataFactory.createUser();

      await expect(aiService.calculateCompatibility(invalidUser1, validUser2))
        .rejects.toThrow('Invalid user data provided');
    });

    it('should handle AI service unavailability', async () => {
      const user1 = TestDataFactory.createUser();
      const user2 = TestDataFactory.createUser();
      
      mockAxios.post.mockRejectedValue(new Error('AI service unavailable'));

      // Should fall back to basic compatibility calculation
      const result = await aiService.calculateCompatibility(user1, user2);
      
      expect(result.score).toBeGreaterThan(0);
      expect(result.fallback).toBe(true);
    });
  });

  describe('Meeting Success Prediction', () => {
    it('should predict meeting success with confidence score', async () => {
      const testData = TestDataFactory.createAIPredictionData();
      
      mockAxios.post.mockResolvedValue({
        data: {
          success_probability: 0.78,
          confidence: 0.91,
          key_factors: [
            { factor: 'Industry Compatibility', importance: 0.9, current_value: 0.85, impact: 'positive' },
            { factor: 'Network Overlap', importance: 0.7, current_value: 0.6, impact: 'positive' },
            { factor: 'Experience Gap', importance: 0.6, current_value: 0.3, impact: 'negative' }
          ],
          recommendations: [
            'Prepare industry-specific talking points',
            'Mention mutual connections early in conversation',
            'Focus on complementary expertise areas'
          ],
          risk_level: 'Low',
          recommended_action: 'Proceed with meeting setup'
        }
      });

      const result = await aiService.predictMeetingSuccess(
        testData.user1,
        testData.user2,
        testData.context
      );

      TestHelpers.validateAIPrediction(result);
      expect(result.key_factors).toHaveLength(3);
      expect(result.recommendations).toHaveLength(3);
      expect(['Low', 'Medium', 'High']).toContain(result.risk_level);
    });

    it('should consider context factors in prediction', async () => {
      const user1 = TestDataFactory.createUser();
      const user2 = TestDataFactory.createUser();
      const context = {
        eventType: 'conference',
        location: 'San Francisco',
        industry: 'technology',
        mutualConnections: 5
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          success_probability: 0.82,
          confidence: 0.88,
          key_factors: [
            { factor: 'Event Type', importance: 0.8, current_value: 0.9, impact: 'positive' },
            { factor: 'Mutual Connections', importance: 0.75, current_value: 0.8, impact: 'positive' }
          ],
          recommendations: ['Leverage conference setting', 'Mention mutual connections'],
          risk_level: 'Low'
        }
      });

      const result = await aiService.predictMeetingSuccess(user1, user2, context);

      expect(result.success_probability).toBeGreaterThan(0.7);
      expect(result.key_factors.some(f => f.factor === 'Event Type')).toBe(true);
      expect(result.key_factors.some(f => f.factor === 'Mutual Connections')).toBe(true);
    });

    it('should handle high-risk predictions', async () => {
      const user1 = TestDataFactory.createUser({ industry: 'technology' });
      const user2 = TestDataFactory.createUser({ industry: 'agriculture' });
      const context = { eventType: 'cold_outreach', mutualConnections: 0 };
      
      mockAxios.post.mockResolvedValue({
        data: {
          success_probability: 0.25,
          confidence: 0.85,
          key_factors: [
            { factor: 'Industry Mismatch', importance: 0.9, current_value: 0.1, impact: 'negative' },
            { factor: 'Cold Outreach', importance: 0.8, current_value: 0.2, impact: 'negative' }
          ],
          recommendations: [
            'Research common business challenges',
            'Find technology applications in agriculture',
            'Consider warm introduction instead'
          ],
          risk_level: 'High',
          recommended_action: 'Reconsider approach or seek warm introduction'
        }
      });

      const result = await aiService.predictMeetingSuccess(user1, user2, context);

      expect(result.success_probability).toBeLessThan(0.5);
      expect(result.risk_level).toBe('High');
      expect(result.recommended_action).toContain('Reconsider');
    });
  });

  describe('Market Intelligence Generation', () => {
    it('should generate market trends analysis', async () => {
      const industry = 'technology';
      
      mockAxios.post.mockResolvedValue({
        data: {
          trends: [
            { topic: 'AI Integration', score: 0.92, trend: 'rising', growth_rate: 0.35 },
            { topic: 'Remote Work', score: 0.78, trend: 'stable', growth_rate: 0.05 },
            { topic: 'Cryptocurrency', score: 0.45, trend: 'falling', growth_rate: -0.12 }
          ],
          opportunities: [
            {
              title: 'AI Consulting Services',
              description: 'Growing demand for AI implementation consulting',
              score: 0.88,
              category: 'service',
              market_size: '2.5B',
              growth_potential: 'high'
            },
            {
              title: 'Cloud Migration Services',
              description: 'Enterprise cloud adoption acceleration',
              score: 0.82,
              category: 'service',
              market_size: '1.8B',
              growth_potential: 'medium'
            }
          ],
          market_indicators: {
            overall_sentiment: 'positive',
            volatility: 'medium',
            key_drivers: ['AI adoption', 'digital transformation', 'cost optimization']
          }
        }
      });

      const result = await aiService.generateMarketIntelligence(industry);

      expect(result.trends).toBeDefined();
      expect(Array.isArray(result.trends)).toBe(true);
      expect(result.opportunities).toBeDefined();
      expect(Array.isArray(result.opportunities)).toBe(true);
      expect(result.market_indicators).toBeDefined();
      
      // Validate trend objects
      result.trends.forEach(trend => {
        expect(trend).toHaveProperty('topic');
        expect(trend).toHaveProperty('score');
        expect(trend).toHaveProperty('trend');
        expect(['rising', 'falling', 'stable']).toContain(trend.trend);
      });

      // Validate opportunity objects
      result.opportunities.forEach(opportunity => {
        expect(opportunity).toHaveProperty('title');
        expect(opportunity).toHaveProperty('score');
        expect(opportunity).toHaveProperty('category');
        expect(opportunity.score).toBeGreaterThanOrEqual(0);
        expect(opportunity.score).toBeLessThanOrEqual(1);
      });
    });

    it('should provide industry-specific insights', async () => {
      const industries = ['technology', 'finance', 'healthcare'];
      
      for (const industry of industries) {
        mockAxios.post.mockResolvedValue({
          data: {
            trends: [
              { topic: `${industry} Innovation`, score: 0.85, trend: 'rising' }
            ],
            opportunities: [
              { title: `${industry} Opportunity`, score: 0.8, category: 'service' }
            ]
          }
        });

        const result = await aiService.generateMarketIntelligence(industry);
        
        expect(result.trends[0].topic).toContain(industry);
        expect(result.opportunities[0].title).toContain(industry);
      }
    });

    it('should handle real-time data integration', async () => {
      const industry = 'technology';
      
      mockAxios.post.mockResolvedValue({
        data: {
          trends: [
            { 
              topic: 'AI Integration', 
              score: 0.92, 
              trend: 'rising',
              last_updated: new Date().toISOString(),
              data_sources: ['news', 'social_media', 'market_reports']
            }
          ],
          opportunities: [],
          generated_at: new Date().toISOString(),
          data_freshness: '5_minutes'
        }
      });

      const result = await aiService.generateMarketIntelligence(industry);

      expect(result.generated_at).toBeDefined();
      expect(result.data_freshness).toBeDefined();
      expect(result.trends[0].last_updated).toBeDefined();
    });
  });

  describe('Deal Success Prediction', () => {
    it('should predict deal success probability', async () => {
      const dealData = TestDataFactory.createDeal();
      
      mockAxios.post.mockResolvedValue({
        data: {
          success_probability: 0.82,
          confidence: 0.87,
          key_factors: [
            { factor: 'Deal Size', importance: 0.8, current_value: 0.7, impact: 'positive' },
            { factor: 'Timeline', importance: 0.6, current_value: 0.9, impact: 'positive' },
            { factor: 'Competition', importance: 0.7, current_value: 0.4, impact: 'negative' }
          ],
          recommendations: [
            'Negotiate payment terms to reduce risk',
            'Set clear project milestones',
            'Emphasize unique value proposition'
          ],
          risk_level: 'Medium',
          recommended_action: 'Proceed with additional risk mitigation'
        }
      });

      const result = await aiService.predictDealSuccess({
        title: dealData.title,
        description: dealData.description,
        value: dealData.value,
        duration_months: 6,
        match_score: 0.75
      });

      TestHelpers.validateAIPrediction(result);
      expect(result.success_probability).toBeGreaterThan(0.5);
      expect(result.key_factors.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should consider deal size in success calculation', async () => {
      const largeDeal = { value: 500000, title: 'Large Enterprise Deal' };
      const smallDeal = { value: 5000, title: 'Small Project Deal' };
      
      // Large deal prediction
      mockAxios.post.mockResolvedValueOnce({
        data: {
          success_probability: 0.65,
          risk_level: 'High',
          key_factors: [
            { factor: 'Deal Size', importance: 0.9, current_value: 0.8, impact: 'negative' }
          ]
        }
      });

      // Small deal prediction
      mockAxios.post.mockResolvedValueOnce({
        data: {
          success_probability: 0.88,
          risk_level: 'Low',
          key_factors: [
            { factor: 'Deal Size', importance: 0.6, current_value: 0.9, impact: 'positive' }
          ]
        }
      });

      const largeResult = await aiService.predictDealSuccess(largeDeal);
      const smallResult = await aiService.predictDealSuccess(smallDeal);

      expect(smallResult.success_probability).toBeGreaterThan(largeResult.success_probability);
      expect(smallResult.risk_level).toBe('Low');
      expect(largeResult.risk_level).toBe('High');
    });

    it('should provide actionable recommendations', async () => {
      const dealData = {
        title: 'Software Development Project',
        description: 'Custom CRM system development',
        value: 150000,
        duration_months: 8,
        match_score: 0.6
      };
      
      mockAxios.post.mockResolvedValue({
        data: {
          success_probability: 0.70,
          recommendations: [
            'Detailed project specification needed',
            'Consider phased delivery approach',
            'Include change request procedures',
            'Establish regular progress reviews'
          ],
          risk_factors: [
            'Scope creep potential',
            'Technology complexity',
            'Client availability for reviews'
          ]
        }
      });

      const result = await aiService.predictDealSuccess(dealData);

      expect(result.recommendations.length).toBeGreaterThan(0);
      result.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(10); // Meaningful recommendations
      });
    });
  });

  describe('Business Insights Generation', () => {
    it('should generate personalized business insights', async () => {
      const userData = TestDataFactory.createUser({ 
        subscriptionTier: 'PROFESSIONAL',
        industry: 'technology'
      });
      
      mockAxios.post.mockResolvedValue({
        data: {
          insights: [
            {
              type: 'networking_opportunity',
              title: 'Connect with fintech professionals',
              description: 'Your network lacks fintech connections for potential cross-industry opportunities',
              priority: 'high',
              action_items: ['Attend fintech events', 'Join fintech LinkedIn groups']
            },
            {
              type: 'skill_gap',
              title: 'AI/ML expertise demand',
              description: 'High demand for AI expertise in your industry',
              priority: 'medium',
              action_items: ['Consider AI certification', 'Partner with AI specialists']
            }
          ],
          network_analysis: {
            strength: 0.75,
            diversity: 0.6,
            growth_potential: 0.85,
            recommendations: ['Expand into new industries', 'Increase connection quality']
          }
        }
      });

      const result = await aiService.generateBusinessInsights(userData.id);

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.network_analysis).toBeDefined();
      
      result.insights.forEach(insight => {
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('priority');
        expect(['high', 'medium', 'low']).toContain(insight.priority);
      });
    });

    it('should tailor insights to subscription tier', async () => {
      const freeUser = TestDataFactory.createUser({ subscriptionTier: 'FREE' });
      const premiumUser = TestDataFactory.createUser({ subscriptionTier: 'PROFESSIONAL' });
      
      // Free user - basic insights
      mockAxios.post.mockResolvedValueOnce({
        data: {
          insights: [
            { type: 'basic_tip', title: 'Complete your profile', priority: 'high' }
          ],
          upgrade_suggestions: ['Upgrade for advanced insights']
        }
      });

      // Premium user - advanced insights
      mockAxios.post.mockResolvedValueOnce({
        data: {
          insights: [
            { type: 'advanced_analysis', title: 'Market positioning analysis', priority: 'high' },
            { type: 'predictive_insight', title: 'Emerging opportunity forecast', priority: 'medium' }
          ],
          premium_features: ['AI-powered predictions', 'Industry benchmarking']
        }
      });

      const freeResult = await aiService.generateBusinessInsights(freeUser.id);
      const premiumResult = await aiService.generateBusinessInsights(premiumUser.id);

      expect(freeResult.upgrade_suggestions).toBeDefined();
      expect(premiumResult.premium_features).toBeDefined();
      expect(premiumResult.insights.length).toBeGreaterThanOrEqual(freeResult.insights.length);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache compatible score calculations', async () => {
      const user1 = TestDataFactory.createUser();
      const user2 = TestDataFactory.createUser();
      
      mockAxios.post.mockResolvedValue({
        data: { compatibility_score: 0.85 }
      });

      // First call
      const result1 = await aiService.calculateCompatibility(user1, user2);
      
      // Second call (should use cache)
      const result2 = await aiService.calculateCompatibility(user1, user2);

      expect(result1.score).toBe(result2.score);
      expect(mockAxios.post).toHaveBeenCalledTimes(1); // Should only call API once
    });

    it('should handle concurrent requests efficiently', async () => {
      const users = Array.from({ length: 10 }, () => TestDataFactory.createUser());
      
      mockAxios.post.mockResolvedValue({
        data: { compatibility_score: 0.8 }
      });

      const startTime = Date.now();
      
      const promises = users.map(user => 
        aiService.calculateCompatibility(users[0], user)
      );
      
      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(results.length).toBe(10);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      results.forEach(result => {
        expect(result.score).toBeGreaterThan(0);
      });
    });

    it('should implement request throttling', async () => {
      const user1 = TestDataFactory.createUser();
      const user2 = TestDataFactory.createUser();
      
      // Simulate rapid requests
      const rapidRequests = Array.from({ length: 100 }, () =>
        aiService.calculateCompatibility(user1, user2)
      );

      await expect(Promise.all(rapidRequests)).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle AI service timeout gracefully', async () => {
      const user1 = TestDataFactory.createUser();
      const user2 = TestDataFactory.createUser();
      
      mockAxios.post.mockRejectedValue(new Error('Request timeout'));

      const result = await aiService.calculateCompatibility(user1, user2);
      
      expect(result.fallback).toBe(true);
      expect(result.score).toBeGreaterThan(0); // Should provide fallback score
    });

    it('should retry failed requests', async () => {
      const user1 = TestDataFactory.createUser();
      const user2 = TestDataFactory.createUser();
      
      // First two calls fail, third succeeds
      mockAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { compatibility_score: 0.85 }
        });

      const result = await aiService.calculateCompatibility(user1, user2);
      
      expect(result.score).toBe(0.85);
      expect(mockAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should validate AI response data', async () => {
      const user1 = TestDataFactory.createUser();
      const user2 = TestDataFactory.createUser();
      
      // Invalid AI response
      mockAxios.post.mockResolvedValue({
        data: { invalid_field: 'invalid_value' }
      });

      const result = await aiService.calculateCompatibility(user1, user2);
      
      expect(result.fallback).toBe(true);
      expect(result.error).toContain('Invalid AI response');
    });
  });
});
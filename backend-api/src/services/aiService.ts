// AI Service for DigBiz3 - Smart Matching and Business Intelligence

import { User, Connection, Deal, AIInsight, MarketIntelligence } from '../types';

export class AIService {
  private openaiApiKey: string;
  private mlServiceUrl: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
  }

  // Smart Matching Algorithm
  async calculateMatchScore(user1: User, user2: User): Promise<number> {
    try {
      // Multi-factor compatibility scoring
      const industryCompatibility = this.calculateIndustryMatch(user1.industry, user2.industry);
      const titleSynergy = this.calculateTitleSynergy(user1.title, user2.title);
      const networkValue = this.calculateNetworkValue(user1, user2);
      const personalityMatch = await this.calculatePersonalityMatch(user1, user2);
      
      // Weighted scoring algorithm
      const matchScore = (
        industryCompatibility * 0.3 +
        titleSynergy * 0.25 +
        networkValue * 0.2 +
        personalityMatch * 0.25
      ) * 100;

      return Math.min(Math.max(matchScore, 0), 100);
    } catch (error) {
      console.error('Error calculating match score:', error);
      return 0;
    }
  }

  // Predict meeting success rate
  async predictMeetingSuccess(user1: User, user2: User, context: object): Promise<number> {
    try {
      const historicalData = await this.getHistoricalMeetingData(user1, user2);
      const contextualFactors = this.analyzeContext(context);
      const userReputations = (user1.reputation + user2.reputation) / 2;
      
      // ML prediction model (simplified)
      const successProbability = (
        historicalData * 0.4 +
        contextualFactors * 0.3 +
        (userReputations / 100) * 0.3
      );

      return Math.min(Math.max(successProbability * 100, 0), 100);
    } catch (error) {
      console.error('Error predicting meeting success:', error);
      return 50; // Default probability
    }
  }

  // Generate AI insights for business opportunities
  async generateBusinessInsights(userId: string): Promise<AIInsight[]> {
    try {
      const insights: AIInsight[] = [];
      
      // Market trend analysis
      const marketTrends = await this.analyzeMarketTrends(userId);
      insights.push({
        id: `insight_${Date.now()}`,
        userId,
        type: 'market_trend',
        title: 'Emerging Market Opportunity',
        description: `AI detected a 23% growth trend in your industry sector`,
        confidence: 0.87,
        data: marketTrends,
        isRead: false,
        priority: 'high',
        createdAt: new Date()
      });

      // Network analysis
      const networkInsights = await this.analyzeNetworkGaps(userId);
      insights.push({
        id: `insight_${Date.now() + 1}`,
        userId,
        type: 'network_analysis',
        title: 'Network Expansion Opportunity',
        description: 'Connect with C-level executives in fintech for maximum impact',
        confidence: 0.92,
        data: networkInsights,
        isRead: false,
        priority: 'medium',
        createdAt: new Date()
      });

      return insights;
    } catch (error) {
      console.error('Error generating business insights:', error);
      return [];
    }
  }

  // Market Intelligence Analysis
  async getMarketIntelligence(industry: string): Promise<MarketIntelligence> {
    try {
      const marketData: MarketIntelligence = {
        industryTrends: await this.fetchIndustryTrends(industry),
        competitorAnalysis: await this.analyzeCompetitors(industry),
        investmentOpportunities: await this.identifyInvestmentOpportunities(industry),
        priceOptimization: await this.suggestPriceOptimization(industry),
        demandForecasting: await this.forecastDemand(industry)
      };

      return marketData;
    } catch (error) {
      console.error('Error fetching market intelligence:', error);
      return {
        industryTrends: [],
        competitorAnalysis: [],
        investmentOpportunities: [],
        priceOptimization: [],
        demandForecasting: []
      };
    }
  }

  // Deal Success Prediction
  async predictDealSuccess(deal: Deal): Promise<number> {
    try {
      const dealComplexity = this.analyzeDealComplexity(deal);
      const partnerCompatibility = deal.matchScore || 0;
      const marketConditions = await this.analyzeMarketConditions(deal);
      const historicalPerformance = await this.getHistoricalDealPerformance(deal.initiatorId);
      
      const successProbability = (
        dealComplexity * 0.25 +
        partnerCompatibility * 0.3 +
        marketConditions * 0.25 +
        historicalPerformance * 0.2
      );

      return Math.min(Math.max(successProbability, 0), 100);
    } catch (error) {
      console.error('Error predicting deal success:', error);
      return 50;
    }
  }

  // Private helper methods
  private calculateIndustryMatch(industry1: string, industry2: string): number {
    // Industry compatibility matrix
    const compatibilityMatrix: { [key: string]: { [key: string]: number } } = {
      'technology': { 'finance': 0.8, 'healthcare': 0.7, 'technology': 0.9 },
      'finance': { 'technology': 0.8, 'real-estate': 0.9, 'finance': 0.6 },
      'healthcare': { 'technology': 0.7, 'pharmaceuticals': 0.9, 'healthcare': 0.5 }
    };

    return compatibilityMatrix[industry1.toLowerCase()]?.[industry2.toLowerCase()] || 0.5;
  }

  private calculateTitleSynergy(title1: string, title2: string): number {
    // Title synergy analysis
    const seniorityLevel1 = this.extractSeniorityLevel(title1);
    const seniorityLevel2 = this.extractSeniorityLevel(title2);
    
    // Optimal networking usually happens between different seniority levels
    const levelDifference = Math.abs(seniorityLevel1 - seniorityLevel2);
    return levelDifference >= 1 && levelDifference <= 2 ? 0.8 : 0.4;
  }

  private calculateNetworkValue(user1: User, user2: User): number {
    // Calculate potential network value increase
    const combinedNetworkValue = user1.networkValue + user2.networkValue;
    const averageValue = combinedNetworkValue / 2;
    return Math.min(averageValue / 100000, 1); // Normalize to 0-1 range
  }

  private async calculatePersonalityMatch(user1: User, user2: User): Promise<number> {
    // Simplified personality matching (would use actual MBTI analysis in production)
    const user1Keywords = this.extractPersonalityKeywords(user1.bio || '');
    const user2Keywords = this.extractPersonalityKeywords(user2.bio || '');
    
    const commonKeywords = user1Keywords.filter(keyword => 
      user2Keywords.includes(keyword)
    );
    
    return commonKeywords.length / Math.max(user1Keywords.length, user2Keywords.length, 1);
  }

  private extractSeniorityLevel(title: string): number {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('ceo') || lowerTitle.includes('founder')) return 5;
    if (lowerTitle.includes('director') || lowerTitle.includes('vp')) return 4;
    if (lowerTitle.includes('manager') || lowerTitle.includes('lead')) return 3;
    if (lowerTitle.includes('senior')) return 2;
    return 1;
  }

  private extractPersonalityKeywords(bio: string): string[] {
    const keywords = ['innovative', 'strategic', 'collaborative', 'analytical', 'creative', 'results-driven'];
    return keywords.filter(keyword => bio.toLowerCase().includes(keyword));
  }

  private async getHistoricalMeetingData(user1: User, user2: User): Promise<number> {
    // Would query actual database for historical meeting success rates
    return 0.7; // Mock data
  }

  private analyzeContext(context: object): number {
    // Analyze meeting context (event type, timing, location, etc.)
    return 0.6; // Mock score
  }

  private async analyzeMarketTrends(userId: string): Promise<object> {
    return { trend: 'upward', growth: 23, confidence: 0.87 };
  }

  private async analyzeNetworkGaps(userId: string): Promise<object> {
    return { suggestedConnections: ['fintech', 'c-level'], impact: 'high' };
  }

  private async fetchIndustryTrends(industry: string): Promise<object[]> {
    return [{ trend: 'AI adoption', growth: '+45%', timeline: '2024' }];
  }

  private async analyzeCompetitors(industry: string): Promise<object[]> {
    return [{ competitor: 'Company X', marketShare: '15%', threat: 'medium' }];
  }

  private async identifyInvestmentOpportunities(industry: string): Promise<object[]> {
    return [{ opportunity: 'AI startups', potential: 'high', risk: 'medium' }];
  }

  private async suggestPriceOptimization(industry: string): Promise<object[]> {
    return [{ suggestion: 'Increase SaaS pricing by 12%', impact: '+23% revenue' }];
  }

  private async forecastDemand(industry: string): Promise<object[]> {
    return [{ product: 'AI tools', demand: '+67%', timeframe: 'Q2 2024' }];
  }

  private analyzeDealComplexity(deal: Deal): number {
    // Analyze deal complexity based on value, description, etc.
    const valueComplexity = Math.min(deal.value / 1000000, 1); // Normalize by million
    return 1 - valueComplexity; // Inverse relationship: simpler = higher success
  }

  private async analyzeMarketConditions(deal: Deal): Promise<number> {
    // Mock market condition analysis
    return 0.75;
  }

  private async getHistoricalDealPerformance(userId: string): Promise<number> {
    // Mock historical performance
    return 0.8;
  }
}

export default new AIService();
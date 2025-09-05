import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AIInsight, MarketTrend, Deal } from '../api/apiSlice';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
  color: string;
  icon: string;
}

interface PremiumState {
  // AI Insights
  insights: AIInsight[];
  unreadInsights: number;
  insightCategories: string[];
  
  // Market Intelligence
  marketTrends: MarketTrend[];
  marketData: {
    industry?: string;
    growth?: string;
    opportunities?: number;
    lastUpdated?: string;
  };
  
  // Analytics
  networkAnalytics: {
    networkValue: number;
    growth: string;
    roi: number;
    connections: number;
    dealsCompleted: number;
    revenue: number;
  };
  
  // Deals
  deals: Deal[];
  dealPipeline: {
    negotiating: number;
    pending: number;
    completed: number;
    totalValue: number;
  };
  
  // Subscription
  subscriptionPlans: SubscriptionPlan[];
  currentSubscription?: {
    tier: string;
    status: string;
    renewalDate: string;
    features: string[];
  };
  
  // Smart Matching
  smartMatches: any[];
  matchingPreferences: {
    industry?: string[];
    location?: string;
    interests?: string[];
    experienceLevel?: string;
    companySize?: string;
  };
  
  // State
  isLoading: boolean;
  error: string | null;
  activeTab: 'insights' | 'analytics' | 'deals' | 'matching';
}

const initialState: PremiumState = {
  insights: [],
  unreadInsights: 0,
  insightCategories: ['all', 'opportunities', 'trends', 'recommendations'],
  
  marketTrends: [],
  marketData: {},
  
  networkAnalytics: {
    networkValue: 0,
    growth: '0%',
    roi: 0,
    connections: 0,
    dealsCompleted: 0,
    revenue: 0,
  },
  
  deals: [],
  dealPipeline: {
    negotiating: 0,
    pending: 0,
    completed: 0,
    totalValue: 0,
  },
  
  subscriptionPlans: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['5 connections/month', '50 messages/month', 'Basic matching'],
      color: '#9CA3AF',
      icon: '🆓',
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 29,
      features: [
        'Unlimited connections',
        'Advanced AI matching',
        'Video meetings',
        'Basic analytics',
        '2% commission on deals',
      ],
      popular: true,
      color: '#6366F1',
      icon: '⭐',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99,
      features: [
        'All Professional features',
        'Team management',
        'API access',
        'White labeling',
        'Advanced analytics',
        '1.5% commission on deals',
        'Custom integrations',
      ],
      color: '#7C3AED',
      icon: '💎',
    },
  ],
  
  smartMatches: [],
  matchingPreferences: {},
  
  isLoading: false,
  error: null,
  activeTab: 'insights',
};

const premiumSlice = createSlice({
  name: 'premium',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<PremiumState['activeTab']>) => {
      state.activeTab = action.payload;
    },
    
    // AI Insights
    setInsights: (state, action: PayloadAction<AIInsight[]>) => {
      state.insights = action.payload;
      state.unreadInsights = action.payload.filter(insight => !insight.isRead).length;
    },
    addInsight: (state, action: PayloadAction<AIInsight>) => {
      state.insights.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadInsights += 1;
      }
    },
    markInsightAsRead: (state, action: PayloadAction<string>) => {
      const insight = state.insights.find(i => i.id === action.payload);
      if (insight && !insight.isRead) {
        insight.isRead = true;
        state.unreadInsights = Math.max(0, state.unreadInsights - 1);
      }
    },
    
    // Market Intelligence
    setMarketTrends: (state, action: PayloadAction<MarketTrend[]>) => {
      state.marketTrends = action.payload;
    },
    setMarketData: (state, action: PayloadAction<PremiumState['marketData']>) => {
      state.marketData = { ...state.marketData, ...action.payload };
    },
    
    // Analytics
    setNetworkAnalytics: (state, action: PayloadAction<PremiumState['networkAnalytics']>) => {
      state.networkAnalytics = { ...state.networkAnalytics, ...action.payload };
    },
    updateNetworkValue: (state, action: PayloadAction<number>) => {
      state.networkAnalytics.networkValue = action.payload;
    },
    
    // Deals
    setDeals: (state, action: PayloadAction<Deal[]>) => {
      state.deals = action.payload;
      
      // Update pipeline
      state.dealPipeline = {
        negotiating: action.payload.filter(d => d.status === 'NEGOTIATING').length,
        pending: action.payload.filter(d => d.status === 'PENDING').length,
        completed: action.payload.filter(d => d.status === 'COMPLETED').length,
        totalValue: action.payload
          .filter(d => d.status === 'COMPLETED' && d.value)
          .reduce((sum, d) => sum + (d.value || 0), 0),
      };
    },
    addDeal: (state, action: PayloadAction<Deal>) => {
      state.deals.unshift(action.payload);
      
      // Update pipeline counters
      if (action.payload.status === 'NEGOTIATING') {
        state.dealPipeline.negotiating += 1;
      } else if (action.payload.status === 'PENDING') {
        state.dealPipeline.pending += 1;
      } else if (action.payload.status === 'COMPLETED') {
        state.dealPipeline.completed += 1;
        state.dealPipeline.totalValue += action.payload.value || 0;
      }
    },
    updateDeal: (state, action: PayloadAction<Deal>) => {
      const index = state.deals.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        const oldDeal = state.deals[index];
        state.deals[index] = action.payload;
        
        // Update pipeline if status changed
        if (oldDeal.status !== action.payload.status) {
          // Decrement old status
          if (oldDeal.status === 'NEGOTIATING') state.dealPipeline.negotiating -= 1;
          else if (oldDeal.status === 'PENDING') state.dealPipeline.pending -= 1;
          else if (oldDeal.status === 'COMPLETED') {
            state.dealPipeline.completed -= 1;
            state.dealPipeline.totalValue -= oldDeal.value || 0;
          }
          
          // Increment new status
          if (action.payload.status === 'NEGOTIATING') state.dealPipeline.negotiating += 1;
          else if (action.payload.status === 'PENDING') state.dealPipeline.pending += 1;
          else if (action.payload.status === 'COMPLETED') {
            state.dealPipeline.completed += 1;
            state.dealPipeline.totalValue += action.payload.value || 0;
          }
        }
      }
    },
    
    // Smart Matching
    setSmartMatches: (state, action: PayloadAction<any[]>) => {
      state.smartMatches = action.payload;
    },
    setMatchingPreferences: (state, action: PayloadAction<Partial<PremiumState['matchingPreferences']>>) => {
      state.matchingPreferences = { ...state.matchingPreferences, ...action.payload };
    },
    
    // Subscription
    setCurrentSubscription: (state, action: PayloadAction<PremiumState['currentSubscription']>) => {
      state.currentSubscription = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    reset: () => initialState,
  },
});

export const {
  setLoading,
  setError,
  setActiveTab,
  setInsights,
  addInsight,
  markInsightAsRead,
  setMarketTrends,
  setMarketData,
  setNetworkAnalytics,
  updateNetworkValue,
  setDeals,
  addDeal,
  updateDeal,
  setSmartMatches,
  setMatchingPreferences,
  setCurrentSubscription,
  clearError,
  reset,
} = premiumSlice.actions;

export default premiumSlice.reducer;
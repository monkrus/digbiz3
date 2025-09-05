import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AnalyticsMetric {
  name: string;
  value: number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  period: string;
}

interface RevenueData {
  totalRevenue: number;
  dealsCompleted: number;
  averageDealSize: number;
  commissionEarned: number;
  networkGrowthImpact: string;
  roi: string;
  monthlyBreakdown: {
    month: string;
    revenue: number;
    deals: number;
  }[];
}

interface NetworkInsight {
  id: string;
  type: 'growth' | 'opportunity' | 'warning' | 'achievement';
  title: string;
  description: string;
  value?: number;
  recommendation?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface AnalyticsState {
  // Core Metrics
  networkMetrics: {
    totalConnections: number;
    activeConnections: number;
    connectionGrowth: string;
    networkValue: number;
    networkValueGrowth: string;
    averageConnectionValue: number;
  };
  
  // Engagement Metrics
  engagementMetrics: {
    profileViews: number;
    messagesSent: number;
    messagesReceived: number;
    meetingsScheduled: number;
    responseRate: string;
    averageResponseTime: string;
  };
  
  // Revenue Analytics
  revenueData: RevenueData;
  
  // Performance Metrics
  performanceMetrics: AnalyticsMetric[];
  
  // Network Insights
  networkInsights: NetworkInsight[];
  unreadInsights: number;
  
  // Industry Comparisons
  industryBenchmarks: {
    averageNetworkSize: number;
    averageRevenue: number;
    topPerformerMetrics: any;
    userRanking: {
      position: number;
      percentile: number;
      total: number;
    };
  };
  
  // Time-based Analytics
  timeSeriesData: {
    networkGrowth: { date: string; value: number }[];
    revenueGrowth: { date: string; value: number }[];
    engagementTrend: { date: string; value: number }[];
  };
  
  // Goals and Targets
  goals: {
    monthlyConnections: { target: number; current: number };
    monthlyRevenue: { target: number; current: number };
    networkValue: { target: number; current: number };
  };
  
  // Analytics Settings
  settings: {
    dateRange: '7d' | '30d' | '90d' | '1y';
    comparisonPeriod: 'previous_period' | 'same_period_last_year';
    showBenchmarks: boolean;
    notifications: boolean;
  };
  
  // State
  isLoading: boolean;
  error: string | null;
  lastUpdated?: string;
}

const initialState: AnalyticsState = {
  networkMetrics: {
    totalConnections: 0,
    activeConnections: 0,
    connectionGrowth: '0%',
    networkValue: 0,
    networkValueGrowth: '0%',
    averageConnectionValue: 0,
  },
  
  engagementMetrics: {
    profileViews: 0,
    messagesSent: 0,
    messagesReceived: 0,
    meetingsScheduled: 0,
    responseRate: '0%',
    averageResponseTime: '0h',
  },
  
  revenueData: {
    totalRevenue: 0,
    dealsCompleted: 0,
    averageDealSize: 0,
    commissionEarned: 0,
    networkGrowthImpact: '0%',
    roi: '0%',
    monthlyBreakdown: [],
  },
  
  performanceMetrics: [],
  networkInsights: [],
  unreadInsights: 0,
  
  industryBenchmarks: {
    averageNetworkSize: 0,
    averageRevenue: 0,
    topPerformerMetrics: {},
    userRanking: {
      position: 0,
      percentile: 0,
      total: 0,
    },
  },
  
  timeSeriesData: {
    networkGrowth: [],
    revenueGrowth: [],
    engagementTrend: [],
  },
  
  goals: {
    monthlyConnections: { target: 10, current: 0 },
    monthlyRevenue: { target: 5000, current: 0 },
    networkValue: { target: 50000, current: 0 },
  },
  
  settings: {
    dateRange: '30d',
    comparisonPeriod: 'previous_period',
    showBenchmarks: true,
    notifications: true,
  },
  
  isLoading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Network Metrics
    setNetworkMetrics: (state, action: PayloadAction<AnalyticsState['networkMetrics']>) => {
      state.networkMetrics = { ...state.networkMetrics, ...action.payload };
    },
    updateNetworkMetric: (state, action: PayloadAction<{ key: keyof AnalyticsState['networkMetrics']; value: any }>) => {
      state.networkMetrics[action.payload.key] = action.payload.value;
    },
    
    // Engagement Metrics
    setEngagementMetrics: (state, action: PayloadAction<AnalyticsState['engagementMetrics']>) => {
      state.engagementMetrics = { ...state.engagementMetrics, ...action.payload };
    },
    incrementEngagementMetric: (state, action: PayloadAction<keyof AnalyticsState['engagementMetrics']>) => {
      const metric = state.engagementMetrics[action.payload];
      if (typeof metric === 'number') {
        state.engagementMetrics[action.payload] = metric + 1;
      }
    },
    
    // Revenue Data
    setRevenueData: (state, action: PayloadAction<AnalyticsState['revenueData']>) => {
      state.revenueData = { ...state.revenueData, ...action.payload };
    },
    addRevenueEntry: (state, action: PayloadAction<{ month: string; revenue: number; deals: number }>) => {
      const existingIndex = state.revenueData.monthlyBreakdown.findIndex(
        entry => entry.month === action.payload.month
      );
      
      if (existingIndex !== -1) {
        state.revenueData.monthlyBreakdown[existingIndex] = action.payload;
      } else {
        state.revenueData.monthlyBreakdown.push(action.payload);
        // Sort by month
        state.revenueData.monthlyBreakdown.sort((a, b) => 
          new Date(a.month).getTime() - new Date(b.month).getTime()
        );
      }
    },
    
    // Performance Metrics
    setPerformanceMetrics: (state, action: PayloadAction<AnalyticsMetric[]>) => {
      state.performanceMetrics = action.payload;
    },
    updatePerformanceMetric: (state, action: PayloadAction<AnalyticsMetric>) => {
      const index = state.performanceMetrics.findIndex(m => m.name === action.payload.name);
      if (index !== -1) {
        state.performanceMetrics[index] = action.payload;
      } else {
        state.performanceMetrics.push(action.payload);
      }
    },
    
    // Network Insights
    setNetworkInsights: (state, action: PayloadAction<NetworkInsight[]>) => {
      state.networkInsights = action.payload;
      state.unreadInsights = action.payload.length;
    },
    addNetworkInsight: (state, action: PayloadAction<NetworkInsight>) => {
      state.networkInsights.unshift(action.payload);
      state.unreadInsights += 1;
    },
    markInsightAsRead: (state, action: PayloadAction<string>) => {
      const insight = state.networkInsights.find(i => i.id === action.payload);
      if (insight) {
        state.unreadInsights = Math.max(0, state.unreadInsights - 1);
      }
    },
    clearInsights: (state) => {
      state.networkInsights = [];
      state.unreadInsights = 0;
    },
    
    // Industry Benchmarks
    setIndustryBenchmarks: (state, action: PayloadAction<AnalyticsState['industryBenchmarks']>) => {
      state.industryBenchmarks = { ...state.industryBenchmarks, ...action.payload };
    },
    updateUserRanking: (state, action: PayloadAction<AnalyticsState['industryBenchmarks']['userRanking']>) => {
      state.industryBenchmarks.userRanking = action.payload;
    },
    
    // Time Series Data
    setTimeSeriesData: (state, action: PayloadAction<Partial<AnalyticsState['timeSeriesData']>>) => {
      state.timeSeriesData = { ...state.timeSeriesData, ...action.payload };
    },
    addDataPoint: (state, action: PayloadAction<{ 
      series: keyof AnalyticsState['timeSeriesData']; 
      dataPoint: { date: string; value: number } 
    }>) => {
      const series = state.timeSeriesData[action.payload.series];
      const existingIndex = series.findIndex(point => point.date === action.payload.dataPoint.date);
      
      if (existingIndex !== -1) {
        series[existingIndex] = action.payload.dataPoint;
      } else {
        series.push(action.payload.dataPoint);
        // Sort by date
        series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
    },
    
    // Goals
    setGoals: (state, action: PayloadAction<Partial<AnalyticsState['goals']>>) => {
      state.goals = { ...state.goals, ...action.payload };
    },
    updateGoalProgress: (state, action: PayloadAction<{ 
      goal: keyof AnalyticsState['goals']; 
      current: number 
    }>) => {
      state.goals[action.payload.goal].current = action.payload.current;
    },
    setGoalTarget: (state, action: PayloadAction<{ 
      goal: keyof AnalyticsState['goals']; 
      target: number 
    }>) => {
      state.goals[action.payload.goal].target = action.payload.target;
    },
    
    // Settings
    updateSettings: (state, action: PayloadAction<Partial<AnalyticsState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setDateRange: (state, action: PayloadAction<AnalyticsState['settings']['dateRange']>) => {
      state.settings.dateRange = action.payload;
    },
    
    // General
    setLastUpdated: (state, action: PayloadAction<string>) => {
      state.lastUpdated = action.payload;
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
  setNetworkMetrics,
  updateNetworkMetric,
  setEngagementMetrics,
  incrementEngagementMetric,
  setRevenueData,
  addRevenueEntry,
  setPerformanceMetrics,
  updatePerformanceMetric,
  setNetworkInsights,
  addNetworkInsight,
  markInsightAsRead,
  clearInsights,
  setIndustryBenchmarks,
  updateUserRanking,
  setTimeSeriesData,
  addDataPoint,
  setGoals,
  updateGoalProgress,
  setGoalTarget,
  updateSettings,
  setDateRange,
  setLastUpdated,
  clearError,
  reset,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;
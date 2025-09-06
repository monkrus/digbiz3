import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import React from 'react';

// Mock API Service
export const mockApiService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  setAuthToken: jest.fn(),
  clearAuthToken: jest.fn()
};

// Mock Redux Store
const mockAuthSlice = {
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    token: null
  },
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
    }
  }
};

const mockDealsSlice = {
  name: 'deals',
  initialState: {
    items: [],
    loading: false,
    creating: false,
    analyzing: false,
    error: null,
    currentAnalysis: null
  },
  reducers: {
    fetchDealsStart: (state) => {
      state.loading = true;
    },
    fetchDealsSuccess: (state, action) => {
      state.loading = false;
      state.items = action.payload;
    },
    fetchDealsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    createDealStart: (state) => {
      state.creating = true;
    },
    createDealSuccess: (state, action) => {
      state.creating = false;
      state.items.push(action.payload);
    },
    createDealFailure: (state, action) => {
      state.creating = false;
      state.error = action.payload;
    },
    analyzeDealStart: (state) => {
      state.analyzing = true;
    },
    analyzeDealSuccess: (state, action) => {
      state.analyzing = false;
      state.currentAnalysis = action.payload;
    },
    analyzeDealFailure: (state, action) => {
      state.analyzing = false;
      state.error = action.payload;
    }
  }
};

const mockConnectionsSlice = {
  name: 'connections',
  initialState: {
    items: [],
    loading: false,
    error: null,
    pendingRequests: [],
    networkAnalytics: null
  },
  reducers: {
    fetchConnectionsStart: (state) => {
      state.loading = true;
    },
    fetchConnectionsSuccess: (state, action) => {
      state.loading = false;
      state.items = action.payload;
    },
    fetchConnectionsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    sendConnectionRequest: (state, action) => {
      state.pendingRequests.push(action.payload);
    },
    acceptConnection: (state, action) => {
      state.items.push(action.payload);
      state.pendingRequests = state.pendingRequests.filter(
        req => req.id !== action.payload.id
      );
    }
  }
};

const mockArSlice = {
  name: 'ar',
  initialState: {
    businessCards: [],
    currentCard: null,
    scannerActive: false,
    meetingRooms: [],
    currentRoom: null,
    loading: false,
    error: null
  },
  reducers: {
    startScanner: (state) => {
      state.scannerActive = true;
    },
    stopScanner: (state) => {
      state.scannerActive = false;
    },
    setCurrentCard: (state, action) => {
      state.currentCard = action.payload;
    },
    addBusinessCard: (state, action) => {
      state.businessCards.push(action.payload);
    }
  }
};

export const createMockStore = (initialState = {}) => {
  const store = configureStore({
    reducer: {
      auth: mockAuthSlice.reducers,
      deals: mockDealsSlice.reducers,
      connections: mockConnectionsSlice.reducers,
      ar: mockArSlice.reducers
    },
    preloadedState: {
      auth: { ...mockAuthSlice.initialState, ...initialState.auth },
      deals: { ...mockDealsSlice.initialState, ...initialState.deals },
      connections: { ...mockConnectionsSlice.initialState, ...initialState.connections },
      ar: { ...mockArSlice.initialState, ...initialState.ar }
    }
  });

  return store;
};

// Test Data Factories for Mobile
export const TestDataFactory = {
  createUser: (overrides = {}) => ({
    id: `user_${Date.now()}`,
    email: 'test@example.com',
    name: 'Test User',
    title: 'Software Engineer',
    company: 'Test Corp',
    industry: 'technology',
    subscriptionTier: 'FREE',
    isVerified: false,
    reputation: 50,
    tokens: 10,
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Test user bio',
    ...overrides
  }),

  createDeal: (overrides = {}) => ({
    id: `deal_${Date.now()}`,
    title: 'Test Deal',
    description: 'A test deal for validation',
    value: 50000,
    currency: 'USD',
    status: 'negotiating',
    partnerId: 'partner_123',
    partnerName: 'Partner Company',
    aiScore: 0.75,
    successProbability: 0.82,
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  createConnection: (overrides = {}) => ({
    id: `conn_${Date.now()}`,
    userId: 'user_123',
    connectedUserId: 'connected_user_456',
    status: 'ACCEPTED',
    strength: 0.8,
    connectedAt: new Date().toISOString(),
    user: {
      id: 'connected_user_456',
      name: 'Connected User',
      title: 'Product Manager',
      company: 'Connected Corp',
      avatar: 'https://example.com/connected-avatar.jpg'
    },
    ...overrides
  }),

  createBusinessCard: (overrides = {}) => ({
    id: `card_${Date.now()}`,
    userId: 'user_123',
    name: 'John Doe',
    title: 'Senior Developer',
    company: 'Tech Solutions',
    email: 'john@techsolutions.com',
    phone: '+1-555-0123',
    website: 'https://johndoe.dev',
    linkedin: 'https://linkedin.com/in/johndoe',
    industry: 'technology',
    bio: 'Experienced developer passionate about innovation',
    nftTokenId: 'nft_789',
    isVerified: true,
    qrCode: 'digbiz3://card/john_doe_123',
    ...overrides
  }),

  createARMeetingRoom: (overrides = {}) => ({
    id: `room_${Date.now()}`,
    name: 'Tech Innovation Hub',
    theme: 'futuristic',
    capacity: 10,
    ownerId: 'user_123',
    participants: [],
    features: ['holographic_displays', 'spatial_audio', '3d_whiteboards'],
    isActive: true,
    accessUrl: 'digbiz3://ar/room/tech_hub_123',
    qrCode: 'room_qr_code_data',
    ...overrides
  }),

  createNetworkAnalytics: (overrides = {}) => ({
    userId: 'user_123',
    networkValue: 125000,
    totalConnections: 45,
    growthRate: 0.15,
    influenceScore: 0.72,
    industryRank: 'Top 25%',
    connectionQuality: 0.68,
    revenueAttribution: 75000,
    monthlyBreakdown: [
      { month: 'Jan', value: 10000 },
      { month: 'Feb', value: 15000 },
      { month: 'Mar', value: 12000 }
    ],
    ...overrides
  }),

  createAIPrediction: (overrides = {}) => ({
    success_probability: 0.78,
    confidence: 0.91,
    key_factors: [
      { factor: 'Industry Compatibility', importance: 0.9, current_value: 0.85, impact: 'positive' },
      { factor: 'Network Overlap', importance: 0.7, current_value: 0.6, impact: 'positive' },
      { factor: 'Experience Gap', importance: 0.6, current_value: 0.3, impact: 'negative' }
    ],
    recommendations: [
      'Prepare industry-specific talking points',
      'Mention mutual connections',
      'Focus on complementary expertise'
    ],
    risk_level: 'Low',
    recommended_action: 'Proceed with meeting setup',
    ...overrides
  }),

  createMarketIntelligence: (overrides = {}) => ({
    trends: [
      { topic: 'AI Integration', score: 0.92, trend: 'rising' },
      { topic: 'Remote Work', score: 0.78, trend: 'stable' },
      { topic: 'Cybersecurity', score: 0.65, trend: 'falling' }
    ],
    opportunities: [
      { title: 'AI Consulting Services', score: 0.88, category: 'service' },
      { title: 'Cloud Migration', score: 0.75, category: 'project' }
    ],
    market_indicators: {
      overall_sentiment: 'positive',
      volatility: 'medium',
      key_drivers: ['AI adoption', 'digital transformation']
    },
    generated_at: new Date().toISOString(),
    ...overrides
  })
};

// Component Test Helpers
export const ComponentTestHelpers = {
  // Wrapper component for providing Redux store
  createWrapper: (store = createMockStore()) => {
    return ({ children }) => React.createElement(Provider, { store }, children);
  },

  // Mock navigation
  createMockNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => false),
    getId: jest.fn(() => 'test-id'),
    getParent: jest.fn(),
    getState: jest.fn(() => ({}))
  }),

  // Mock route
  createMockRoute: (params = {}) => ({
    key: 'test-route',
    name: 'TestScreen',
    params
  }),

  // Animation test helpers
  mockAnimations: () => {
    const mockValue = {
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      interpolate: jest.fn(() => ({
        interpolate: jest.fn(() => '0deg')
      }))
    };

    require('react-native').Animated.Value.mockImplementation(() => mockValue);
    require('react-native').Animated.timing.mockImplementation(() => ({
      start: jest.fn((callback) => callback && callback())
    }));
    require('react-native').Animated.spring.mockImplementation(() => ({
      start: jest.fn((callback) => callback && callback())
    }));

    return mockValue;
  },

  // Gesture test helpers
  createMockGesture: (gestureState = {}) => ({
    dx: 0,
    dy: 0,
    vx: 0,
    vy: 0,
    numberActiveTouches: 1,
    ...gestureState
  }),

  // Permission test helpers
  mockPermissions: (granted = true) => {
    const mockPermissions = {
      request: jest.fn().mockResolvedValue(granted ? 'granted' : 'denied'),
      check: jest.fn().mockResolvedValue(granted ? 'granted' : 'denied'),
      requestMultiple: jest.fn().mockResolvedValue({
        'android.permission.CAMERA': granted ? 'granted' : 'denied',
        'android.permission.RECORD_AUDIO': granted ? 'granted' : 'denied'
      })
    };

    return mockPermissions;
  }
};

// Validation Helpers
export const ValidationHelpers = {
  validateUserObject: (user) => {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('subscriptionTier');
    expect(['FREE', 'PROFESSIONAL', 'ENTERPRISE']).toContain(user.subscriptionTier);
  },

  validateDealObject: (deal) => {
    expect(deal).toHaveProperty('id');
    expect(deal).toHaveProperty('title');
    expect(deal).toHaveProperty('value');
    expect(deal).toHaveProperty('status');
    expect(['DRAFT', 'NEGOTIATING', 'PENDING', 'COMPLETED', 'CANCELLED']).toContain(deal.status);
    expect(typeof deal.value).toBe('number');
    expect(deal.value).toBeGreaterThan(0);
  },

  validateConnectionObject: (connection) => {
    expect(connection).toHaveProperty('id');
    expect(connection).toHaveProperty('status');
    expect(['PENDING', 'ACCEPTED', 'DECLINED']).toContain(connection.status);
    expect(connection).toHaveProperty('user');
    expect(connection.user).toHaveProperty('name');
  },

  validateAIPrediction: (prediction) => {
    expect(prediction).toHaveProperty('success_probability');
    expect(prediction).toHaveProperty('confidence');
    expect(prediction).toHaveProperty('key_factors');
    expect(prediction).toHaveProperty('recommendations');
    
    expect(typeof prediction.success_probability).toBe('number');
    expect(prediction.success_probability).toBeGreaterThanOrEqual(0);
    expect(prediction.success_probability).toBeLessThanOrEqual(1);
    
    expect(Array.isArray(prediction.key_factors)).toBe(true);
    expect(Array.isArray(prediction.recommendations)).toBe(true);
  },

  validateBusinessCard: (card) => {
    expect(card).toHaveProperty('name');
    expect(card).toHaveProperty('title');
    expect(card).toHaveProperty('company');
    expect(card).toHaveProperty('email');
    expect(card.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  },

  validateNetworkAnalytics: (analytics) => {
    expect(analytics).toHaveProperty('networkValue');
    expect(analytics).toHaveProperty('totalConnections');
    expect(analytics).toHaveProperty('growthRate');
    
    expect(typeof analytics.networkValue).toBe('number');
    expect(typeof analytics.totalConnections).toBe('number');
    expect(typeof analytics.growthRate).toBe('number');
  }
};

// Performance Test Helpers
export const PerformanceHelpers = {
  measureRenderTime: (renderFunction) => {
    const startTime = performance.now();
    const result = renderFunction();
    const endTime = performance.now();
    return {
      result,
      renderTime: endTime - startTime
    };
  },

  measureAsyncOperation: async (operation) => {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    return {
      result,
      executionTime: endTime - startTime
    };
  },

  createLoadTestData: (count = 100) => {
    return Array.from({ length: count }, (_, index) => ({
      id: `item_${index}`,
      title: `Test Item ${index}`,
      description: `Description for test item ${index}`,
      value: Math.random() * 100000
    }));
  }
};

// Error Test Helpers
export const ErrorTestHelpers = {
  createNetworkError: () => new Error('Network request failed'),
  
  createValidationError: (field) => new Error(`Validation failed for field: ${field}`),
  
  createAuthError: () => new Error('Authentication required'),
  
  createPermissionError: () => new Error('Permission denied'),

  mockRejectedPromise: (error) => Promise.reject(error),

  mockResolvedPromise: (data, delay = 0) => 
    new Promise(resolve => setTimeout(() => resolve(data), delay))
};

// Accessibility Test Helpers
export const AccessibilityHelpers = {
  findByAccessibilityLabel: (component, label) => {
    return component.findByProps({ accessibilityLabel: label });
  },

  findByAccessibilityRole: (component, role) => {
    return component.findByProps({ accessibilityRole: role });
  },

  findByTestID: (component, testID) => {
    return component.findByProps({ testID });
  },

  validateAccessibilityProps: (element) => {
    const props = element.props;
    
    // Check for accessibility label or hint
    expect(
      props.accessibilityLabel || 
      props.accessibilityHint || 
      props.accessible !== false
    ).toBeTruthy();

    // Check for proper accessibility role if applicable
    if (props.onPress) {
      expect(props.accessibilityRole).toBeDefined();
    }
  }
};

// Integration Test Helpers
export const IntegrationHelpers = {
  simulateUserJourney: async (steps, component, store) => {
    const results = [];
    
    for (const step of steps) {
      const stepResult = await step(component, store);
      results.push(stepResult);
    }
    
    return results;
  },

  mockCompleteUserFlow: () => ({
    registration: {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      name: 'New User'
    },
    subscription: {
      tier: 'PROFESSIONAL',
      paymentMethod: 'pm_card_visa'
    },
    dealCreation: {
      title: 'Enterprise Integration',
      value: 150000,
      description: 'Large scale system integration'
    },
    networking: {
      connections: ['user_456', 'user_789'],
      messages: ['Hello', 'Interested in collaboration']
    }
  }),

  validateStoreState: (store, expectedState) => {
    const currentState = store.getState();
    
    Object.keys(expectedState).forEach(key => {
      expect(currentState[key]).toMatchObject(expectedState[key]);
    });
  }
};

export default {
  mockApiService,
  createMockStore,
  TestDataFactory,
  ComponentTestHelpers,
  ValidationHelpers,
  PerformanceHelpers,
  ErrorTestHelpers,
  AccessibilityHelpers,
  IntegrationHelpers
};
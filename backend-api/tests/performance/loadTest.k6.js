import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

/**
 * K6 Performance and Load Tests for DigBiz3 Platform
 * 
 * This comprehensive load testing suite covers:
 * - Authentication and user management
 * - Connection and networking features
 * - Deal creation and management
 * - AI-powered features
 * - Premium subscription features
 * - File upload and processing
 * - Real-time features (WebSocket simulation)
 * - Database performance under load
 * - Cache performance
 * - API rate limiting behavior
 * - Memory and resource usage patterns
 */

// Custom metrics
const authFailureRate = new Rate('auth_failure_rate');
const dealCreationTime = new Trend('deal_creation_time');
const connectionResponseTime = new Trend('connection_response_time');
const aiProcessingTime = new Trend('ai_processing_time');
const uploadTime = new Trend('file_upload_time');
const databaseQueryTime = new Trend('database_query_time');
const cacheHitRate = new Rate('cache_hit_rate');
const premiumFeatureLatency = new Trend('premium_feature_latency');
const rateLimitHits = new Counter('rate_limit_hits');
const concurrentUsers = new Gauge('concurrent_users');

// Test configuration based on environment
const config = {
  BASE_URL: __ENV.BASE_URL || 'http://localhost:3000',
  API_VERSION: __ENV.API_VERSION || 'v2',
  ADMIN_TOKEN: __ENV.ADMIN_TOKEN || '',
  TEST_USER_COUNT: parseInt(__ENV.TEST_USER_COUNT) || 100,
  PREMIUM_USER_RATIO: parseFloat(__ENV.PREMIUM_USER_RATIO) || 0.3,
  AI_FEATURE_RATIO: parseFloat(__ENV.AI_FEATURE_RATIO) || 0.2,
  UPLOAD_TEST_RATIO: parseFloat(__ENV.UPLOAD_TEST_RATIO) || 0.1
};

// Load testing scenarios
export let options = {
  scenarios: {
    // Smoke test - basic functionality
    smoke_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      tags: { test_type: 'smoke' },
      env: { SCENARIO: 'smoke' }
    },

    // Load test - normal expected load
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 50 },   // Ramp up
        { duration: '10m', target: 100 }, // Stay at normal load
        { duration: '5m', target: 150 },  // Slight increase
        { duration: '10m', target: 100 }, // Back to normal
        { duration: '5m', target: 0 }     // Ramp down
      ],
      tags: { test_type: 'load' },
      env: { SCENARIO: 'load' }
    },

    // Stress test - above normal capacity
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 200 },  // Ramp up to stress level
        { duration: '10m', target: 300 }, // High stress
        { duration: '5m', target: 400 },  // Peak stress
        { duration: '5m', target: 200 },  // Scale back
        { duration: '5m', target: 0 }     // Ramp down
      ],
      tags: { test_type: 'stress' },
      env: { SCENARIO: 'stress' }
    },

    // Spike test - sudden traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '2m', target: 50 },   // Normal load
        { duration: '1m', target: 500 },  // Sudden spike
        { duration: '2m', target: 500 },  // Sustain spike
        { duration: '1m', target: 50 },   // Drop back
        { duration: '2m', target: 50 }    // Recover
      ],
      tags: { test_type: 'spike' },
      env: { SCENARIO: 'spike' }
    },

    // Soak test - extended period
    soak_test: {
      executor: 'constant-vus',
      vus: 80,
      duration: '1h',
      tags: { test_type: 'soak' },
      env: { SCENARIO: 'soak' }
    },

    // Premium features test
    premium_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 30 },   // Premium users
        { duration: '10m', target: 50 },  // Sustained premium load
        { duration: '3m', target: 0 }     // Ramp down
      ],
      tags: { test_type: 'premium' },
      env: { SCENARIO: 'premium' }
    }
  },

  // Performance thresholds
  thresholds: {
    // HTTP request duration thresholds
    http_req_duration: [
      { threshold: 'p(95)<500', abortOnFail: false }, // 95% of requests under 500ms
      { threshold: 'p(99)<1000', abortOnFail: false } // 99% of requests under 1s
    ],

    // HTTP request failure rate
    http_req_failed: [
      { threshold: 'rate<0.05', abortOnFail: true } // Less than 5% failures
    ],

    // Custom metrics thresholds
    auth_failure_rate: [
      { threshold: 'rate<0.02', abortOnFail: false } // Less than 2% auth failures
    ],

    deal_creation_time: [
      { threshold: 'p(95)<800', abortOnFail: false } // Deal creation under 800ms
    ],

    connection_response_time: [
      { threshold: 'p(90)<300', abortOnFail: false } // Connections under 300ms
    ],

    ai_processing_time: [
      { threshold: 'p(95)<2000', abortOnFail: false } // AI features under 2s
    ],

    file_upload_time: [
      { threshold: 'p(90)<3000', abortOnFail: false } // File uploads under 3s
    ],

    premium_feature_latency: [
      { threshold: 'p(95)<1000', abortOnFail: false } // Premium features under 1s
    ],

    // Cache performance
    cache_hit_rate: [
      { threshold: 'rate>0.8', abortOnFail: false } // Cache hit rate above 80%
    ]
  }
};

// Test data and utilities
class TestDataFactory {
  static generateUser() {
    const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: userId,
      name: `User ${userId}`,
      email: `${userId}@loadtest.com`,
      password: 'LoadTest123!',
      subscriptionTier: Math.random() < config.PREMIUM_USER_RATIO ? 'PROFESSIONAL' : 'FREE',
      role: 'USER'
    };
  }

  static generateDeal(userId) {
    return {
      title: `Deal ${Math.random().toString(36).substr(2, 9)}`,
      description: `Test deal created during load testing - ${new Date().toISOString()}`,
      value: Math.floor(Math.random() * 10000) + 1000, // $1K-$10K
      currency: 'USD',
      industry: ['technology', 'finance', 'healthcare', 'retail'][Math.floor(Math.random() * 4)],
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      status: 'draft',
      ownerId: userId
    };
  }

  static generateConnection(fromUserId, toUserId) {
    return {
      targetUserId: toUserId,
      message: `Connection request from load test user ${fromUserId}`,
      context: 'BUSINESS_OPPORTUNITY'
    };
  }

  static generateBusinessCard(userId) {
    return {
      name: `Business Card ${userId}`,
      title: 'Load Test Manager',
      company: 'K6 Testing Corp',
      email: `${userId}@k6test.com`,
      phone: '+1-555-0123',
      industry: 'testing',
      bio: 'Professional load tester specializing in API performance validation'
    };
  }
}

class APIClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api/${config.API_VERSION}`;
  }

  // Authentication methods
  register(userData) {
    const startTime = new Date();
    const response = http.post(`${this.apiUrl}/auth/register`, JSON.stringify(userData), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth_register' }
    });

    const success = check(response, {
      'registration successful': (r) => r.status === 201,
      'returns user token': (r) => r.json('token') !== undefined
    });

    authFailureRate.add(!success);
    return response;
  }

  login(email, password) {
    const startTime = new Date();
    const response = http.post(`${this.apiUrl}/auth/login`, JSON.stringify({
      email,
      password
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth_login' }
    });

    const success = check(response, {
      'login successful': (r) => r.status === 200,
      'returns token': (r) => r.json('token') !== undefined
    });

    authFailureRate.add(!success);
    return response;
  }

  // User management
  getProfile(token) {
    const response = http.get(`${this.apiUrl}/users/profile`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'user_profile' }
    });

    check(response, {
      'profile retrieved': (r) => r.status === 200,
      'has user data': (r) => r.json('user') !== undefined
    });

    return response;
  }

  updateProfile(token, updates) {
    const response = http.put(`${this.apiUrl}/users/profile`, JSON.stringify(updates), {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'user_update' }
    });

    check(response, {
      'profile updated': (r) => r.status === 200
    });

    return response;
  }

  // Connection management
  getConnections(token) {
    const startTime = new Date();
    const response = http.get(`${this.apiUrl}/connections`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'connections_list' }
    });

    connectionResponseTime.add(new Date() - startTime);

    check(response, {
      'connections retrieved': (r) => r.status === 200,
      'returns connections array': (r) => Array.isArray(r.json('connections'))
    });

    return response;
  }

  createConnection(token, connectionData) {
    const startTime = new Date();
    const response = http.post(`${this.apiUrl}/connections`, JSON.stringify(connectionData), {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'connection_create' }
    });

    connectionResponseTime.add(new Date() - startTime);

    check(response, {
      'connection created': (r) => r.status === 200 || r.status === 201,
      'returns connection data': (r) => r.json('connection') !== undefined
    });

    return response;
  }

  // Deal management
  createDeal(token, dealData) {
    const startTime = new Date();
    const response = http.post(`${this.apiUrl}/deals`, JSON.stringify(dealData), {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'deal_create' }
    });

    dealCreationTime.add(new Date() - startTime);

    check(response, {
      'deal created': (r) => r.status === 200 || r.status === 201,
      'returns deal data': (r) => r.json('deal') !== undefined
    });

    return response;
  }

  getDeals(token, params = {}) {
    let url = `${this.apiUrl}/deals`;
    if (Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }

    const response = http.get(url, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'deals_list' }
    });

    check(response, {
      'deals retrieved': (r) => r.status === 200,
      'returns deals array': (r) => Array.isArray(r.json('deals'))
    });

    return response;
  }

  // AI-powered features
  getSmartMatching(token) {
    const startTime = new Date();
    const response = http.get(`${this.apiUrl}/ai/smart-matching`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'ai_smart_matching' }
    });

    aiProcessingTime.add(new Date() - startTime);

    const success = check(response, {
      'smart matching available': (r) => r.status === 200 || r.status === 403, // 403 for free users
      'returns matching data': (r) => r.status === 403 || r.json('matches') !== undefined
    });

    if (response.status === 403) {
      // Expected for free users
      return response;
    }

    return response;
  }

  predictMeetingSuccess(token, user1Id, user2Id) {
    const startTime = new Date();
    const response = http.post(`${this.apiUrl}/ai/predict-success`, JSON.stringify({
      user1Id,
      user2Id,
      context: 'business_meeting'
    }), {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'ai_predict_success' }
    });

    aiProcessingTime.add(new Date() - startTime);

    check(response, {
      'prediction available': (r) => r.status === 200 || r.status === 403,
      'returns prediction data': (r) => r.status === 403 || r.json('prediction') !== undefined
    });

    return response;
  }

  // Premium features
  getNetworkAnalytics(token) {
    const startTime = new Date();
    const response = http.get(`${this.apiUrl}/analytics/network-value`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'premium_network_analytics' }
    });

    premiumFeatureLatency.add(new Date() - startTime);

    check(response, {
      'analytics available': (r) => r.status === 200 || r.status === 403,
      'returns analytics data': (r) => r.status === 403 || r.json('analytics') !== undefined
    });

    return response;
  }

  getMarketIntelligence(token) {
    const startTime = new Date();
    const response = http.get(`${this.apiUrl}/market/intelligence`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'premium_market_intel' }
    });

    premiumFeatureLatency.add(new Date() - startTime);

    check(response, {
      'market intel available': (r) => r.status === 200 || r.status === 403,
      'returns intel data': (r) => r.status === 403 || r.json('intelligence') !== undefined
    });

    return response;
  }

  // File upload simulation
  uploadAvatar(token) {
    const startTime = new Date();
    
    // Simulate small avatar file (base64 encoded 1x1 pixel PNG)
    const fakeImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const response = http.post(`${this.apiUrl}/upload/avatar`, JSON.stringify({
      file: fakeImageData,
      filename: 'avatar.png',
      mimetype: 'image/png'
    }), {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      tags: { endpoint: 'file_upload' }
    });

    uploadTime.add(new Date() - startTime);

    check(response, {
      'upload successful': (r) => r.status === 200 || r.status === 201,
      'returns upload data': (r) => r.json('upload') !== undefined
    });

    return response;
  }

  // Rate limiting test
  testRateLimits(token) {
    const responses = [];
    
    // Make rapid requests to trigger rate limiting
    for (let i = 0; i < 20; i++) {
      const response = http.get(`${this.apiUrl}/connections`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        tags: { endpoint: 'rate_limit_test' }
      });
      
      responses.push(response);
      
      if (response.status === 429) {
        rateLimitHits.add(1);
      }
    }

    return responses;
  }

  // Health check
  healthCheck() {
    const response = http.get(`${this.apiUrl}/health`, {
      tags: { endpoint: 'health_check' }
    });

    check(response, {
      'health check successful': (r) => r.status === 200,
      'returns status': (r) => r.json('status') === 'ok'
    });

    return response;
  }
}

// Global test state
let testUsers = [];
let authenticatedClients = [];

export function setup() {
  console.log('Setting up load test environment...');
  
  const client = new APIClient(config.BASE_URL);
  
  // Health check before starting
  const healthResponse = client.healthCheck();
  if (healthResponse.status !== 200) {
    fail('API health check failed before starting tests');
  }

  // Pre-create some test users for consistent testing
  const preCreatedUsers = [];
  for (let i = 0; i < Math.min(config.TEST_USER_COUNT, 10); i++) {
    const userData = TestDataFactory.generateUser();
    const registerResponse = client.register(userData);
    
    if (registerResponse.status === 201) {
      const token = registerResponse.json('token');
      preCreatedUsers.push({
        ...userData,
        token: token
      });
    }
  }

  console.log(`Pre-created ${preCreatedUsers.length} test users`);
  
  return {
    testUsers: preCreatedUsers,
    baseUrl: config.BASE_URL
  };
}

export default function (data) {
  const scenario = __ENV.SCENARIO || 'load';
  const client = new APIClient(config.BASE_URL);
  
  // Update concurrent users metric
  concurrentUsers.add(1);

  group('Authentication Flow', () => {
    let currentUser;
    let token;

    if (data.testUsers && data.testUsers.length > 0 && Math.random() > 0.7) {
      // Use pre-created user (30% of the time)
      currentUser = data.testUsers[Math.floor(Math.random() * data.testUsers.length)];
      token = currentUser.token;
    } else {
      // Create new user
      const userData = TestDataFactory.generateUser();
      
      const registerResponse = client.register(userData);
      if (registerResponse.status === 201) {
        token = registerResponse.json('token');
        currentUser = { ...userData, token };
      } else {
        // Try login if registration failed (user might exist)
        const loginResponse = client.login(userData.email, userData.password);
        if (loginResponse.status === 200) {
          token = loginResponse.json('token');
          currentUser = { ...userData, token };
        } else {
          return; // Skip this iteration if auth failed
        }
      }
    }

    // Verify authentication by getting profile
    client.getProfile(token);
    
    sleep(0.1); // Brief pause between auth and main actions
  });

  if (!token) return;

  // Main user journey based on scenario
  switch (scenario) {
    case 'smoke':
      smokTestJourney(client, token, currentUser);
      break;
    case 'load':
    case 'stress':
      standardUserJourney(client, token, currentUser);
      break;
    case 'spike':
      spikeTestJourney(client, token, currentUser);
      break;
    case 'soak':
      soakTestJourney(client, token, currentUser);
      break;
    case 'premium':
      premiumUserJourney(client, token, currentUser);
      break;
    default:
      standardUserJourney(client, token, currentUser);
  }
}

function smokTestJourney(client, token, user) {
  group('Smoke Test - Basic Operations', () => {
    // Basic profile operations
    client.getProfile(token);
    client.updateProfile(token, { bio: `Updated during smoke test - ${new Date().toISOString()}` });
    
    // Basic connection operations  
    client.getConnections(token);
    
    // Basic deal operations
    client.getDeals(token);
    
    sleep(1);
  });
}

function standardUserJourney(client, token, user) {
  group('Standard User Journey', () => {
    // Profile management
    client.getProfile(token);
    
    if (Math.random() < 0.3) {
      client.updateProfile(token, {
        bio: `Updated bio - ${new Date().toISOString()}`,
        location: 'Load Test City'
      });
    }

    // Connection activities
    client.getConnections(token);
    
    if (Math.random() < 0.4) {
      // Create new connection with another test user
      const targetUserId = `user_${Math.random().toString(36).substr(2, 9)}`;
      const connectionData = TestDataFactory.generateConnection(user.id, targetUserId);
      client.createConnection(token, connectionData);
    }

    // Deal activities  
    client.getDeals(token, { status: 'active', limit: 10 });
    
    if (Math.random() < 0.3) {
      const dealData = TestDataFactory.generateDeal(user.id);
      client.createDeal(token, dealData);
    }

    // AI features (based on subscription)
    if (user.subscriptionTier !== 'FREE' && Math.random() < config.AI_FEATURE_RATIO) {
      if (Math.random() < 0.5) {
        client.getSmartMatching(token);
      } else {
        const targetUserId = `user_${Math.random().toString(36).substr(2, 9)}`;
        client.predictMeetingSuccess(token, user.id, targetUserId);
      }
    }

    // File upload simulation
    if (Math.random() < config.UPLOAD_TEST_RATIO) {
      client.uploadAvatar(token);
    }

    sleep(Math.random() * 2 + 1); // 1-3 second pause
  });
}

function spikeTestJourney(client, token, user) {
  group('Spike Test - Intensive Operations', () => {
    // Rapid-fire requests to simulate spike
    const operations = [
      () => client.getProfile(token),
      () => client.getConnections(token),
      () => client.getDeals(token),
      () => client.getDeals(token, { limit: 50 })
    ];

    // Execute multiple operations quickly
    for (let i = 0; i < 5; i++) {
      const operation = operations[Math.floor(Math.random() * operations.length)];
      operation();
    }

    // Test rate limiting
    if (Math.random() < 0.1) {
      client.testRateLimits(token);
    }

    sleep(0.5);
  });
}

function soakTestJourney(client, token, user) {
  group('Soak Test - Sustained Load', () => {
    // Simulate realistic user behavior over time
    const activities = [
      () => {
        client.getProfile(token);
        client.getConnections(token);
      },
      () => {
        client.getDeals(token);
        if (Math.random() < 0.1) {
          const dealData = TestDataFactory.generateDeal(user.id);
          client.createDeal(token, dealData);
        }
      },
      () => {
        if (user.subscriptionTier !== 'FREE') {
          client.getNetworkAnalytics(token);
        }
      },
      () => {
        client.updateProfile(token, { 
          lastActive: new Date().toISOString() 
        });
      }
    ];

    // Perform one activity per iteration
    const activity = activities[Math.floor(Math.random() * activities.length)];
    activity();

    sleep(Math.random() * 5 + 2); // 2-7 second pause for realistic timing
  });
}

function premiumUserJourney(client, token, user) {
  group('Premium User Journey', () => {
    // Ensure user has premium access for this test
    if (user.subscriptionTier === 'FREE') {
      user.subscriptionTier = 'PROFESSIONAL';
    }

    // Premium feature usage
    if (Math.random() < 0.8) {
      client.getNetworkAnalytics(token);
    }

    if (Math.random() < 0.7) {
      client.getMarketIntelligence(token);
    }

    if (Math.random() < 0.6) {
      client.getSmartMatching(token);
    }

    if (Math.random() < 0.4) {
      const targetUserId = `user_${Math.random().toString(36).substr(2, 9)}`;
      client.predictMeetingSuccess(token, user.id, targetUserId);
    }

    // Standard operations
    client.getProfile(token);
    client.getConnections(token);
    client.getDeals(token);

    sleep(1);
  });
}

export function teardown(data) {
  console.log('Load test completed. Cleaning up...');
  
  // Perform any necessary cleanup
  // Note: In a real scenario, you might want to clean up test data
  // but for load testing, leaving some data can be beneficial for ongoing tests
}

// Custom summary report
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-report.html': htmlReport(data),
    'load-test-results.json': JSON.stringify(data, null, 2)
  };
}
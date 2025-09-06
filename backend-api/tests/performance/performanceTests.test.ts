import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { performance } from 'perf_hooks';
import { TestHelpers } from '../utils/testHelpers';
import { TestDataFactory } from '../utils/testDataFactory';
import app from '../../src/app';

/**
 * Performance Tests for DigBiz3 Platform
 * 
 * This test suite focuses on:
 * - Response time performance
 * - Memory usage optimization
 * - Database query performance
 * - Concurrent request handling
 * - Caching effectiveness
 * - Resource utilization
 * - Scalability bottlenecks
 * - Memory leak detection
 * - CPU usage patterns
 * - I/O performance
 */

describe('Performance Tests', () => {
  let testApp: Express;
  let adminUser: any;
  let regularUser: any;
  let premiumUser: any;
  let initialMemoryUsage: NodeJS.MemoryUsage;

  beforeEach(async () => {
    testApp = app;
    initialMemoryUsage = process.memoryUsage();
    
    // Create test users for performance testing
    adminUser = await TestHelpers.createAndAuthenticateUser({
      role: 'ADMIN',
      subscriptionTier: 'ENTERPRISE'
    });
    
    premiumUser = await TestHelpers.createAndAuthenticateUser({
      role: 'USER',
      subscriptionTier: 'PROFESSIONAL'
    });
    
    regularUser = await TestHelpers.createAndAuthenticateUser({
      role: 'USER',
      subscriptionTier: 'FREE'
    });
  });

  afterEach(async () => {
    await TestHelpers.cleanupTestData();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    jest.clearAllMocks();
  });

  describe('Response Time Performance', () => {
    it('should handle authentication requests within acceptable time limits', async () => {
      const performanceResults = [];
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const userData = TestDataFactory.createUser();
        
        const startTime = performance.now();
        
        const response = await request(testApp)
          .post('/api/v2/auth/login')
          .send({
            email: regularUser.email,
            password: regularUser.password
          });

        const endTime = performance.now();
        const duration = endTime - startTime;
        
        performanceResults.push(duration);
        expect(response.status).toBe(200);
      }

      // Calculate performance metrics
      const avgResponseTime = performanceResults.reduce((sum, time) => sum + time, 0) / iterations;
      const maxResponseTime = Math.max(...performanceResults);
      const minResponseTime = Math.min(...performanceResults);
      const p95ResponseTime = performanceResults.sort((a, b) => a - b)[Math.floor(0.95 * iterations)];

      console.log(`Auth Performance Metrics:
        Average: ${avgResponseTime.toFixed(2)}ms
        P95: ${p95ResponseTime.toFixed(2)}ms
        Max: ${maxResponseTime.toFixed(2)}ms
        Min: ${minResponseTime.toFixed(2)}ms`);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(200); // Average under 200ms
      expect(p95ResponseTime).toBeLessThan(500); // 95% under 500ms
      expect(maxResponseTime).toBeLessThan(1000); // Max under 1s
    });

    it('should handle user profile requests efficiently', async () => {
      const performanceResults = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const response = await request(testApp)
          .get('/api/v2/users/profile')
          .set('Authorization', `Bearer ${regularUser.token}`);

        const endTime = performance.now();
        const duration = endTime - startTime;
        
        performanceResults.push(duration);
        expect(response.status).toBe(200);
      }

      const avgResponseTime = performanceResults.reduce((sum, time) => sum + time, 0) / iterations;
      const p95ResponseTime = performanceResults.sort((a, b) => a - b)[Math.floor(0.95 * iterations)];

      console.log(`Profile Performance: Avg ${avgResponseTime.toFixed(2)}ms, P95 ${p95ResponseTime.toFixed(2)}ms`);

      expect(avgResponseTime).toBeLessThan(100); // Average under 100ms
      expect(p95ResponseTime).toBeLessThan(200); // P95 under 200ms
    });

    it('should handle list endpoints with pagination efficiently', async () => {
      // Create test data
      const testUsers = [];
      for (let i = 0; i < 50; i++) {
        testUsers.push(await TestHelpers.createTestUser());
      }

      const testConnections = [];
      for (let i = 0; i < 20; i++) {
        testConnections.push(
          await TestHelpers.createTestConnection(
            regularUser.id, 
            testUsers[i % testUsers.length].id
          )
        );
      }

      const performanceResults = [];
      const pageSizes = [10, 25, 50, 100];

      for (const pageSize of pageSizes) {
        const startTime = performance.now();
        
        const response = await request(testApp)
          .get(`/api/v2/connections`)
          .query({ limit: pageSize, offset: 0 })
          .set('Authorization', `Bearer ${regularUser.token}`);

        const endTime = performance.now();
        const duration = endTime - startTime;
        
        performanceResults.push({ pageSize, duration });
        expect(response.status).toBe(200);
      }

      // Verify performance scales reasonably with page size
      performanceResults.forEach(result => {
        console.log(`Page size ${result.pageSize}: ${result.duration.toFixed(2)}ms`);
        expect(result.duration).toBeLessThan(300); // All page sizes under 300ms
      });

      // Performance should not increase dramatically with page size
      const smallPageTime = performanceResults[0].duration;
      const largePageTime = performanceResults[performanceResults.length - 1].duration;
      expect(largePageTime / smallPageTime).toBeLessThan(3); // Less than 3x increase
    });

    it('should handle search operations efficiently', async () => {
      // Create diverse test data for search
      const testData = [];
      const industries = ['technology', 'finance', 'healthcare', 'retail', 'consulting'];
      
      for (let i = 0; i < 100; i++) {
        const user = await TestHelpers.createTestUser({
          name: `User ${i}`,
          title: `Title ${i % 20}`,
          company: `Company ${i % 30}`,
          industry: industries[i % industries.length],
          location: `City ${i % 10}`
        });
        testData.push(user);
      }

      const searchQueries = [
        { q: 'technology' },
        { industry: 'finance' },
        { location: 'City 1' },
        { q: 'User', industry: 'healthcare' },
        { title: 'Title 5', location: 'City 2' }
      ];

      for (const query of searchQueries) {
        const startTime = performance.now();
        
        const response = await request(testApp)
          .get('/api/v2/search/users')
          .query(query)
          .set('Authorization', `Bearer ${regularUser.token}`);

        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`Search query ${JSON.stringify(query)}: ${duration.toFixed(2)}ms`);
        
        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(500); // Search under 500ms
      }
    });

    it('should handle AI features within acceptable time limits', async () => {
      const aiPerformanceTests = [
        {
          name: 'Smart Matching',
          endpoint: '/api/v2/ai/smart-matching',
          method: 'get',
          maxTime: 2000, // 2 seconds max
          user: premiumUser
        },
        {
          name: 'Success Prediction',
          endpoint: '/api/v2/ai/predict-success',
          method: 'post',
          data: { user1Id: regularUser.id, user2Id: premiumUser.id },
          maxTime: 3000, // 3 seconds max
          user: premiumUser
        },
        {
          name: 'Market Intelligence',
          endpoint: '/api/v2/market/intelligence',
          method: 'get',
          maxTime: 1500, // 1.5 seconds max
          user: premiumUser
        }
      ];

      for (const test of aiPerformanceTests) {
        const startTime = performance.now();
        
        let response;
        if (test.method === 'get') {
          response = await request(testApp)
            .get(test.endpoint)
            .set('Authorization', `Bearer ${test.user.token}`);
        } else {
          response = await request(testApp)
            .post(test.endpoint)
            .send(test.data || {})
            .set('Authorization', `Bearer ${test.user.token}`);
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`${test.name}: ${duration.toFixed(2)}ms`);
        
        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(test.maxTime);
      }
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not have memory leaks in repeated operations', async () => {
      const iterations = 200;
      const memoryMeasurements = [];

      // Measure memory before test
      const beforeMemory = process.memoryUsage();
      memoryMeasurements.push({ iteration: 0, ...beforeMemory });

      // Perform operations that could cause memory leaks
      for (let i = 1; i <= iterations; i++) {
        // Create and process requests
        const userData = TestDataFactory.createUser();
        
        await request(testApp)
          .post('/api/v2/auth/register')
          .send(userData);

        await request(testApp)
          .get('/api/v2/users/profile')
          .set('Authorization', `Bearer ${regularUser.token}`);

        // Measure memory every 50 iterations
        if (i % 50 === 0) {
          if (global.gc) global.gc(); // Force garbage collection
          const currentMemory = process.memoryUsage();
          memoryMeasurements.push({ iteration: i, ...currentMemory });
        }
      }

      // Analyze memory growth
      const initialHeapUsed = memoryMeasurements[0].heapUsed;
      const finalHeapUsed = memoryMeasurements[memoryMeasurements.length - 1].heapUsed;
      const memoryGrowth = finalHeapUsed - initialHeapUsed;
      const growthPercentage = (memoryGrowth / initialHeapUsed) * 100;

      console.log(`Memory Analysis:
        Initial heap: ${(initialHeapUsed / 1024 / 1024).toFixed(2)} MB
        Final heap: ${(finalHeapUsed / 1024 / 1024).toFixed(2)} MB
        Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB (${growthPercentage.toFixed(2)}%)`);

      // Memory growth should be reasonable (less than 50% increase)
      expect(growthPercentage).toBeLessThan(50);

      // Memory should not grow linearly with operations (indicating leak)
      const midHeapUsed = memoryMeasurements[Math.floor(memoryMeasurements.length / 2)].heapUsed;
      const midGrowth = midHeapUsed - initialHeapUsed;
      const finalGrowthFromMid = finalHeapUsed - midHeapUsed;
      
      // Final growth should not be much larger than mid growth (linear leak indicator)
      expect(finalGrowthFromMid).toBeLessThan(midGrowth * 1.5);
    });

    it('should efficiently handle large datasets', async () => {
      // Create large dataset
      const largeDataset = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push(await TestHelpers.createTestDeal(regularUser.id));
      }

      const beforeMemory = process.memoryUsage();
      
      const startTime = performance.now();
      
      // Request large dataset
      const response = await request(testApp)
        .get('/api/v2/deals')
        .query({ limit: 500, includeDetails: true })
        .set('Authorization', `Bearer ${regularUser.token}`);

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const afterMemory = process.memoryUsage();
      const memoryDifference = afterMemory.heapUsed - beforeMemory.heapUsed;

      console.log(`Large dataset query:
        Time: ${duration.toFixed(2)}ms
        Memory increase: ${(memoryDifference / 1024 / 1024).toFixed(2)} MB`);

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Under 1 second
      expect(memoryDifference / 1024 / 1024).toBeLessThan(100); // Under 100MB increase
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent authentication requests', async () => {
      const concurrentRequests = 50;
      const promises = [];

      const startTime = performance.now();

      // Launch concurrent authentication requests
      for (let i = 0; i < concurrentRequests; i++) {
        const userData = TestDataFactory.createUser({ email: `concurrent${i}@test.com` });
        
        const promise = request(testApp)
          .post('/api/v2/auth/register')
          .send(userData);
        
        promises.push(promise);
      }

      // Wait for all requests to complete
      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Analyze results
      const successfulResponses = responses.filter(r => r.status === 201);
      const failedResponses = responses.filter(r => r.status !== 201);
      const avgTimePerRequest = totalDuration / concurrentRequests;

      console.log(`Concurrent Authentication:
        Total time: ${totalDuration.toFixed(2)}ms
        Successful: ${successfulResponses.length}/${concurrentRequests}
        Failed: ${failedResponses.length}/${concurrentRequests}
        Avg per request: ${avgTimePerRequest.toFixed(2)}ms`);

      // Performance expectations
      expect(successfulResponses.length).toBeGreaterThan(concurrentRequests * 0.9); // 90% success rate
      expect(totalDuration).toBeLessThan(5000); // Total under 5 seconds
      expect(avgTimePerRequest).toBeLessThan(200); // Average under 200ms per request
    });

    it('should handle concurrent read operations efficiently', async () => {
      const concurrentRequests = 100;
      const promises = [];

      const startTime = performance.now();

      // Launch concurrent read requests
      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(testApp)
          .get('/api/v2/users/profile')
          .set('Authorization', `Bearer ${regularUser.token}`);
        
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      const successfulResponses = responses.filter(r => r.status === 200);
      const avgTimePerRequest = totalDuration / concurrentRequests;

      console.log(`Concurrent Reads:
        Total time: ${totalDuration.toFixed(2)}ms
        Successful: ${successfulResponses.length}/${concurrentRequests}
        Avg per request: ${avgTimePerRequest.toFixed(2)}ms`);

      expect(successfulResponses.length).toBe(concurrentRequests); // All should succeed
      expect(avgTimePerRequest).toBeLessThan(100); // Should be very fast due to caching
    });

    it('should handle mixed concurrent operations', async () => {
      const operations = [
        () => request(testApp).get('/api/v2/users/profile').set('Authorization', `Bearer ${regularUser.token}`),
        () => request(testApp).get('/api/v2/connections').set('Authorization', `Bearer ${regularUser.token}`),
        () => request(testApp).get('/api/v2/deals').set('Authorization', `Bearer ${regularUser.token}`),
        () => request(testApp).post('/api/v2/deals').set('Authorization', `Bearer ${regularUser.token}`)
               .send(TestDataFactory.createDeal(regularUser.id)),
        () => request(testApp).put('/api/v2/users/profile').set('Authorization', `Bearer ${regularUser.token}`)
               .send({ bio: `Updated at ${new Date().toISOString()}` })
      ];

      const concurrentRequests = 50;
      const promises = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const operation = operations[i % operations.length];
        promises.push(operation());
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      const successfulResponses = responses.filter(r => r.status >= 200 && r.status < 300);
      const errorResponses = responses.filter(r => r.status >= 400);

      console.log(`Mixed Operations:
        Total time: ${totalDuration.toFixed(2)}ms
        Successful: ${successfulResponses.length}/${concurrentRequests}
        Errors: ${errorResponses.length}/${concurrentRequests}`);

      expect(successfulResponses.length).toBeGreaterThan(concurrentRequests * 0.85); // 85% success rate
      expect(totalDuration).toBeLessThan(10000); // Under 10 seconds total
    });
  });

  describe('Database Query Performance', () => {
    it('should optimize queries with proper indexing', async () => {
      // Create test data to ensure queries have something to work with
      const testUsers = [];
      for (let i = 0; i < 100; i++) {
        testUsers.push(await TestHelpers.createTestUser({
          name: `TestUser${i}`,
          email: `testuser${i}@example.com`,
          industry: i % 2 === 0 ? 'technology' : 'finance'
        }));
      }

      // Test different query patterns
      const queryTests = [
        {
          name: 'Simple Profile Query',
          request: () => request(testApp).get('/api/v2/users/profile')
            .set('Authorization', `Bearer ${regularUser.token}`),
          maxTime: 50
        },
        {
          name: 'Filtered List Query',
          request: () => request(testApp).get('/api/v2/search/users')
            .query({ industry: 'technology' })
            .set('Authorization', `Bearer ${regularUser.token}`),
          maxTime: 200
        },
        {
          name: 'Paginated Query',
          request: () => request(testApp).get('/api/v2/connections')
            .query({ limit: 20, offset: 0 })
            .set('Authorization', `Bearer ${regularUser.token}`),
          maxTime: 150
        },
        {
          name: 'Complex Join Query',
          request: () => request(testApp).get('/api/v2/deals')
            .query({ include: 'user,participants', status: 'active' })
            .set('Authorization', `Bearer ${regularUser.token}`),
          maxTime: 300
        }
      ];

      for (const test of queryTests) {
        const iterations = 10;
        const times = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = performance.now();
          const response = await test.request();
          const endTime = performance.now();
          
          const duration = endTime - startTime;
          times.push(duration);
          
          expect(response.status).toBe(200);
        }

        const avgTime = times.reduce((sum, time) => sum + time, 0) / iterations;
        const maxTime = Math.max(...times);
        
        console.log(`${test.name}: Avg ${avgTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
        
        expect(avgTime).toBeLessThan(test.maxTime);
        expect(maxTime).toBeLessThan(test.maxTime * 2); // Max shouldn't be more than 2x avg
      }
    });

    it('should handle bulk operations efficiently', async () => {
      const bulkSize = 50;
      
      // Test bulk connection creation
      const connectionData = [];
      for (let i = 0; i < bulkSize; i++) {
        const targetUser = await TestHelpers.createTestUser();
        connectionData.push({
          targetUserId: targetUser.id,
          message: `Bulk connection ${i}`
        });
      }

      const startTime = performance.now();
      
      const response = await request(testApp)
        .post('/api/v2/connections/bulk')
        .send({ connections: connectionData })
        .set('Authorization', `Bearer ${premiumUser.token}`);

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`Bulk operation (${bulkSize} items): ${duration.toFixed(2)}ms`);
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Under 2 seconds for bulk operation
      
      // Verify time per item is reasonable
      const timePerItem = duration / bulkSize;
      expect(timePerItem).toBeLessThan(40); // Less than 40ms per item
    });
  });

  describe('Caching Performance', () => {
    it('should demonstrate effective caching for frequently accessed data', async () => {
      // First request (cache miss)
      const firstRequestStart = performance.now();
      const firstResponse = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${regularUser.token}`);
      const firstRequestTime = performance.now() - firstRequestStart;

      expect(firstResponse.status).toBe(200);

      // Subsequent requests (cache hits)
      const cachedRequestTimes = [];
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        const response = await request(testApp)
          .get('/api/v2/users/profile')
          .set('Authorization', `Bearer ${regularUser.token}`);
        const duration = performance.now() - startTime;
        
        cachedRequestTimes.push(duration);
        expect(response.status).toBe(200);
      }

      const avgCachedTime = cachedRequestTimes.reduce((sum, time) => sum + time, 0) / cachedRequestTimes.length;

      console.log(`Caching Performance:
        First request (cache miss): ${firstRequestTime.toFixed(2)}ms
        Avg cached requests: ${avgCachedTime.toFixed(2)}ms
        Cache improvement: ${((firstRequestTime - avgCachedTime) / firstRequestTime * 100).toFixed(1)}%`);

      // Cached requests should be significantly faster
      expect(avgCachedTime).toBeLessThan(firstRequestTime * 0.5); // At least 50% faster
      expect(avgCachedTime).toBeLessThan(50); // Cached requests under 50ms
    });

    it('should invalidate cache appropriately on data updates', async () => {
      // Get initial profile (populate cache)
      const initialResponse = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${regularUser.token}`);
      
      const initialBio = initialResponse.body.user.bio;

      // Update profile (should invalidate cache)
      const updateResponse = await request(testApp)
        .put('/api/v2/users/profile')
        .send({ bio: 'Updated bio for cache test' })
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(updateResponse.status).toBe(200);

      // Get profile again (should reflect update)
      const updatedResponse = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(updatedResponse.status).toBe(200);
      expect(updatedResponse.body.user.bio).toBe('Updated bio for cache test');
      expect(updatedResponse.body.user.bio).not.toBe(initialBio);
    });
  });

  describe('Resource Utilization', () => {
    it('should monitor CPU usage during intensive operations', async () => {
      const startCpuUsage = process.cpuUsage();
      
      // Perform CPU-intensive operations
      const promises = [];
      for (let i = 0; i < 20; i++) {
        // AI feature calls (computationally intensive)
        promises.push(
          request(testApp)
            .get('/api/v2/ai/smart-matching')
            .set('Authorization', `Bearer ${premiumUser.token}`)
        );
      }

      await Promise.all(promises);
      
      const cpuUsage = process.cpuUsage(startCpuUsage);
      const totalCpuTime = cpuUsage.user + cpuUsage.system;
      const cpuTimeMs = totalCpuTime / 1000; // Convert microseconds to milliseconds

      console.log(`CPU Usage:
        User CPU time: ${(cpuUsage.user / 1000).toFixed(2)}ms
        System CPU time: ${(cpuUsage.system / 1000).toFixed(2)}ms
        Total CPU time: ${cpuTimeMs.toFixed(2)}ms`);

      // CPU usage should be reasonable for the operations performed
      expect(cpuTimeMs).toBeLessThan(5000); // Less than 5 seconds of CPU time
    });

    it('should handle file upload performance', async () => {
      // Create test file data
      const testFileData = Buffer.alloc(1024 * 1024).toString('base64'); // 1MB file
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      const response = await request(testApp)
        .post('/api/v2/upload/document')
        .send({
          file: testFileData,
          filename: 'test-document.pdf',
          mimetype: 'application/pdf'
        })
        .set('Authorization', `Bearer ${premiumUser.token}`);

      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      const duration = endTime - startTime;
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      console.log(`File Upload Performance:
        Duration: ${duration.toFixed(2)}ms
        Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(3000); // Under 3 seconds
      expect(memoryIncrease / 1024 / 1024).toBeLessThan(10); // Memory increase under 10MB
    });
  });
});
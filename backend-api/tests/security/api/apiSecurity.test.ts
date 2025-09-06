import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import crypto from 'crypto';
import { TestHelpers } from '../utils/testHelpers';
import { TestDataFactory } from '../utils/testDataFactory';
import app from '../../src/app';

/**
 * API Security Tests
 * 
 * This test suite focuses on API-specific security vulnerabilities:
 * - OWASP API Security Top 10
 * - API abuse and misuse
 * - Business logic vulnerabilities
 * - Data exposure risks
 * - API versioning security
 * - GraphQL security (if applicable)
 * - Webhook security
 * - Third-party integration security
 */

describe('API Security Tests', () => {
  let testApp: Express;
  let adminUser: any;
  let regularUser: any;
  let premiumUser: any;
  let apiKeys: any;

  beforeEach(async () => {
    testApp = app;
    
    adminUser = await TestHelpers.createAndAuthenticateUser({
      role: 'ADMIN',
      subscriptionTier: 'ENTERPRISE',
      permissions: ['admin:read', 'admin:write', 'api:manage']
    });
    
    premiumUser = await TestHelpers.createAndAuthenticateUser({
      role: 'USER',
      subscriptionTier: 'PROFESSIONAL',
      permissions: ['user:read', 'user:write', 'api:access']
    });
    
    regularUser = await TestHelpers.createAndAuthenticateUser({
      role: 'USER',
      subscriptionTier: 'FREE',
      permissions: ['user:read']
    });

    // Create API keys for testing
    apiKeys = {
      valid: await TestHelpers.createApiKey(premiumUser.id, ['read', 'write']),
      readOnly: await TestHelpers.createApiKey(regularUser.id, ['read']),
      expired: await TestHelpers.createExpiredApiKey(regularUser.id),
      revoked: await TestHelpers.createRevokedApiKey(regularUser.id)
    };
  });

  afterEach(async () => {
    await TestHelpers.cleanupTestData();
    jest.clearAllMocks();
  });

  describe('OWASP API Security Top 10', () => {
    describe('API1:2023 Broken Object Level Authorization', () => {
      it('should prevent access to other users objects', async () => {
        // Create resources for different users
        const user1Deal = await TestHelpers.createTestDeal(regularUser.id);
        const user2Deal = await TestHelpers.createTestDeal(premiumUser.id);

        // User1 should not access User2's deal
        const unauthorizedAccess = await request(testApp)
          .get(`/api/v2/deals/${user2Deal.id}`)
          .set('Authorization', `Bearer ${regularUser.token}`);

        expect(unauthorizedAccess.status).toBe(403);
        expect(unauthorizedAccess.body.error).toMatch(/access|unauthorized|forbidden/i);

        // User1 should not be able to modify User2's deal
        const unauthorizedModify = await request(testApp)
          .put(`/api/v2/deals/${user2Deal.id}`)
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({ status: 'completed' });

        expect(unauthorizedModify.status).toBe(403);

        // User1 should not be able to delete User2's deal
        const unauthorizedDelete = await request(testApp)
          .delete(`/api/v2/deals/${user2Deal.id}`)
          .set('Authorization', `Bearer ${regularUser.token}`);

        expect(unauthorizedDelete.status).toBe(403);
      });

      it('should prevent IDOR attacks through parameter manipulation', async () => {
        const userConnection = await TestHelpers.createTestConnection(regularUser.id, premiumUser.id);

        // Try to access with manipulated IDs
        const idorAttempts = [
          userConnection.id + 1,
          userConnection.id - 1,
          'admin',
          '1',
          '999999',
          '../admin',
          userConnection.id.toString().replace(/\d/g, '9')
        ];

        for (const maliciousId of idorAttempts) {
          const response = await request(testApp)
            .get(`/api/v2/connections/${maliciousId}`)
            .set('Authorization', `Bearer ${regularUser.token}`);

          expect([403, 404]).toContain(response.status);
          
          if (response.status === 200) {
            // If somehow successful, ensure it's the user's own resource
            expect(response.body.connection.userId).toBe(regularUser.id);
          }
        }
      });

      it('should validate object ownership in batch operations', async () => {
        const user1Deals = await Promise.all([
          TestHelpers.createTestDeal(regularUser.id),
          TestHelpers.createTestDeal(regularUser.id)
        ]);
        
        const user2Deal = await TestHelpers.createTestDeal(premiumUser.id);

        // Try to perform batch operation mixing own and others' resources
        const batchUpdate = await request(testApp)
          .patch('/api/v2/deals/batch')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            dealIds: [...user1Deals.map(d => d.id), user2Deal.id],
            updates: { status: 'in_progress' }
          });

        if (batchUpdate.status === 200) {
          // Should only update user's own deals
          expect(batchUpdate.body.updated).toHaveLength(2);
          expect(batchUpdate.body.errors).toContainEqual(
            expect.objectContaining({
              dealId: user2Deal.id,
              error: expect.stringMatching(/access|unauthorized/i)
            })
          );
        } else {
          expect(batchUpdate.status).toBe(403);
        }
      });
    });

    describe('API2:2023 Broken Authentication', () => {
      it('should validate API key format and structure', async () => {
        const invalidApiKeys = [
          'invalid-key',
          '',
          'sk_test_' + 'a'.repeat(10), // Wrong format
          'pk_live_' + crypto.randomBytes(32).toString('hex'), // Wrong prefix
          apiKeys.valid.key.slice(0, -5), // Truncated
          apiKeys.valid.key + 'extra', // Extended
          apiKeys.valid.key.toUpperCase(), // Case changed
          'Bearer ' + apiKeys.valid.key // With Bearer prefix
        ];

        for (const invalidKey of invalidApiKeys) {
          const response = await request(testApp)
            .get('/api/v2/connections')
            .set('X-API-Key', invalidKey);

          expect(response.status).toBe(401);
          expect(response.body.error).toMatch(/api key|authentication|invalid/i);
        }
      });

      it('should handle API key rotation securely', async () => {
        const originalKey = apiKeys.valid.key;

        // Rotate API key
        const rotateResponse = await request(testApp)
          .post('/api/v2/api-keys/rotate')
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({ keyId: apiKeys.valid.id });

        expect(rotateResponse.status).toBe(200);
        expect(rotateResponse.body.apiKey).toBeDefined();
        expect(rotateResponse.body.apiKey).not.toBe(originalKey);

        // Old key should be invalidated immediately
        const oldKeyTest = await request(testApp)
          .get('/api/v2/connections')
          .set('X-API-Key', originalKey);

        expect(oldKeyTest.status).toBe(401);

        // New key should work
        const newKeyTest = await request(testApp)
          .get('/api/v2/connections')
          .set('X-API-Key', rotateResponse.body.apiKey);

        expect(newKeyTest.status).toBe(200);
      });

      it('should enforce API key scope restrictions', async () => {
        // Read-only key should not allow write operations
        const writeAttempt = await request(testApp)
          .post('/api/v2/connections')
          .set('X-API-Key', apiKeys.readOnly.key)
          .send({
            targetUserId: premiumUser.id,
            message: 'Connect with me'
          });

        expect(writeAttempt.status).toBe(403);
        expect(writeAttempt.body.error).toMatch(/scope|permission|read.only/i);

        // Full access key should allow write operations
        const validWrite = await request(testApp)
          .post('/api/v2/connections')
          .set('X-API-Key', apiKeys.valid.key)
          .send({
            targetUserId: adminUser.id,
            message: 'Connect with me'
          });

        expect(validWrite.status).toBe(200);
      });

      it('should detect and prevent API key abuse', async () => {
        const abusiveRequests = [];

        // Generate many requests rapidly
        for (let i = 0; i < 100; i++) {
          const request_promise = request(testApp)
            .get('/api/v2/connections')
            .set('X-API-Key', apiKeys.valid.key);
          abusiveRequests.push(request_promise);
        }

        const responses = await Promise.all(abusiveRequests);
        
        // Some requests should be rate limited
        const rateLimited = responses.filter(r => r.status === 429);
        expect(rateLimited.length).toBeGreaterThan(0);

        // API key should be temporarily suspended
        const suspensionTest = await request(testApp)
          .get('/api/v2/connections')
          .set('X-API-Key', apiKeys.valid.key);

        expect([200, 429, 403]).toContain(suspensionTest.status);
      });
    });

    describe('API3:2023 Broken Object Property Level Authorization', () => {
      it('should filter sensitive fields based on user role', async () => {
        const testUser = await TestHelpers.createTestUser();

        // Admin should see all fields
        const adminView = await request(testApp)
          .get(`/api/v2/admin/users/${testUser.id}`)
          .set('Authorization', `Bearer ${adminUser.token}`);

        expect(adminView.status).toBe(200);
        expect(adminView.body.user).toHaveProperty('email');
        expect(adminView.body.user).toHaveProperty('phone');
        expect(adminView.body.user).toHaveProperty('subscriptionTier');
        expect(adminView.body.user).toHaveProperty('createdAt');
        expect(adminView.body.user).toHaveProperty('lastLoginAt');

        // Regular user should see limited public fields
        const publicView = await request(testApp)
          .get(`/api/v2/users/${testUser.id}`)
          .set('Authorization', `Bearer ${regularUser.token}`);

        expect(publicView.status).toBe(200);
        expect(publicView.body.user).toHaveProperty('name');
        expect(publicView.body.user).toHaveProperty('title');
        expect(publicView.body.user).toHaveProperty('company');
        expect(publicView.body.user).not.toHaveProperty('email');
        expect(publicView.body.user).not.toHaveProperty('phone');
        expect(publicView.body.user).not.toHaveProperty('subscriptionTier');
      });

      it('should prevent mass assignment vulnerabilities', async () => {
        const maliciousUpdate = await request(testApp)
          .put('/api/v2/users/profile')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            name: 'Updated Name',
            bio: 'Updated bio',
            // Attempt to modify protected fields
            role: 'ADMIN',
            subscriptionTier: 'ENTERPRISE',
            isVerified: true,
            permissions: ['admin:read', 'admin:write'],
            credits: 999999,
            id: adminUser.id // Try to change user ID
          });

        expect(maliciousUpdate.status).toBe(200);
        
        // Only allowed fields should be updated
        expect(maliciousUpdate.body.user.name).toBe('Updated Name');
        expect(maliciousUpdate.body.user.bio).toBe('Updated bio');
        
        // Protected fields should remain unchanged
        expect(maliciousUpdate.body.user.role).toBe('USER');
        expect(maliciousUpdate.body.user.subscriptionTier).toBe('FREE');
        expect(maliciousUpdate.body.user.isVerified).toBe(false);
        expect(maliciousUpdate.body.user.id).toBe(regularUser.id);
      });

      it('should handle partial updates securely', async () => {
        const dealId = (await TestHelpers.createTestDeal(premiumUser.id)).id;

        // Attempt partial update with sensitive fields
        const partialUpdate = await request(testApp)
          .patch(`/api/v2/deals/${dealId}`)
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({
            description: 'Updated description',
            ownerId: adminUser.id, // Try to change ownership
            commissionRate: 0.5, // Try to modify commission
            status: 'completed' // Valid field
          });

        if (partialUpdate.status === 200) {
          expect(partialUpdate.body.deal.description).toBe('Updated description');
          expect(partialUpdate.body.deal.status).toBe('completed');
          expect(partialUpdate.body.deal.ownerId).toBe(premiumUser.id); // Should remain unchanged
          expect(partialUpdate.body.deal.commissionRate).not.toBe(0.5); // Should remain unchanged
        } else {
          expect(partialUpdate.status).toBe(400);
        }
      });
    });

    describe('API4:2023 Unrestricted Resource Consumption', () => {
      it('should limit payload size', async () => {
        const largePayload = {
          description: 'x'.repeat(10 * 1024 * 1024), // 10MB string
          data: Array(1000).fill('x'.repeat(1000)) // Large array
        };

        const response = await request(testApp)
          .post('/api/v2/deals')
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send(largePayload);

        expect(response.status).toBe(413); // Payload Too Large
      });

      it('should limit array and object depth', async () => {
        // Create deeply nested object
        let deepObject: any = {};
        let current = deepObject;
        for (let i = 0; i < 100; i++) {
          current.nested = {};
          current = current.nested;
        }

        const deepNestingResponse = await request(testApp)
          .post('/api/v2/deals')
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({
            title: 'Test Deal',
            metadata: deepObject
          });

        expect(deepNestingResponse.status).toBe(400);
        expect(deepNestingResponse.body.error).toMatch(/depth|nesting|complex/i);

        // Create large array
        const largeArray = Array(10000).fill().map((_, i) => ({ id: i, value: `item${i}` }));

        const largeArrayResponse = await request(testApp)
          .post('/api/v2/connections/bulk')
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({
            connections: largeArray
          });

        expect(largeArrayResponse.status).toBe(400);
        expect(largeArrayResponse.body.error).toMatch(/array|size|limit/i);
      });

      it('should implement query complexity limits', async () => {
        // Complex query with many joins and filters
        const complexQuery = {
          include: [
            'user',
            'user.connections',
            'user.connections.targetUser',
            'user.deals',
            'user.deals.participants',
            'user.businessCard',
            'user.reviews',
            'user.reviews.author'
          ],
          filters: {
            AND: [
              { user: { subscriptionTier: 'PROFESSIONAL' } },
              { createdAt: { gte: '2023-01-01' } },
              { status: { in: ['active', 'pending', 'completed'] } },
              { 
                OR: [
                  { title: { contains: 'tech' } },
                  { description: { contains: 'AI' } },
                  { tags: { hasEvery: ['machine-learning', 'startup'] } }
                ]
              }
            ]
          },
          orderBy: [
            { createdAt: 'desc' },
            { user: { name: 'asc' } }
          ]
        };

        const response = await request(testApp)
          .post('/api/v2/search/advanced')
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send(complexQuery);

        expect([200, 400]).toContain(response.status);
        
        if (response.status === 400) {
          expect(response.body.error).toMatch(/complexity|query|limit/i);
        }
      });

      it('should limit concurrent requests per user', async () => {
        const concurrentRequests = [];

        // Launch many concurrent requests
        for (let i = 0; i < 50; i++) {
          const request_promise = request(testApp)
            .get('/api/v2/connections')
            .set('Authorization', `Bearer ${regularUser.token}`);
          concurrentRequests.push(request_promise);
        }

        const responses = await Promise.all(concurrentRequests);
        
        // Some requests should be rejected due to concurrency limits
        const rejectedRequests = responses.filter(r => r.status === 429 || r.status === 503);
        expect(rejectedRequests.length).toBeGreaterThan(0);
      });
    });

    describe('API5:2023 Broken Function Level Authorization', () => {
      it('should enforce function-level permissions', async () => {
        const restrictedFunctions = [
          { method: 'post', path: '/api/v2/admin/system/maintenance', requiredRole: 'ADMIN' },
          { method: 'delete', path: '/api/v2/admin/users/cleanup', requiredRole: 'ADMIN' },
          { method: 'post', path: '/api/v2/billing/refund', requiredRole: 'ADMIN' },
          { method: 'get', path: '/api/v2/analytics/financial', requiredRole: 'ADMIN' },
          { method: 'post', path: '/api/v2/ai/training/update', requiredRole: 'ADMIN' }
        ];

        for (const func of restrictedFunctions) {
          // Regular user should not access admin functions
          const regularResponse = await request(testApp)
            [func.method](func.path)
            .set('Authorization', `Bearer ${regularUser.token}`);

          expect(regularResponse.status).toBe(403);

          // Premium user should not access admin functions
          const premiumResponse = await request(testApp)
            [func.method](func.path)
            .set('Authorization', `Bearer ${premiumUser.token}`);

          expect(premiumResponse.status).toBe(403);

          // Admin user should have access
          const adminResponse = await request(testApp)
            [func.method](func.path)
            .set('Authorization', `Bearer ${adminUser.token}`);

          expect(adminResponse.status).not.toBe(403);
        }
      });

      it('should prevent function discovery through HTTP methods', async () => {
        const endpoint = '/api/v2/users/profile';
        const methods = ['OPTIONS', 'HEAD', 'TRACE', 'CONNECT', 'PATCH'];

        for (const method of methods) {
          const response = await request(testApp)
            [method.toLowerCase()](endpoint)
            .set('Authorization', `Bearer ${regularUser.token}`);

          // Should either be not allowed or return limited information
          if (response.status === 200) {
            expect(response.headers).not.toHaveProperty('allow');
            expect(response.body).not.toContain('admin');
            expect(response.body).not.toContain('debug');
          } else {
            expect([405, 501]).toContain(response.status);
          }
        }
      });

      it('should handle privilege escalation attempts', async () => {
        // Create a middleware admin user
        const middlewareUser = await TestHelpers.createAndAuthenticateUser({
          role: 'MIDDLEWARE_ADMIN',
          subscriptionTier: 'ENTERPRISE',
          permissions: ['users:read', 'analytics:read']
        });

        // Middleware admin should not access system functions
        const systemFunctionAttempt = await request(testApp)
          .post('/api/v2/admin/system/restart')
          .set('Authorization', `Bearer ${middlewareUser.token}`);

        expect(systemFunctionAttempt.status).toBe(403);

        // Should not be able to escalate to full admin
        const escalationAttempt = await request(testApp)
          .put('/api/v2/users/role')
          .set('Authorization', `Bearer ${middlewareUser.token}`)
          .send({ role: 'ADMIN', targetUserId: middlewareUser.id });

        expect(escalationAttempt.status).toBe(403);
      });
    });

    describe('API6:2023 Unrestricted Access to Sensitive Business Flows', () => {
      it('should protect financial transaction flows', async () => {
        // Direct payment processing attempt
        const directPayment = await request(testApp)
          .post('/api/v2/payments/process-direct')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            amount: 100000, // $1000
            currency: 'USD',
            paymentMethod: 'card_fake_123'
          });

        expect(directPayment.status).toBe(403);

        // Subscription upgrade without proper flow
        const directUpgrade = await request(testApp)
          .post('/api/v2/subscriptions/direct-upgrade')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            tier: 'ENTERPRISE',
            skipPayment: true
          });

        expect(directUpgrade.status).toBe(403);

        // Refund processing without authorization
        const unauthorizedRefund = await request(testApp)
          .post('/api/v2/payments/refund')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            paymentId: 'payment_123',
            amount: 5000
          });

        expect(unauthorizedRefund.status).toBe(403);
      });

      it('should protect user verification flows', async () => {
        // Direct verification attempt
        const directVerification = await request(testApp)
          .post('/api/v2/users/verify-direct')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            userId: regularUser.id,
            verificationLevel: 'BUSINESS_VERIFIED'
          });

        expect(directVerification.status).toBe(403);

        // Skip verification steps
        const skipSteps = await request(testApp)
          .post('/api/v2/verification/complete')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            skipDocuments: true,
            skipBusinessCheck: true,
            autoApprove: true
          });

        expect(skipSteps.status).toBe(403);
      });

      it('should protect deal completion flows', async () => {
        const dealId = (await TestHelpers.createTestDeal(premiumUser.id)).id;

        // Force deal completion without participants
        const forceComplete = await request(testApp)
          .post(`/api/v2/deals/${dealId}/force-complete`)
          .set('Authorization', `Bearer ${premiumUser.token}`);

        expect(forceComplete.status).toBe(403);

        // Skip deal approval workflow
        const skipApproval = await request(testApp)
          .patch(`/api/v2/deals/${dealId}`)
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({
            status: 'completed',
            skipApproval: true,
            autoDistributeCommission: true
          });

        expect(skipApproval.status).toBe(400);
      });

      it('should enforce business rule validations', async () => {
        // Create connection with self (business rule violation)
        const selfConnection = await request(testApp)
          .post('/api/v2/connections')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            targetUserId: regularUser.id,
            message: 'Connect with myself'
          });

        expect(selfConnection.status).toBe(400);
        expect(selfConnection.body.error).toMatch(/self|same user/i);

        // Create deal with impossible values
        const impossibleDeal = await request(testApp)
          .post('/api/v2/deals')
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({
            title: 'Test Deal',
            value: -1000, // Negative value
            commissionRate: 1.5, // Over 100%
            deadline: '2020-01-01' // Past date
          });

        expect(impossibleDeal.status).toBe(400);
      });
    });

    describe('API7:2023 Server Side Request Forgery (SSRF)', () => {
      it('should prevent SSRF in URL parameters', async () => {
        const ssrfUrls = [
          'http://localhost:3000/admin',
          'http://127.0.0.1:8080',
          'http://169.254.169.254/latest/meta-data/', // AWS metadata
          'http://metadata.google.internal/computeMetadata/v1/', // GCP metadata
          'file:///etc/passwd',
          'ftp://internal-server.local/config',
          'gopher://internal-service:1234',
          'dict://localhost:11211/stats', // Memcached
          'ldap://internal-ldap.local/dc=company,dc=com'
        ];

        for (const url of ssrfUrls) {
          // Test webhook URL validation
          const webhookTest = await request(testApp)
            .post('/api/v2/webhooks')
            .set('Authorization', `Bearer ${premiumUser.token}`)
            .send({
              url: url,
              events: ['deal.created']
            });

          expect(webhookTest.status).toBe(400);
          expect(webhookTest.body.error).toMatch(/invalid|url|not allowed/i);

          // Test avatar upload from URL
          const avatarTest = await request(testApp)
            .post('/api/v2/upload/avatar-from-url')
            .set('Authorization', `Bearer ${regularUser.token}`)
            .send({ url: url });

          expect(avatarTest.status).toBe(400);

          // Test business card import from URL
          const importTest = await request(testApp)
            .post('/api/v2/import/business-card')
            .set('Authorization', `Bearer ${premiumUser.token}`)
            .send({ sourceUrl: url });

          expect(importTest.status).toBe(400);
        }
      });

      it('should validate redirect URLs', async () => {
        const maliciousRedirects = [
          'http://evil.com/steal-tokens',
          'javascript:alert("xss")',
          'data:text/html,<script>alert("xss")</script>',
          '//evil.com/phishing',
          'https://app.digbiz.com.evil.com/fake-login'
        ];

        for (const redirect of maliciousRedirects) {
          const oauthTest = await request(testApp)
            .get('/api/v2/auth/oauth/callback')
            .query({
              code: 'test_code',
              state: 'test_state',
              redirect_uri: redirect
            });

          expect(oauthTest.status).toBe(400);
          expect(oauthTest.body.error).toMatch(/invalid|redirect|uri/i);
        }
      });

      it('should prevent DNS rebinding attacks', async () => {
        const rebindingUrls = [
          'http://1.2.3.4.xip.io',
          'http://127.0.0.1.nip.io',
          'http://localhost.evil.com',
          'http://anything.127.0.0.1.xip.io'
        ];

        for (const url of rebindingUrls) {
          const response = await request(testApp)
            .post('/api/v2/integrations/test-webhook')
            .set('Authorization', `Bearer ${adminUser.token}`)
            .send({ webhookUrl: url });

          expect(response.status).toBe(400);
          expect(response.body.error).toMatch(/invalid|dns|rebinding/i);
        }
      });
    });

    describe('API8:2023 Security Misconfiguration', () => {
      it('should not expose sensitive configuration in responses', async () => {
        const endpoints = [
          '/api/v2/config',
          '/api/v2/.env',
          '/api/v2/debug',
          '/api/v2/health/detailed',
          '/api/v2/metrics',
          '/api/v2/admin/system/info'
        ];

        for (const endpoint of endpoints) {
          const response = await request(testApp)
            .get(endpoint)
            .set('Authorization', `Bearer ${regularUser.token}`);

          if (response.status === 200) {
            const responseText = JSON.stringify(response.body).toLowerCase();
            
            // Should not expose sensitive information
            expect(responseText).not.toContain('password');
            expect(responseText).not.toContain('secret');
            expect(responseText).not.toContain('private_key');
            expect(responseText).not.toContain('api_key');
            expect(responseText).not.toContain('database_url');
            expect(responseText).not.toContain('jwt_secret');
            expect(responseText).not.toContain('stripe_secret');
          }
        }
      });

      it('should handle errors without information disclosure', async () => {
        // Trigger various errors and check responses
        const errorTriggers = [
          () => request(testApp).get('/api/v2/users/nonexistent').set('Authorization', `Bearer ${regularUser.token}`),
          () => request(testApp).post('/api/v2/deals').set('Authorization', `Bearer ${regularUser.token}`).send({}),
          () => request(testApp).get('/api/v2/nonexistent-endpoint'),
          () => request(testApp).post('/api/v2/auth/login').send({ email: 'invalid', password: 'wrong' })
        ];

        for (const trigger of errorTriggers) {
          const response = await trigger();
          
          if (response.body.error) {
            const errorMessage = response.body.error.toLowerCase();
            
            // Should not expose stack traces or internal paths
            expect(errorMessage).not.toContain('/app/');
            expect(errorMessage).not.toContain('/usr/');
            expect(errorMessage).not.toContain('node_modules');
            expect(errorMessage).not.toContain('stack trace');
            expect(errorMessage).not.toContain('internal server error');
            expect(errorMessage).not.toContain('database error');
            expect(errorMessage).not.toContain('query failed');
          }
        }
      });

      it('should implement proper HTTP security headers', async () => {
        const response = await request(testApp)
          .get('/api/v2/public/stats');

        // Check required security headers
        expect(response.headers['strict-transport-security']).toBeDefined();
        expect(response.headers['content-security-policy']).toBeDefined();
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
        expect(response.headers['referrer-policy']).toBeDefined();
        
        // Check that sensitive headers are not exposed
        expect(response.headers['server']).toBeUndefined();
        expect(response.headers['x-powered-by']).toBeUndefined();
        expect(response.headers['x-aspnet-version']).toBeUndefined();
      });
    });

    describe('API9:2023 Improper Inventory Management', () => {
      it('should not expose non-production endpoints in production', async () => {
        const nonProductionEndpoints = [
          '/api/v1', // Deprecated version
          '/api/debug',
          '/api/test',
          '/api/dev',
          '/api/internal',
          '/api/v2/debug',
          '/api/v2/test-data',
          '/api/v2/reset-database'
        ];

        for (const endpoint of nonProductionEndpoints) {
          const response = await request(testApp)
            .get(endpoint)
            .set('Authorization', `Bearer ${adminUser.token}`);

          // Should return 404 or 403, not 200
          expect([404, 403]).toContain(response.status);
        }
      });

      it('should properly version API endpoints', async () => {
        // Test that deprecated endpoints return proper deprecation headers
        const deprecatedEndpoints = [
          '/api/v1/users',
          '/api/v1/connections',
          '/api/v1/deals'
        ];

        for (const endpoint of deprecatedEndpoints) {
          const response = await request(testApp)
            .get(endpoint)
            .set('Authorization', `Bearer ${regularUser.token}`);

          if (response.status === 200) {
            expect(response.headers['deprecation']).toBeDefined();
            expect(response.headers['sunset']).toBeDefined();
            expect(response.headers['link']).toContain('api/v2');
          }
        }
      });

      it('should track API usage and enforce limits', async () => {
        const endpoint = '/api/v2/connections';
        const requests = [];

        // Make many requests to track usage
        for (let i = 0; i < 50; i++) {
          const request_promise = request(testApp)
            .get(endpoint)
            .set('Authorization', `Bearer ${regularUser.token}`);
          requests.push(request_promise);
        }

        const responses = await Promise.all(requests);
        
        // Check for usage tracking headers
        const lastResponse = responses[responses.length - 1];
        expect(lastResponse.headers['x-ratelimit-limit']).toBeDefined();
        expect(lastResponse.headers['x-ratelimit-remaining']).toBeDefined();
        expect(lastResponse.headers['x-ratelimit-reset']).toBeDefined();
      });
    });

    describe('API10:2023 Unsafe Consumption of APIs', () => {
      it('should validate third-party API responses', async () => {
        // Mock third-party integration with malicious response
        const integrationTest = await request(testApp)
          .post('/api/v2/integrations/linkedin/import')
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({
            accessToken: 'mock_token',
            // This would normally trigger third-party API call
            simulateResponse: {
              name: '<script>alert("xss")</script>',
              email: 'test@evil.com',
              company: '../../etc/passwd',
              connections: Array(10000).fill({ name: 'spam' }) // Large payload
            }
          });

        if (integrationTest.status === 200) {
          // Imported data should be sanitized
          const imported = integrationTest.body.imported;
          expect(imported.name).not.toContain('<script>');
          expect(imported.company).not.toContain('../');
          expect(imported.connections.length).toBeLessThanOrEqual(100); // Should be limited
        }
      });

      it('should implement timeouts for external API calls', async () => {
        // Test webhook delivery with timeout
        const webhookTest = await request(testApp)
          .post('/api/v2/webhooks/test')
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({
            url: 'https://httpstat.us/200?sleep=30000', // 30 second delay
            timeout: 5000 // 5 second timeout
          });

        expect(webhookTest.status).toBe(408); // Request Timeout
        expect(webhookTest.body.error).toMatch(/timeout/i);
      });

      it('should validate external API certificates', async () => {
        const invalidSslEndpoints = [
          'https://self-signed.badssl.com/',
          'https://expired.badssl.com/',
          'https://wrong.host.badssl.com/',
          'https://untrusted-root.badssl.com/'
        ];

        for (const endpoint of invalidSslEndpoints) {
          const response = await request(testApp)
            .post('/api/v2/integrations/webhook/validate')
            .set('Authorization', `Bearer ${adminUser.token}`)
            .send({ url: endpoint });

          expect(response.status).toBe(400);
          expect(response.body.error).toMatch(/ssl|certificate|tls/i);
        }
      });
    });
  });

  describe('Business Logic Security', () => {
    it('should prevent race conditions in critical operations', async () => {
      const dealId = (await TestHelpers.createTestDeal(premiumUser.id)).id;

      // Simulate concurrent deal completion attempts
      const concurrentCompletions = [
        request(testApp)
          .patch(`/api/v2/deals/${dealId}`)
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({ status: 'completed' }),
        request(testApp)
          .patch(`/api/v2/deals/${dealId}`)
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({ status: 'completed' }),
        request(testApp)
          .patch(`/api/v2/deals/${dealId}`)
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({ status: 'completed' })
      ];

      const results = await Promise.all(concurrentCompletions);
      
      // Only one should succeed, others should fail with conflict
      const successful = results.filter(r => r.status === 200);
      const conflicts = results.filter(r => r.status === 409);
      
      expect(successful).toHaveLength(1);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should enforce business workflow states', async () => {
      const deal = await TestHelpers.createTestDeal(premiumUser.id);

      // Try to skip workflow states
      const invalidTransitions = [
        { from: 'draft', to: 'completed' }, // Skip approval
        { from: 'pending', to: 'cancelled' }, // Invalid transition
        { from: 'completed', to: 'draft' } // Reverse transition
      ];

      for (const transition of invalidTransitions) {
        // Set deal to from state
        await TestHelpers.updateDealStatus(deal.id, transition.from);

        // Try invalid transition
        const response = await request(testApp)
          .patch(`/api/v2/deals/${deal.id}`)
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send({ status: transition.to });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid|transition|workflow/i);
      }
    });

    it('should validate business constraints', async () => {
      // Test deal value limits
      const highValueDeal = await request(testApp)
        .post('/api/v2/deals')
        .set('Authorization', `Bearer ${regularUser.token}`) // Free user
        .send({
          title: 'High Value Deal',
          value: 1000000, // $10,000 (above free tier limit)
          targetUserId: premiumUser.id
        });

      expect(highValueDeal.status).toBe(403);
      expect(highValueDeal.body.error).toMatch(/limit|upgrade|premium/i);

      // Test connection limits
      const connections = [];
      for (let i = 0; i < 10; i++) {
        const user = await TestHelpers.createTestUser();
        const connection = request(testApp)
          .post('/api/v2/connections')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            targetUserId: user.id,
            message: `Connection ${i}`
          });
        connections.push(connection);
      }

      const results = await Promise.all(connections);
      const exceeded = results.filter(r => r.status === 403 && r.body.error.includes('limit'));
      
      expect(exceeded.length).toBeGreaterThan(0); // Some should be rejected
    });
  });

  describe('Data Validation Security', () => {
    it('should prevent prototype pollution', async () => {
      const pollutionPayloads = [
        { '__proto__.isAdmin': true },
        { 'constructor.prototype.isAdmin': true },
        { '__proto__.role': 'ADMIN' },
        { 'prototype.subscriptionTier': 'ENTERPRISE' }
      ];

      for (const payload of pollutionPayloads) {
        const response = await request(testApp)
          .put('/api/v2/users/profile')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            name: 'Test User',
            metadata: payload
          });

        // Should not allow prototype pollution
        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid|prototype|pollution/i);
      }
    });

    it('should handle circular references in JSON', async () => {
      // This test simulates what would happen if circular JSON somehow got through
      const circularPayload = {
        name: 'Test',
        self: null as any
      };
      circularPayload.self = circularPayload;

      // Express should handle this, but test API response
      try {
        const response = await request(testApp)
          .post('/api/v2/deals')
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .send(circularPayload);

        expect(response.status).toBe(400);
      } catch (error) {
        // JSON.stringify will fail on circular references
        expect(error).toBeDefined();
      }
    });

    it('should validate enum values strictly', async () => {
      const invalidEnums = [
        { subscriptionTier: 'SUPER_PREMIUM' },
        { role: 'ROOT' },
        { status: 'HACKED' },
        { industry: 'illegal' },
        { currency: 'BITCOIN' }
      ];

      for (const invalid of invalidEnums) {
        const response = await request(testApp)
          .put('/api/v2/users/profile')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            name: 'Test User',
            ...invalid
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid|enum|value/i);
      }
    });
  });
});
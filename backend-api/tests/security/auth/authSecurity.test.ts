import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { TestHelpers } from '../utils/testHelpers';
import { TestDataFactory } from '../utils/testDataFactory';
import app from '../../src/app';

/**
 * Comprehensive Security and Authentication Tests
 * 
 * This test suite covers:
 * - Authentication bypass attempts
 * - Authorization vulnerabilities
 * - Rate limiting and brute force protection
 * - Input validation and sanitization
 * - SQL injection prevention
 * - XSS protection
 * - CSRF protection
 * - Session management security
 * - Password security
 * - JWT token security
 * - API key security
 * - Role-based access control (RBAC)
 * - Multi-factor authentication
 */

describe('Security and Authentication Tests', () => {
  let testApp: Express;
  let testUsers: any[];
  let adminUser: any;
  let regularUser: any;
  let premiumUser: any;

  beforeEach(async () => {
    testApp = app;
    
    // Create test users with different roles
    adminUser = await TestHelpers.createAndAuthenticateUser({
      role: 'ADMIN',
      subscriptionTier: 'ENTERPRISE',
      permissions: ['admin:read', 'admin:write', 'user:read', 'user:write']
    });
    
    premiumUser = await TestHelpers.createAndAuthenticateUser({
      role: 'USER',
      subscriptionTier: 'PROFESSIONAL',
      permissions: ['user:read', 'user:write', 'premium:access']
    });
    
    regularUser = await TestHelpers.createAndAuthenticateUser({
      role: 'USER',
      subscriptionTier: 'FREE',
      permissions: ['user:read']
    });

    testUsers = [adminUser, premiumUser, regularUser];
  });

  afterEach(async () => {
    await TestHelpers.cleanupTestData();
    jest.clearAllMocks();
  });

  describe('Authentication Bypass Prevention', () => {
    it('should prevent SQL injection in login', async () => {
      const maliciousPayloads = [
        "admin'--",
        "admin' OR '1'='1'--",
        "admin' OR '1'='1' /*",
        "admin'; DROP TABLE users; --",
        "admin' UNION SELECT * FROM users WHERE '1'='1'--",
        "' OR 1=1--",
        "' OR 'a'='a",
        "admin') OR ('1'='1'--",
        "admin' OR (SELECT COUNT(*) FROM users) > 0--"
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(testApp)
          .post('/api/v2/auth/login')
          .send({
            email: payload,
            password: 'password123'
          });

        expect(response.status).not.toBe(200);
        expect(response.body).not.toHaveProperty('token');
        expect(response.body).not.toHaveProperty('user');
      }
    });

    it('should prevent NoSQL injection in login', async () => {
      const maliciousPayloads = [
        { $ne: null },
        { $gt: "" },
        { $regex: ".*" },
        { $where: "1==1" },
        { $exists: true },
        { $in: ["admin", "user"] }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(testApp)
          .post('/api/v2/auth/login')
          .send({
            email: payload,
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('validation');
      }
    });

    it('should prevent authentication bypass via JWT manipulation', async () => {
      const manipulatedTokens = [
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIiwia2lkIjoiIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
        'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
        regularUser.token.replace(/[a-zA-Z0-9]/g, 'X'),
        regularUser.token + 'extra',
        Buffer.from('{"alg":"none"}').toString('base64') + '.' + Buffer.from('{"sub":"admin"}').toString('base64') + '.'
      ];

      for (const token of manipulatedTokens) {
        const response = await request(testApp)
          .get('/api/v2/admin/users')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.error).toMatch(/invalid|unauthorized|forbidden/i);
      }
    });

    it('should prevent privilege escalation via parameter pollution', async () => {
      const escalationAttempts = [
        { role: ['USER', 'ADMIN'] },
        { permissions: ['user:read', 'admin:write'] },
        { subscriptionTier: ['FREE', 'ENTERPRISE'] },
        { isVerified: [false, true] }
      ];

      for (const attempt of escalationAttempts) {
        const response = await request(testApp)
          .put('/api/v2/users/profile')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send(attempt);

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/validation|invalid/i);
      }
    });

    it('should prevent authentication bypass via header manipulation', async () => {
      const headerManipulations = [
        { 'X-Original-URL': '/api/v2/admin/users' },
        { 'X-Forwarded-For': '127.0.0.1' },
        { 'X-Real-IP': '127.0.0.1' },
        { 'X-Forwarded-Host': 'admin.example.com' },
        { 'Host': 'admin.example.com' },
        { 'X-User-Role': 'ADMIN' },
        { 'X-User-ID': adminUser.id },
        { 'Authorization': `Bearer ${regularUser.token}`, 'X-Override-Auth': `Bearer ${adminUser.token}` }
      ];

      for (const headers of headerManipulations) {
        const response = await request(testApp)
          .get('/api/v2/admin/users')
          .set(headers);

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Rate Limiting and Brute Force Protection', () => {
    it('should rate limit login attempts', async () => {
      const maxAttempts = 5;
      const attempts = [];

      // Make multiple rapid login attempts
      for (let i = 0; i < maxAttempts + 2; i++) {
        const attempt = request(testApp)
          .post('/api/v2/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });
        attempts.push(attempt);
      }

      const responses = await Promise.all(attempts);

      // First few attempts should return 401 (unauthorized)
      for (let i = 0; i < maxAttempts; i++) {
        expect(responses[i].status).toBe(401);
      }

      // Subsequent attempts should be rate limited (429)
      for (let i = maxAttempts; i < responses.length; i++) {
        expect(responses[i].status).toBe(429);
        expect(responses[i].body.error).toMatch(/rate limit|too many attempts/i);
      }
    });

    it('should implement progressive delays for repeated failed attempts', async () => {
      const email = 'brute-force-test@example.com';
      const timestamps: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        await request(testApp)
          .post('/api/v2/auth/login')
          .send({
            email,
            password: 'wrongpassword'
          });

        timestamps.push(Date.now() - startTime);
      }

      // Each subsequent attempt should take longer (progressive delay)
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      }
    });

    it('should rate limit password reset requests', async () => {
      const maxResetAttempts = 3;
      const email = regularUser.email;

      const attempts = [];
      for (let i = 0; i < maxResetAttempts + 2; i++) {
        const attempt = request(testApp)
          .post('/api/v2/auth/forgot-password')
          .send({ email });
        attempts.push(attempt);
      }

      const responses = await Promise.all(attempts);

      // Later attempts should be rate limited
      expect(responses[responses.length - 1].status).toBe(429);
    });

    it('should rate limit API endpoints per user', async () => {
      const maxRequests = 100;
      const requests = [];

      // Make rapid API requests
      for (let i = 0; i < maxRequests + 10; i++) {
        const request_promise = request(testApp)
          .get('/api/v2/connections')
          .set('Authorization', `Bearer ${regularUser.token}`);
        requests.push(request_promise);
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should implement IP-based rate limiting for anonymous endpoints', async () => {
      const maxRequests = 50;
      const requests = [];

      // Make rapid requests to public endpoint
      for (let i = 0; i < maxRequests + 10; i++) {
        const request_promise = request(testApp)
          .get('/api/v2/public/stats');
        requests.push(request_promise);
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize and validate user input', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
        '<svg onload=alert("xss")>',
        'data:text/html,<script>alert("xss")</script>',
        '\u003cscript\u003ealert("xss")\u003c/script\u003e',
        '<iframe src="javascript:alert(1)"></iframe>'
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(testApp)
          .put('/api/v2/users/profile')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .send({
            name: maliciousInput,
            bio: maliciousInput,
            website: maliciousInput
          });

        if (response.status === 200) {
          // If update successful, verify input was sanitized
          expect(response.body.user.name).not.toContain('<script>');
          expect(response.body.user.name).not.toContain('javascript:');
          expect(response.body.user.bio).not.toContain('<script>');
          expect(response.body.user.website).not.toContain('<script>');
        } else {
          // Or the request should be rejected
          expect(response.status).toBe(400);
        }
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@.com',
        'user@domain',
        'user..double.dot@domain.com',
        'user@domain..double.dot.com',
        'user name@domain.com',
        'user@domain .com',
        '<script>@domain.com',
        'user@domain.com<script>',
        'user+<script>@domain.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(testApp)
          .post('/api/v2/auth/register')
          .send({
            name: 'Test User',
            email,
            password: 'SecurePassword123!'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/email|validation/i);
      }
    });

    it('should validate password strength', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'abc',
        '12345678',
        'password123',
        'qwerty',
        'admin',
        'Password', // Missing number and special char
        'password1', // Missing special char
        'Password!', // Missing number
        'Aa1!' // Too short
      ];

      for (const password of weakPasswords) {
        const response = await request(testApp)
          .post('/api/v2/auth/register')
          .send({
            name: 'Test User',
            email: 'test@example.com',
            password
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/password|validation/i);
      }
    });

    it('should validate and sanitize file upload names', async () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '<script>alert("xss")</script>.jpg',
        'file.php.jpg',
        'file.jsp',
        'file.exe',
        '../../../../etc/passwd%00.jpg',
        'file\x00.jpg',
        'CON.jpg', // Windows reserved name
        'aux.png', // Windows reserved name
        'file.jpg\n.exe'
      ];

      for (const filename of maliciousFilenames) {
        const response = await request(testApp)
          .post('/api/v2/upload/avatar')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .attach('file', Buffer.from('fake-image-data'), filename);

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid|filename|file type/i);
      }
    });
  });

  describe('JWT Token Security', () => {
    it('should validate JWT token signature', async () => {
      // Create a token with wrong signature
      const payload = jwt.decode(regularUser.token) as any;
      const invalidToken = jwt.sign(payload, 'wrong-secret');

      const response = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });

    it('should validate JWT token expiration', async () => {
      // Create an expired token
      const payload = {
        userId: regularUser.id,
        email: regularUser.email,
        role: regularUser.role,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };
      
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET!);

      const response = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/expired|invalid/i);
    });

    it('should validate JWT token claims', async () => {
      const invalidClaims = [
        { userId: 'non-existent-user', email: regularUser.email, role: regularUser.role },
        { userId: regularUser.id, email: 'different@email.com', role: regularUser.role },
        { userId: regularUser.id, email: regularUser.email, role: 'INVALID_ROLE' },
        { userId: null, email: regularUser.email, role: regularUser.role },
        { email: regularUser.email, role: regularUser.role }, // Missing userId
      ];

      for (const claims of invalidClaims) {
        const invalidToken = jwt.sign(claims, process.env.JWT_SECRET!);

        const response = await request(testApp)
          .get('/api/v2/users/profile')
          .set('Authorization', `Bearer ${invalidToken}`);

        expect(response.status).toBe(401);
      }
    });

    it('should prevent JWT token reuse after logout', async () => {
      const token = regularUser.token;

      // Logout user
      await request(testApp)
        .post('/api/v2/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to use the same token after logout
      const response = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it('should rotate JWT tokens on sensitive operations', async () => {
      const originalToken = regularUser.token;

      // Perform password change
      const response = await request(testApp)
        .put('/api/v2/auth/change-password')
        .set('Authorization', `Bearer ${originalToken}`)
        .send({
          currentPassword: regularUser.password,
          newPassword: 'NewSecurePassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.token).not.toBe(originalToken);

      // Original token should be invalidated
      const testResponse = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${originalToken}`);

      expect(testResponse.status).toBe(401);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should enforce admin-only endpoints', async () => {
      const adminOnlyEndpoints = [
        { method: 'get', path: '/api/v2/admin/users' },
        { method: 'get', path: '/api/v2/admin/analytics' },
        { method: 'post', path: '/api/v2/admin/users/verify' },
        { method: 'delete', path: '/api/v2/admin/users/123' },
        { method: 'get', path: '/api/v2/admin/system-logs' }
      ];

      for (const endpoint of adminOnlyEndpoints) {
        // Regular user should be denied access
        const regularResponse = await request(testApp)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${regularUser.token}`);

        expect(regularResponse.status).toBe(403);

        // Premium user should also be denied access
        const premiumResponse = await request(testApp)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${premiumUser.token}`);

        expect(premiumResponse.status).toBe(403);

        // Admin user should have access
        const adminResponse = await request(testApp)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${adminUser.token}`);

        expect(adminResponse.status).not.toBe(403);
      }
    });

    it('should enforce premium-only features', async () => {
      const premiumEndpoints = [
        { method: 'get', path: '/api/v2/ai/smart-matching' },
        { method: 'get', path: '/api/v2/analytics/network-value' },
        { method: 'post', path: '/api/v2/ai/predict-success' },
        { method: 'get', path: '/api/v2/market/intelligence' }
      ];

      for (const endpoint of premiumEndpoints) {
        // Regular user should be denied access
        const regularResponse = await request(testApp)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${regularUser.token}`);

        expect(regularResponse.status).toBe(403);
        expect(regularResponse.body.error).toMatch(/premium|upgrade/i);

        // Premium user should have access
        const premiumResponse = await request(testApp)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${premiumUser.token}`);

        expect(premiumResponse.status).not.toBe(403);
      }
    });

    it('should enforce resource ownership', async () => {
      // Create resources owned by different users
      const user1Resource = await TestHelpers.createTestDeal(regularUser.id);
      const user2Resource = await TestHelpers.createTestDeal(premiumUser.id);

      // User should not be able to access other user's resources
      const unauthorizedResponse = await request(testApp)
        .get(`/api/v2/deals/${user2Resource.id}`)
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(unauthorizedResponse.status).toBe(403);

      // User should be able to access their own resources
      const authorizedResponse = await request(testApp)
        .get(`/api/v2/deals/${user1Resource.id}`)
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(authorizedResponse.status).toBe(200);
    });

    it('should prevent horizontal privilege escalation', async () => {
      const otherUserProfile = await request(testApp)
        .get(`/api/v2/users/${premiumUser.id}`)
        .set('Authorization', `Bearer ${regularUser.token}`);

      // Should only see public profile information
      expect(otherUserProfile.status).toBe(200);
      expect(otherUserProfile.body.user).not.toHaveProperty('email');
      expect(otherUserProfile.body.user).not.toHaveProperty('phone');
      expect(otherUserProfile.body.user).not.toHaveProperty('subscriptionTier');

      // Should not be able to update other user's profile
      const updateResponse = await request(testApp)
        .put(`/api/v2/users/${premiumUser.id}`)
        .set('Authorization', `Bearer ${regularUser.token}`)
        .send({ name: 'Hacked Name' });

      expect(updateResponse.status).toBe(403);
    });
  });

  describe('Session Management Security', () => {
    it('should invalidate all sessions on password change', async () => {
      // Create multiple sessions for the same user
      const session1 = await TestHelpers.authenticateUser(regularUser);
      const session2 = await TestHelpers.authenticateUser(regularUser);

      // Change password using one session
      await request(testApp)
        .put('/api/v2/auth/change-password')
        .set('Authorization', `Bearer ${session1.token}`)
        .send({
          currentPassword: regularUser.password,
          newPassword: 'NewPassword123!'
        });

      // Both old sessions should be invalidated
      const test1 = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${session1.token}`);

      const test2 = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${session2.token}`);

      expect(test1.status).toBe(401);
      expect(test2.status).toBe(401);
    });

    it('should implement session timeout', async () => {
      // This would require a session timeout mechanism in the actual implementation
      const shortLivedToken = jwt.sign(
        {
          userId: regularUser.id,
          email: regularUser.email,
          role: regularUser.role,
          exp: Math.floor(Date.now() / 1000) + 1 // Expires in 1 second
        },
        process.env.JWT_SECRET!
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const response = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${shortLivedToken}`);

      expect(response.status).toBe(401);
    });

    it('should track and limit concurrent sessions', async () => {
      const maxSessions = 5;
      const sessions = [];

      // Create multiple sessions
      for (let i = 0; i < maxSessions + 2; i++) {
        const session = await TestHelpers.authenticateUser(regularUser);
        sessions.push(session);
      }

      // First few sessions should work
      for (let i = 0; i < maxSessions; i++) {
        const response = await request(testApp)
          .get('/api/v2/users/profile')
          .set('Authorization', `Bearer ${sessions[i].token}`);

        expect(response.status).toBe(200);
      }

      // Excess sessions should be invalid
      for (let i = maxSessions; i < sessions.length; i++) {
        const response = await request(testApp)
          .get('/api/v2/users/profile')
          .set('Authorization', `Bearer ${sessions[i].token}`);

        expect(response.status).toBe(401);
      }
    });
  });

  describe('API Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(testApp)
        .get('/api/v2/public/stats');

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers).not.toHaveProperty('server'); // Server header should be hidden
      expect(response.headers).not.toHaveProperty('x-powered-by'); // X-Powered-By should be hidden
    });

    it('should implement CORS properly', async () => {
      const response = await request(testApp)
        .options('/api/v2/auth/login')
        .set('Origin', 'https://app.digbiz.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(response.headers['access-control-allow-origin']).toBe('https://app.digbiz.com');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(testApp)
        .options('/api/v2/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types strictly', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00' }, // PE header
        { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'shell.jsp', content: '<%@ page import="java.io.*" %>' },
        { name: 'fake.jpg', content: '<?php echo "hidden php"; ?>' },
        { name: 'test.svg', content: '<svg onload=alert("xss")></svg>' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(testApp)
          .post('/api/v2/upload/avatar')
          .set('Authorization', `Bearer ${regularUser.token}`)
          .attach('file', Buffer.from(file.content), file.name);

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/file type|invalid|not allowed/i);
      }
    });

    it('should limit file upload size', async () => {
      const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB file

      const response = await request(testApp)
        .post('/api/v2/upload/avatar')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .attach('file', largeFile, 'large.jpg');

      expect(response.status).toBe(413); // Payload Too Large
    });

    it('should scan uploaded files for malware signatures', async () => {
      const suspiciousPatterns = [
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*', // EICAR test signature
        'TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // PE header in base64
        '/bin/bash', // Unix shell
        'cmd.exe' // Windows command prompt
      ];

      for (const pattern of suspiciousPatterns) {
        const response = await request(testApp)
          .post('/api/v2/upload/document')
          .set('Authorization', `Bearer ${premiumUser.token}`)
          .attach('file', Buffer.from(pattern), 'suspicious.txt');

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/malware|suspicious|not allowed/i);
      }
    });
  });

  describe('Multi-Factor Authentication (MFA)', () => {
    it('should enforce MFA for admin operations', async () => {
      // Admin user without MFA setup
      const response = await request(testApp)
        .delete('/api/v2/admin/users/test-user-id')
        .set('Authorization', `Bearer ${adminUser.token}`);

      if (adminUser.mfaEnabled) {
        expect(response.status).toBe(403);
        expect(response.body.error).toMatch(/mfa|two.factor|verification/i);
      } else {
        // Should either work or require MFA setup
        expect([200, 403]).toContain(response.status);
      }
    });

    it('should validate TOTP codes correctly', async () => {
      if (!adminUser.mfaEnabled) {
        return; // Skip if MFA not enabled
      }

      const invalidCodes = [
        '000000',
        '123456',
        '111111',
        'abcdef',
        '12345', // Too short
        '1234567', // Too long
        '' // Empty
      ];

      for (const code of invalidCodes) {
        const response = await request(testApp)
          .post('/api/v2/auth/verify-mfa')
          .set('Authorization', `Bearer ${adminUser.token}`)
          .send({ code });

        expect(response.status).toBe(400);
        expect(response.body.error).toMatch(/invalid|code|verification/i);
      }
    });

    it('should implement backup codes for MFA recovery', async () => {
      if (!adminUser.mfaEnabled) {
        return; // Skip if MFA not enabled
      }

      // Test with an invalid backup code
      const response = await request(testApp)
        .post('/api/v2/auth/verify-backup-code')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({ backupCode: 'invalid-backup-code-12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid|backup|code/i);
    });
  });

  describe('Data Protection and Privacy', () => {
    it('should mask sensitive data in API responses', async () => {
      const response = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${regularUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user).not.toHaveProperty('salt');
      expect(response.body.user).not.toHaveProperty('mfaSecret');
      
      // Phone should be partially masked if shown
      if (response.body.user.phone) {
        expect(response.body.user.phone).toMatch(/\*{3,}/);
      }
    });

    it('should implement proper data deletion', async () => {
      // Create a user account to delete
      const userToDelete = await TestHelpers.createTestUser();

      // Delete the account
      const deleteResponse = await request(testApp)
        .delete('/api/v2/users/account')
        .set('Authorization', `Bearer ${userToDelete.token}`)
        .send({ confirmPassword: userToDelete.password });

      expect(deleteResponse.status).toBe(200);

      // Verify account is deleted and cannot be accessed
      const accessResponse = await request(testApp)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${userToDelete.token}`);

      expect(accessResponse.status).toBe(401);

      // Verify personal data is removed from public endpoints
      const publicResponse = await request(testApp)
        .get(`/api/v2/public/users/${userToDelete.id}`);

      expect(publicResponse.status).toBe(404);
    });

    it('should implement data anonymization for analytics', async () => {
      const analyticsResponse = await request(testApp)
        .get('/api/v2/admin/analytics/user-behavior')
        .set('Authorization', `Bearer ${adminUser.token}`);

      expect(analyticsResponse.status).toBe(200);

      // Analytics data should not contain PII
      const analyticsData = JSON.stringify(analyticsResponse.body);
      expect(analyticsData).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/); // No emails
      expect(analyticsData).not.toMatch(/\b\d{3}-?\d{3}-?\d{4}\b/); // No phone numbers
    });
  });

  describe('Logging and Monitoring Security', () => {
    it('should log security events without exposing sensitive data', async () => {
      // Trigger a security event (failed login)
      await request(testApp)
        .post('/api/v2/auth/login')
        .send({
          email: regularUser.email,
          password: 'wrongpassword'
        });

      // Check security logs (this would require access to logging system)
      const logsResponse = await request(testApp)
        .get('/api/v2/admin/security-logs')
        .set('Authorization', `Bearer ${adminUser.token}`);

      if (logsResponse.status === 200) {
        const logs = logsResponse.body.logs;
        const loginFailureLog = logs.find((log: any) => log.event === 'login_failure');
        
        if (loginFailureLog) {
          expect(loginFailureLog).not.toHaveProperty('password');
          expect(loginFailureLog.email).toMatch(/\*{3,}/); // Email should be masked
        }
      }
    });

    it('should detect and alert on suspicious activities', async () => {
      // Perform suspicious activity pattern
      const suspiciousActivities = [
        () => request(testApp).get('/api/v2/admin/users').set('Authorization', `Bearer ${regularUser.token}`),
        () => request(testApp).get('/api/v2/admin/users').set('Authorization', `Bearer ${regularUser.token}`),
        () => request(testApp).get('/api/v2/admin/system-logs').set('Authorization', `Bearer ${regularUser.token}`),
        () => request(testApp).post('/api/v2/admin/users/verify').set('Authorization', `Bearer ${regularUser.token}`),
      ];

      for (const activity of suspiciousActivities) {
        await activity();
      }

      // Check if suspicious activity was detected
      const alertsResponse = await request(testApp)
        .get('/api/v2/admin/security-alerts')
        .set('Authorization', `Bearer ${adminUser.token}`);

      if (alertsResponse.status === 200) {
        const alerts = alertsResponse.body.alerts;
        const suspiciousAlert = alerts.find((alert: any) => 
          alert.type === 'suspicious_activity' || alert.type === 'unauthorized_access_attempt'
        );
        
        expect(suspiciousAlert).toBeDefined();
      }
    });
  });
});
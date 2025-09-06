import request from 'supertest';
import { Express } from 'express';
import { TestDataFactory, TestHelpers, TestDatabaseSeeder } from '../../utils';

describe('Authentication API Integration Tests', () => {
  let app: Express;
  let testUser: any;
  
  beforeAll(async () => {
    app = require('../../../src/app').default;
    await TestHelpers.setupTestDatabase();
  });

  beforeEach(async () => {
    await TestHelpers.cleanupDatabase();
  });

  afterAll(async () => {
    await TestHelpers.cleanupDatabase();
  });

  describe('POST /api/v2/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'New User',
        title: 'Software Engineer',
        company: 'Tech Corp',
        industry: 'technology'
      };

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(userData)
        .expect(201);

      TestHelpers.expectSuccessResponse(response, 201);
      
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('emailVerificationSent', true);
      
      TestHelpers.validateUserObject(response.body.data.user);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.subscriptionTier).toBe('FREE');
      expect(response.body.data.user.isVerified).toBe(false);
    });

    it('should reject registration with duplicate email', async () => {
      const existingUser = await TestDataFactory.createUserInDB();
      
      const duplicateUserData = {
        email: existingUser.email,
        password: 'AnotherPassword123!',
        name: 'Another User'
      };

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(duplicateUserData)
        .expect(409);

      TestHelpers.expectErrorResponse(response, 409, 'already registered');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        email: 'incomplete@example.com'
        // missing password and name
      };

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(incompleteData)
        .expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'required');
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        email: 'invalid-email',
        password: 'ValidPassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(invalidEmailData)
        .expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'valid email');
    });

    it('should validate password complexity', async () => {
      const weakPasswordData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(weakPasswordData)
        .expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'password requirements');
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: '<script>alert("xss")</script>',
        title: '"><img src=x onerror=alert("xss")>'
      };

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(maliciousData)
        .expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'Invalid characters');
    });
  });

  describe('POST /api/v2/auth/login', () => {
    beforeEach(async () => {
      testUser = await TestDataFactory.createUserInDB({ 
        email: 'verified@example.com',
        isVerified: true 
      });
    });

    it('should authenticate user with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('sessionId');
      
      TestHelpers.validateUserObject(response.body.data.user);
      expect(response.body.data.user.id).toBe(testUser.id);
      
      // Token should be valid JWT
      expect(response.body.data.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(401);

      TestHelpers.expectErrorResponse(response, 401, 'Invalid credentials');
    });

    it('should reject login for unverified email', async () => {
      const unverifiedUser = await TestDataFactory.createUserInDB({ 
        isVerified: false 
      });
      
      const loginData = {
        email: unverifiedUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(403);

      TestHelpers.expectErrorResponse(response, 403, 'email verification');
    });

    it('should reject login for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(401);

      TestHelpers.expectErrorResponse(response, 401, 'Invalid credentials');
    });

    it('should implement rate limiting for failed attempts', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword'
      };

      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v2/auth/login')
          .send(loginData);
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .expect(429);

      TestHelpers.expectErrorResponse(response, 429, 'Too many attempts');
    });

    it('should track login sessions', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v2/auth/login')
        .send(loginData)
        .set('User-Agent', 'Test Browser')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200);

      expect(response.body.data.sessionId).toBeDefined();
      
      // Verify session in database or cache would be tested here
    });
  });

  describe('POST /api/v2/auth/logout', () => {
    beforeEach(async () => {
      testUser = await TestDataFactory.createUserInDB({ isVerified: true });
    });

    it('should logout user and invalidate token', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'post', '/api/v2/auth/logout', testUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      expect(response.body.message).toContain('logged out');

      // Verify token is invalidated by trying to use it
      const protectedResponse = await request(app)
        .get('/api/v2/users/profile')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(401);

      TestHelpers.expectAuthenticationRequired(protectedResponse);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v2/auth/logout')
        .expect(401);

      TestHelpers.expectAuthenticationRequired(response);
    });
  });

  describe('POST /api/v2/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      // This would typically involve creating a user with an email verification token
      const verificationToken = 'valid_verification_token_123';
      
      const response = await request(app)
        .post('/api/v2/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      expect(response.body.message).toContain('verified');
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/v2/auth/verify-email')
        .send({ token: 'invalid_token' })
        .expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'Invalid verification token');
    });

    it('should handle missing token', async () => {
      const response = await request(app)
        .post('/api/v2/auth/verify-email')
        .send({})
        .expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'token is required');
    });
  });

  describe('POST /api/v2/auth/forgot-password', () => {
    beforeEach(async () => {
      testUser = await TestDataFactory.createUserInDB({ isVerified: true });
    });

    it('should send password reset email for valid user', async () => {
      const response = await request(app)
        .post('/api/v2/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      expect(response.body.message).toContain('reset email sent');
    });

    it('should not reveal if email exists (security)', async () => {
      const response = await request(app)
        .post('/api/v2/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should return same response to prevent email enumeration
      TestHelpers.expectSuccessResponse(response);
      expect(response.body.message).toContain('reset email sent');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v2/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'valid email');
    });

    it('should rate limit password reset requests', async () => {
      // Make multiple requests
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v2/auth/forgot-password')
          .send({ email: testUser.email });
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/api/v2/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(429);

      TestHelpers.expectErrorResponse(response, 429, 'Too many requests');
    });
  });

  describe('POST /api/v2/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const resetToken = 'valid_reset_token_123';
      const newPassword = 'NewSecurePassword123!';
      
      const response = await request(app)
        .post('/api/v2/auth/reset-password')
        .send({ 
          token: resetToken, 
          password: newPassword 
        })
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      expect(response.body.message).toContain('reset successfully');
    });

    it('should reject expired reset token', async () => {
      const expiredToken = 'expired_reset_token_123';
      
      const response = await request(app)
        .post('/api/v2/auth/reset-password')
        .send({ 
          token: expiredToken, 
          password: 'NewPassword123!' 
        })
        .expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'expired');
    });

    it('should validate new password complexity', async () => {
      const resetToken = 'valid_reset_token_123';
      const weakPassword = '123';
      
      const response = await request(app)
        .post('/api/v2/auth/reset-password')
        .send({ 
          token: resetToken, 
          password: weakPassword 
        })
        .expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'password requirements');
    });
  });

  describe('GET /api/v2/auth/profile', () => {
    beforeEach(async () => {
      testUser = await TestDataFactory.createUserInDB({ isVerified: true });
    });

    it('should return user profile for authenticated user', async () => {
      const response = await TestHelpers.authenticatedRequest(
        app, 'get', '/api/v2/auth/profile', testUser
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      TestHelpers.validateUserObject(response.body.data.user);
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v2/auth/profile')
        .expect(401);

      TestHelpers.expectAuthenticationRequired(response);
    });

    it('should handle invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/v2/auth/profile')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      TestHelpers.expectErrorResponse(response, 401, 'Invalid token');
    });

    it('should handle expired JWT token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxNjAwMDAwMDAwfQ.invalid';
      
      const response = await request(app)
        .get('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      TestHelpers.expectErrorResponse(response, 401, 'expired');
    });
  });

  describe('PATCH /api/v2/auth/profile', () => {
    beforeEach(async () => {
      testUser = await TestDataFactory.createUserInDB({ isVerified: true });
    });

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        title: 'Senior Developer',
        bio: 'Updated bio description'
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'patch', '/api/v2/auth/profile', testUser, updateData
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      expect(response.body.data.user.name).toBe(updateData.name);
      expect(response.body.data.user.title).toBe(updateData.title);
      expect(response.body.data.user.bio).toBe(updateData.bio);
    });

    it('should validate update data', async () => {
      const invalidData = {
        email: 'newemail@example.com', // Email updates should be separate endpoint
        subscriptionTier: 'ENTERPRISE' // Should not be updatable directly
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'patch', '/api/v2/auth/profile', testUser, invalidData
      ).expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'not allowed');
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        bio: '"><img src=x onerror=alert("xss")>'
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'patch', '/api/v2/auth/profile', testUser, maliciousData
      ).expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'Invalid characters');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/v2/auth/profile')
        .send({ name: 'Updated Name' })
        .expect(401);

      TestHelpers.expectAuthenticationRequired(response);
    });
  });

  describe('POST /api/v2/auth/change-password', () => {
    beforeEach(async () => {
      testUser = await TestDataFactory.createUserInDB({ isVerified: true });
    });

    it('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewSecurePassword456!'
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', '/api/v2/auth/change-password', testUser, passwordData
      ).expect(200);

      TestHelpers.expectSuccessResponse(response);
      expect(response.body.message).toContain('changed successfully');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: testUser.email,
          password: passwordData.newPassword
        })
        .expect(200);

      TestHelpers.expectSuccessResponse(loginResponse);
    });

    it('should reject change with incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewSecurePassword456!'
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', '/api/v2/auth/change-password', testUser, passwordData
      ).expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'current password is incorrect');
    });

    it('should validate new password complexity', async () => {
      const passwordData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'weak'
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'post', '/api/v2/auth/change-password', testUser, passwordData
      ).expect(400);

      TestHelpers.expectErrorResponse(response, 400, 'password requirements');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v2/auth/change-password')
        .send({ 
          currentPassword: 'test', 
          newPassword: 'newtest' 
        })
        .expect(401);

      TestHelpers.expectAuthenticationRequired(response);
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle malformed Authorization header', async () => {
      const malformedHeaders = [
        'Bearer',
        'Bearer ',
        'InvalidBearer token123',
        'Bearer token1 token2',
        'Basic dGVzdDp0ZXN0' // Base64 encoded
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/v2/auth/profile')
          .set('Authorization', header)
          .expect(401);

        TestHelpers.expectAuthenticationRequired(response);
      }
    });

    it('should handle concurrent login attempts', async () => {
      testUser = await TestDataFactory.createUserInDB({ isVerified: true });
      
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      // Simulate 10 concurrent login attempts
      const loginPromises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/v2/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(loginPromises);
      
      // All should succeed (no race conditions)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle database connection failure gracefully', async () => {
      // This would involve mocking database failures
      // Implementation depends on your error handling strategy
      
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      // Mock database failure scenario would be tested here
      // The response should be a 503 Service Unavailable rather than exposing internal errors
    });

    it('should prevent timing attacks on login', async () => {
      const validEmail = testUser?.email || 'valid@example.com';
      const invalidEmail = 'invalid@example.com';
      const password = 'TestPassword123!';

      // Measure time for valid vs invalid email
      const { responseTime: validTime } = await TestHelpers.measureApiResponseTime(
        app, 'post', '/api/v2/auth/login', undefined, 
        { email: validEmail, password: 'wrongpassword' }
      );

      const { responseTime: invalidTime } = await TestHelpers.measureApiResponseTime(
        app, 'post', '/api/v2/auth/login', undefined,
        { email: invalidEmail, password: password }
      );

      // Response times should be similar (within 50ms) to prevent timing attacks
      const timeDifference = Math.abs(validTime - invalidTime);
      expect(timeDifference).toBeLessThan(50);
    });
  });
});
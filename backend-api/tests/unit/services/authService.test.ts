import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory, TestHelpers } from '../../utils';

// Mock Prisma Client
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

// Import service after mocking dependencies
import AuthService from '../../../src/services/authService';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    process.env.JWT_SECRET = 'test_jwt_secret';
  });

  afterEach(async () => {
    await TestHelpers.cleanupDatabase();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = TestDataFactory.createUser();
      const hashedPassword = 'hashedPassword123';
      
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        ...userData,
        id: 'new_user_id',
        password: hashedPassword
      });

      const result = await authService.registerUser({
        email: userData.email,
        password: 'TestPassword123!',
        name: userData.name,
        title: userData.title,
        company: userData.company,
        industry: userData.industry
      });

      expect(result.success).toBe(true);
      expect(result.user.email).toBe(userData.email);
      expect(result.user).not.toHaveProperty('password');
      expect(bcrypt.hash).toHaveBeenCalledWith('TestPassword123!', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email,
          password: hashedPassword,
          subscriptionTier: 'FREE',
          isVerified: false,
          reputation: 0,
          tokens: 0
        })
      });
    });

    it('should reject registration with duplicate email', async () => {
      const userData = TestDataFactory.createUser();
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing_user',
        email: userData.email
      });

      const result = await authService.registerUser({
        email: userData.email,
        password: 'TestPassword123!',
        name: userData.name
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should validate password complexity', async () => {
      const userData = TestDataFactory.createUser();
      
      const weakPasswords = ['123', 'password', 'abc123', 'PASSWORD'];
      
      for (const weakPassword of weakPasswords) {
        const result = await authService.registerUser({
          email: userData.email,
          password: weakPassword,
          name: userData.name
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('password requirements');
      }
    });

    it('should validate email format', async () => {
      const invalidEmails = ['invalid', 'test@', '@domain.com', 'test@domain'];
      
      for (const invalidEmail of invalidEmails) {
        const result = await authService.registerUser({
          email: invalidEmail,
          password: 'ValidPassword123!',
          name: 'Test User'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('valid email');
      }
    });
  });

  describe('User Authentication', () => {
    it('should authenticate user with valid credentials', async () => {
      const userData = TestDataFactory.createUser();
      const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
      const mockToken = 'mock.jwt.token';
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...userData,
        password: hashedPassword,
        emailVerified: true
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const result = await authService.authenticateUser(
        userData.email, 
        'TestPassword123!'
      );

      expect(result.success).toBe(true);
      expect(result.user.email).toBe(userData.email);
      expect(result.token).toBe(mockToken);
      expect(bcrypt.compare).toHaveBeenCalledWith('TestPassword123!', hashedPassword);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userData.id,
          email: userData.email,
          subscriptionTier: userData.subscriptionTier
        }),
        'test_jwt_secret',
        { expiresIn: '24h' }
      );
    });

    it('should reject authentication with invalid password', async () => {
      const userData = TestDataFactory.createUser();
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...userData,
        password: 'hashedPassword',
        emailVerified: true
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.authenticateUser(
        userData.email, 
        'WrongPassword'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    it('should reject authentication for unverified email', async () => {
      const userData = TestDataFactory.createUser();
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...userData,
        password: 'hashedPassword',
        emailVerified: false
      });

      const result = await authService.authenticateUser(
        userData.email, 
        'TestPassword123!'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('email verification');
    });

    it('should reject authentication for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.authenticateUser(
        'nonexistent@example.com', 
        'TestPassword123!'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });
  });

  describe('Token Validation', () => {
    it('should validate valid JWT token', async () => {
      const userData = TestDataFactory.createUser();
      const mockToken = 'valid.jwt.token';
      const decodedToken = {
        userId: userData.id,
        email: userData.email,
        subscriptionTier: userData.subscriptionTier,
        iat: Date.now(),
        exp: Date.now() + 86400000 // 24 hours
      };
      
      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userData);

      const result = await authService.validateToken(mockToken);

      expect(result.valid).toBe(true);
      expect(result.user).toEqual(userData);
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test_jwt_secret');
    });

    it('should reject invalid JWT token', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.validateToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid token');
    });

    it('should reject expired JWT token', async () => {
      const expiredToken = 'expired.jwt.token';
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = await authService.validateToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('Premium Access Control', () => {
    it('should grant access to professional tier features', () => {
      const professionalUser = TestDataFactory.createUser({ 
        subscriptionTier: 'PROFESSIONAL' 
      });
      
      const hasAccess = authService.hasPremiumAccess(professionalUser);
      expect(hasAccess).toBe(true);
    });

    it('should grant access to enterprise tier features', () => {
      const enterpriseUser = TestDataFactory.createUser({ 
        subscriptionTier: 'ENTERPRISE' 
      });
      
      const hasAccess = authService.hasPremiumAccess(enterpriseUser);
      expect(hasAccess).toBe(true);
    });

    it('should deny access to free tier users', () => {
      const freeUser = TestDataFactory.createUser({ 
        subscriptionTier: 'FREE' 
      });
      
      const hasAccess = authService.hasPremiumAccess(freeUser);
      expect(hasAccess).toBe(false);
    });

    it('should check enterprise-specific features', () => {
      const professionalUser = TestDataFactory.createUser({ 
        subscriptionTier: 'PROFESSIONAL' 
      });
      const enterpriseUser = TestDataFactory.createUser({ 
        subscriptionTier: 'ENTERPRISE' 
      });

      const professionalHasEnterprise = authService.hasEnterpriseAccess(professionalUser);
      const enterpriseHasEnterprise = authService.hasEnterpriseAccess(enterpriseUser);

      expect(professionalHasEnterprise).toBe(false);
      expect(enterpriseHasEnterprise).toBe(true);
    });
  });

  describe('Password Reset', () => {
    it('should generate password reset token', async () => {
      const userData = TestDataFactory.createUser();
      const mockResetToken = 'reset_token_123';
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userData);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...userData,
        passwordResetToken: mockResetToken,
        passwordResetExpires: new Date(Date.now() + 3600000) // 1 hour
      });

      const result = await authService.generatePasswordResetToken(userData.email);

      expect(result.success).toBe(true);
      expect(result.resetToken).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: userData.email },
        data: {
          passwordResetToken: expect.any(String),
          passwordResetExpires: expect.any(Date)
        }
      });
    });

    it('should reset password with valid token', async () => {
      const userData = TestDataFactory.createUser();
      const resetToken = 'valid_reset_token';
      const newPassword = 'NewPassword123!';
      const hashedNewPassword = 'hashedNewPassword';
      
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...userData,
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 1800000) // 30 minutes from now
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedNewPassword);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...userData,
        password: hashedNewPassword
      });

      const result = await authService.resetPassword(resetToken, newPassword);

      expect(result.success).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userData.id },
        data: {
          password: hashedNewPassword,
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });
    });

    it('should reject password reset with expired token', async () => {
      const resetToken = 'expired_reset_token';
      
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() - 3600000) // 1 hour ago
      });

      const result = await authService.resetPassword(resetToken, 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('Email Verification', () => {
    it('should verify email with valid token', async () => {
      const userData = TestDataFactory.createUser({ isVerified: false });
      const verificationToken = 'valid_verification_token';
      
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...userData,
        emailVerificationToken: verificationToken,
        emailVerified: false
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...userData,
        emailVerified: true
      });

      const result = await authService.verifyEmail(verificationToken);

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userData.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          reputation: expect.any(Number) // Should increase reputation
        }
      });
    });

    it('should reject verification with invalid token', async () => {
      const invalidToken = 'invalid_verification_token';
      
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await authService.verifyEmail(invalidToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid verification token');
    });
  });

  describe('User Profile Management', () => {
    it('should update user profile', async () => {
      const userData = TestDataFactory.createUser();
      const updateData = {
        name: 'Updated Name',
        title: 'Updated Title',
        bio: 'Updated bio'
      };
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userData);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        ...userData,
        ...updateData
      });

      const result = await authService.updateUserProfile(userData.id, updateData);

      expect(result.success).toBe(true);
      expect(result.user.name).toBe(updateData.name);
      expect(result.user.title).toBe(updateData.title);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userData.id },
        data: updateData
      });
    });

    it('should validate profile update data', async () => {
      const userData = TestDataFactory.createUser();
      const invalidData = {
        email: 'invalid-email',
        name: '', // Empty name
        bio: 'A'.repeat(2001) // Too long bio
      };

      const result = await authService.updateUserProfile(userData.id, invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('Session Management', () => {
    it('should create and manage user session', async () => {
      const userData = TestDataFactory.createUser();
      const sessionId = 'session_123';
      
      const session = await authService.createSession(userData.id, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        deviceInfo: { platform: 'web', os: 'macOS' }
      });

      expect(session.userId).toBe(userData.id);
      expect(session.sessionId).toBeDefined();
      expect(session.expiresAt).toBeInstanceOf(Date);
    });

    it('should invalidate user session', async () => {
      const userData = TestDataFactory.createUser();
      const sessionId = 'session_to_invalidate';

      const result = await authService.invalidateSession(sessionId);

      expect(result.success).toBe(true);
    });

    it('should cleanup expired sessions', async () => {
      const cleanupResult = await authService.cleanupExpiredSessions();

      expect(cleanupResult.success).toBe(true);
      expect(cleanupResult.deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should track failed login attempts', async () => {
      const email = 'test@example.com';
      const ipAddress = '192.168.1.1';

      for (let i = 0; i < 3; i++) {
        await authService.recordFailedLoginAttempt(email, ipAddress);
      }

      const isBlocked = await authService.isLoginBlocked(email, ipAddress);
      expect(isBlocked).toBe(false); // Not blocked until 5 attempts

      // Add 2 more attempts to trigger block
      for (let i = 0; i < 2; i++) {
        await authService.recordFailedLoginAttempt(email, ipAddress);
      }

      const isNowBlocked = await authService.isLoginBlocked(email, ipAddress);
      expect(isNowBlocked).toBe(true);
    });

    it('should reset failed attempts after successful login', async () => {
      const email = 'test@example.com';
      const ipAddress = '192.168.1.1';

      // Record some failed attempts
      for (let i = 0; i < 3; i++) {
        await authService.recordFailedLoginAttempt(email, ipAddress);
      }

      // Reset after successful login
      await authService.resetFailedLoginAttempts(email, ipAddress);

      const isBlocked = await authService.isLoginBlocked(email, ipAddress);
      expect(isBlocked).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await authService.authenticateUser(
        'test@example.com', 
        'password'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('service temporarily unavailable');
    });

    it('should handle JWT signing errors', async () => {
      const userData = TestDataFactory.createUser();
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...userData,
        password: 'hashedPassword',
        emailVerified: true
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      const result = await authService.authenticateUser(
        userData.email, 
        'TestPassword123!'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('token generation failed');
    });
  });
});
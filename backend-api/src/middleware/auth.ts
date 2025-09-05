// Authentication and Authorization Middleware for DigBiz3

import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        subscriptionTier: 'free' | 'professional' | 'enterprise';
        isVerified: boolean;
      };
    }
  }
}

// JWT Authentication Middleware
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      subscriptionTier: decoded.subscriptionTier || 'free',
      isVerified: decoded.isVerified || false
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token.'
    });
  }
};

// Premium Features Middleware
export const premiumMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const { subscriptionTier } = req.user;
    
    if (subscriptionTier === 'free') {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required. Upgrade to access this feature.',
        upgradeUrl: '/api/v2/payments/subscribe',
        availablePlans: [
          { name: 'Professional', price: 29, features: ['Advanced AI', 'Analytics', 'Unlimited connections'] },
          { name: 'Enterprise', price: 99, features: ['Team management', 'API access', 'Custom integrations'] }
        ]
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error checking subscription status.'
    });
  }
};

// Enterprise Features Middleware
export const enterpriseMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const { subscriptionTier } = req.user;
    
    if (subscriptionTier !== 'enterprise') {
      return res.status(403).json({
        success: false,
        error: 'Enterprise subscription required.',
        currentTier: subscriptionTier,
        requiredTier: 'enterprise',
        upgradeUrl: '/api/v2/payments/subscribe'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error checking enterprise access.'
    });
  }
};

// Rate Limiting Middleware
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // Different limits based on subscription tier
    if (req.user?.subscriptionTier === 'enterprise') return 1000;
    if (req.user?.subscriptionTier === 'professional') return 500;
    return 100; // Free tier
  },
  message: (req: Request) => ({
    success: false,
    error: 'Rate limit exceeded. Upgrade for higher limits.',
    currentTier: req.user?.subscriptionTier || 'free',
    limitReached: true,
    resetTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  }),
  standardHeaders: true,
  legacyHeaders: false
});

// API Usage Tracking Middleware
export const usageTrackingMiddleware = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        // Track feature usage for billing and analytics
        await trackFeatureUsage(req.user.userId, feature);
        
        // Check usage limits for free tier
        if (req.user.subscriptionTier === 'free') {
          const usageExceeded = await checkUsageLimits(req.user.userId, feature);
          if (usageExceeded) {
            return res.status(403).json({
              success: false,
              error: `${feature} usage limit exceeded for free tier.`,
              usageLimit: getFeatureLimit(feature, 'free'),
              upgradeMessage: 'Upgrade to Professional for unlimited access.'
            });
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('Usage tracking error:', error);
      next(); // Continue even if tracking fails
    }
  };
};

// Verification Required Middleware
export const verificationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        error: 'Account verification required for this feature.',
        verificationUrl: '/api/v2/users/verify',
        verificationMethods: ['email', 'phone', 'document']
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error checking verification status.'
    });
  }
};

// Security Headers Middleware
export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  next();
};

// Input Validation Middleware
export const validateInput = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map((detail: any) => detail.message)
      });
    }
    next();
  };
};

// Audit Logging Middleware
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - User: ${req.user?.userId || 'anonymous'}`);
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    console.log(`${new Date().toISOString()} - Response ${res.statusCode} - ${duration}ms`);
    return originalJson.call(this, body);
  };
  
  next();
};

// Helper functions
async function trackFeatureUsage(userId: string, feature: string): Promise<void> {
  // Implementation would store usage data in database
  console.log(`Tracking usage: User ${userId} used ${feature}`);
}

async function checkUsageLimits(userId: string, feature: string): Promise<boolean> {
  // Implementation would check current usage against limits
  const currentUsage = await getCurrentUsage(userId, feature);
  const limit = getFeatureLimit(feature, 'free');
  return currentUsage >= limit;
}

function getFeatureLimit(feature: string, tier: string): number {
  const limits: { [key: string]: { [key: string]: number } } = {
    'smart_matching': { free: 5, professional: -1, enterprise: -1 },
    'ai_insights': { free: 3, professional: -1, enterprise: -1 },
    'market_intelligence': { free: 0, professional: 10, enterprise: -1 },
    'video_meetings': { free: 0, professional: -1, enterprise: -1 }
  };
  
  return limits[feature]?.[tier] || 0; // -1 means unlimited
}

async function getCurrentUsage(userId: string, feature: string): Promise<number> {
  // Mock implementation - would query actual usage from database
  return Math.floor(Math.random() * 10);
}
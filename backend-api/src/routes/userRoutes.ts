import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authMiddleware, premiumMiddleware } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { 
      email, 
      username, 
      password, 
      firstName, 
      lastName, 
      company, 
      position, 
      industry, 
      location 
    } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email or username'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        company,
        position,
        industry,
        location,
        analytics: {
          create: {}
        }
      },
      include: {
        analytics: true
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        subscriptionTier: user.subscriptionTier 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: user.subscriptionTier,
          reputation: user.reputation
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to register user' 
    });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        analytics: true,
        subscription: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        subscriptionTier: user.subscriptionTier 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: user.subscriptionTier,
          reputation: user.reputation,
          networkValue: user.networkValue,
          totalRevenue: user.totalRevenue
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        analytics: true,
        subscription: true,
        arCards: true,
        networkInsights: {
          where: { isRead: false },
          take: 5
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          password: undefined // Remove password from response
        }
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch profile' 
    });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      firstName,
      lastName,
      bio,
      company,
      position,
      industry,
      location,
      website,
      linkedin,
      twitter,
      phone
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        bio,
        company,
        position,
        industry,
        location,
        website,
        linkedin,
        twitter,
        phone
      }
    });

    res.json({
      success: true,
      data: {
        user: {
          ...updatedUser,
          password: undefined
        }
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update profile' 
    });
  }
});

// Get user analytics dashboard
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const analytics = await prisma.userAnalytics.findUnique({
      where: { userId }
    });

    const recentConnections = await prisma.connection.count({
      where: {
        OR: [
          { requesterId: userId },
          { receiverId: userId }
        ],
        status: 'ACCEPTED',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    const activeDeals = await prisma.deal.count({
      where: {
        userId,
        status: {
          in: ['NEGOTIATING', 'PENDING']
        }
      }
    });

    res.json({
      success: true,
      data: {
        analytics,
        insights: {
          recentConnections,
          activeDeals,
          networkGrowth: '+23%',
          engagementRate: '87%'
        }
      }
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analytics' 
    });
  }
});

// Search users
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query, industry, location, limit = 20 } = req.query;

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { firstName: { contains: query as string, mode: 'insensitive' } },
              { lastName: { contains: query as string, mode: 'insensitive' } },
              { company: { contains: query as string, mode: 'insensitive' } },
              { position: { contains: query as string, mode: 'insensitive' } }
            ]
          },
          industry ? { industry: { contains: industry as string, mode: 'insensitive' } } : {},
          location ? { location: { contains: location as string, mode: 'insensitive' } } : {}
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        company: true,
        position: true,
        industry: true,
        location: true,
        avatar: true,
        bio: true,
        reputation: true,
        isVerified: true
      },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: {
        users,
        total: users.length
      }
    });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Search failed' 
    });
  }
});

export default router;
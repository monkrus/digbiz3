import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import aiService from '../services/aiService';

const router = express.Router();
const prisma = new PrismaClient();

// Send connection request
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const { userId } = req.user;

    // Check if connection already exists
    const existingConnection = await prisma.connection.findUnique({
      where: {
        requesterId_receiverId: {
          requesterId: userId,
          receiverId
        }
      }
    });

    if (existingConnection) {
      return res.status(400).json({
        success: false,
        error: 'Connection request already exists'
      });
    }

    // Calculate match score using AI
    const matchScore = await aiService.calculateMatchScore(userId, receiverId);

    // Create connection request
    const connection = await prisma.connection.create({
      data: {
        requesterId: userId,
        receiverId,
        message,
        matchScore,
        status: 'PENDING'
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            position: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            position: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: connection
    });
  } catch (error) {
    console.error('Connection request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send connection request' 
    });
  }
});

// Accept/reject connection request
router.put('/:connectionId/respond', authMiddleware, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { action } = req.body; // 'ACCEPTED' or 'REJECTED'
    const { userId } = req.user;

    // Find the connection and verify user is the receiver
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        receiverId: userId,
        status: 'PENDING'
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection request not found'
      });
    }

    // Update connection status
    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: action },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            position: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            position: true,
            avatar: true
          }
        }
      }
    });

    // If accepted, update analytics
    if (action === 'ACCEPTED') {
      await prisma.userAnalytics.updateMany({
        where: {
          userId: {
            in: [connection.requesterId, connection.receiverId]
          }
        },
        data: {
          connectionsMade: {
            increment: 1
          }
        }
      });
    }

    res.json({
      success: true,
      data: updatedConnection
    });
  } catch (error) {
    console.error('Connection response error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to respond to connection request' 
    });
  }
});

// Get user's connections
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { status = 'ACCEPTED', limit = 50 } = req.query;

    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { receiverId: userId }
        ],
        status: status as any
      },
      include: {
        requester: {
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
            reputation: true,
            isVerified: true
          }
        },
        receiver: {
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
            reputation: true,
            isVerified: true
          }
        }
      },
      take: parseInt(limit as string),
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform to show the other person in each connection
    const formattedConnections = connections.map(conn => ({
      id: conn.id,
      status: conn.status,
      matchScore: conn.matchScore,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
      user: conn.requesterId === userId ? conn.receiver : conn.requester,
      isRequester: conn.requesterId === userId
    }));

    res.json({
      success: true,
      data: {
        connections: formattedConnections,
        total: formattedConnections.length
      }
    });
  } catch (error) {
    console.error('Connections list error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch connections' 
    });
  }
});

// Get pending connection requests
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const pendingRequests = await prisma.connection.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING'
      },
      include: {
        requester: {
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
            reputation: true,
            isVerified: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        requests: pendingRequests,
        total: pendingRequests.length
      }
    });
  } catch (error) {
    console.error('Pending requests error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pending requests' 
    });
  }
});

// Block a user
router.post('/block', authMiddleware, async (req, res) => {
  try {
    const { userIdToBlock } = req.body;
    const { userId } = req.user;

    // Update existing connection to blocked, or create new blocked connection
    await prisma.connection.upsert({
      where: {
        requesterId_receiverId: {
          requesterId: userId,
          receiverId: userIdToBlock
        }
      },
      update: {
        status: 'BLOCKED'
      },
      create: {
        requesterId: userId,
        receiverId: userIdToBlock,
        status: 'BLOCKED'
      }
    });

    res.json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to block user' 
    });
  }
});

// Get mutual connections
router.get('/mutual/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const { userId } = req.user;

    // Get current user's connections
    const userConnections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'ACCEPTED' },
          { receiverId: userId, status: 'ACCEPTED' }
        ]
      },
      select: {
        requesterId: true,
        receiverId: true
      }
    });

    // Get target user's connections
    const targetConnections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: targetUserId, status: 'ACCEPTED' },
          { receiverId: targetUserId, status: 'ACCEPTED' }
        ]
      },
      select: {
        requesterId: true,
        receiverId: true
      }
    });

    // Find mutual connections
    const userConnectionIds = userConnections.map(conn => 
      conn.requesterId === userId ? conn.receiverId : conn.requesterId
    );
    
    const targetConnectionIds = targetConnections.map(conn => 
      conn.requesterId === targetUserId ? conn.receiverId : conn.requesterId
    );

    const mutualConnectionIds = userConnectionIds.filter(id => 
      targetConnectionIds.includes(id)
    );

    // Get user details for mutual connections
    const mutualConnections = await prisma.user.findMany({
      where: {
        id: { in: mutualConnectionIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        position: true,
        avatar: true
      },
      take: 10
    });

    res.json({
      success: true,
      data: {
        mutualConnections,
        count: mutualConnections.length
      }
    });
  } catch (error) {
    console.error('Mutual connections error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch mutual connections' 
    });
  }
});

export default router;
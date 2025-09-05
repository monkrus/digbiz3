import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  subscriptionTier?: string;
}

export class SocketService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.use(this.authenticateSocket);

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User connected: ${socket.userId} (${socket.id})`);

      // Join user to their personal room
      if (socket.userId) {
        socket.join(`user_${socket.userId}`);
      }

      // Real-time messaging
      this.setupMessaging(socket);
      
      // Live networking events
      this.setupNetworking(socket);
      
      // Business intelligence updates
      this.setupBusinessIntelligence(socket);
      
      // AR/VR features
      this.setupARVR(socket);
      
      // Deal and transaction tracking
      this.setupDealsTracking(socket);

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId} (${socket.id})`);
      });
    });
  }

  private authenticateSocket(socket: any, next: any) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('No token provided'));
      }

      const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      socket.subscriptionTier = decoded.subscriptionTier;
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  }

  private setupMessaging(socket: AuthenticatedSocket) {
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, messageType = 'TEXT' } = data;

        // Save message to database
        const message = await prisma.message.create({
          data: {
            senderId: socket.userId!,
            receiverId,
            content,
            messageType,
            isEncrypted: true
          },
          include: {
            sender: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        });

        // Send to receiver if they're online
        this.io.to(`user_${receiverId}`).emit('new_message', {
          id: message.id,
          senderId: socket.userId,
          sender: message.sender,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt,
          isRead: false
        });

        // Confirm to sender
        socket.emit('message_sent', {
          id: message.id,
          status: 'delivered'
        });

        // Update analytics
        await this.updateMessagingAnalytics(socket.userId!, receiverId);
      } catch (error) {
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    socket.on('mark_read', async (data) => {
      try {
        const { messageIds } = data;
        
        await prisma.message.updateMany({
          where: {
            id: { in: messageIds },
            receiverId: socket.userId
          },
          data: { isRead: true }
        });

        socket.emit('messages_marked_read', { messageIds });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    socket.on('typing_start', (data) => {
      const { receiverId } = data;
      this.io.to(`user_${receiverId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { receiverId } = data;
      this.io.to(`user_${receiverId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping: false
      });
    });
  }

  private setupNetworking(socket: AuthenticatedSocket) {
    socket.on('join_networking_room', async (data) => {
      const { roomId, eventType = 'general' } = data;
      
      socket.join(roomId);
      
      // Get user profile for broadcasting
      const user = await prisma.user.findUnique({
        where: { id: socket.userId! },
        select: {
          firstName: true,
          lastName: true,
          company: true,
          position: true,
          avatar: true,
          industry: true
        }
      });

      socket.to(roomId).emit('user_joined', {
        userId: socket.userId,
        user,
        timestamp: new Date().toISOString()
      });

      // Send current room participants to the new user
      const roomParticipants = await this.getRoomParticipants(roomId);
      socket.emit('room_participants', { participants: roomParticipants });
    });

    socket.on('leave_networking_room', (data) => {
      const { roomId } = data;
      socket.leave(roomId);
      
      socket.to(roomId).emit('user_left', {
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('request_connection', async (data) => {
      const { targetUserId, message } = data;
      
      try {
        // Create connection request in database
        const connection = await prisma.connection.create({
          data: {
            requesterId: socket.userId!,
            receiverId: targetUserId,
            message,
            status: 'PENDING'
          },
          include: {
            requester: {
              select: {
                firstName: true,
                lastName: true,
                company: true,
                position: true,
                avatar: true
              }
            }
          }
        });

        // Notify target user
        this.io.to(`user_${targetUserId}`).emit('connection_request', {
          connection,
          message: 'New connection request received'
        });

        socket.emit('connection_request_sent', {
          connectionId: connection.id,
          status: 'sent'
        });
      } catch (error) {
        socket.emit('connection_error', { error: 'Failed to send connection request' });
      }
    });
  }

  private setupBusinessIntelligence(socket: AuthenticatedSocket) {
    socket.on('subscribe_market_intelligence', async (data) => {
      const { industries = [], location } = data;
      
      // Check premium access
      if (socket.subscriptionTier === 'free') {
        socket.emit('premium_required', {
          feature: 'Market Intelligence',
          message: 'Premium subscription required for real-time market intelligence'
        });
        return;
      }

      industries.forEach((industry: string) => {
        socket.join(`market_${industry}`);
      });

      // Start sending market updates
      this.startMarketIntelligenceUpdates(socket, industries);
    });

    socket.on('request_ai_insights', async (data) => {
      try {
        const { category = 'all' } = data;
        
        // Generate personalized insights
        const insights = await this.generatePersonalizedInsights(socket.userId!, category);
        
        socket.emit('ai_insights', {
          insights,
          category,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        socket.emit('insights_error', { error: 'Failed to generate insights' });
      }
    });
  }

  private setupARVR(socket: AuthenticatedSocket) {
    socket.on('join_vr_room', (data) => {
      const { roomId, avatar, position } = data;
      
      socket.join(roomId);
      
      socket.to(roomId).emit('participant_joined', {
        userId: socket.userId,
        avatar,
        position,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('update_ar_position', (data) => {
      const { roomId, position, rotation } = data;
      
      socket.to(roomId).emit('participant_moved', {
        userId: socket.userId,
        position,
        rotation
      });
    });

    socket.on('ar_business_card_scan', async (data) => {
      try {
        const { imageData, location } = data;
        
        // Process AR business card (mock implementation)
        const extractedData = await this.processARBusinessCard(imageData);
        
        socket.emit('ar_scan_result', {
          success: true,
          data: extractedData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        socket.emit('ar_scan_error', { error: 'Failed to process AR scan' });
      }
    });

    socket.on('share_ar_card', async (data) => {
      const { targetUserId, cardData } = data;
      
      // Save AR business card interaction
      await prisma.aRBusinessCard.updateMany({
        where: { userId: socket.userId! },
        data: { scanCount: { increment: 1 } }
      });
      
      this.io.to(`user_${targetUserId}`).emit('ar_card_received', {
        senderId: socket.userId,
        cardData,
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupDealsTracking(socket: AuthenticatedSocket) {
    socket.on('initiate_deal', async (data) => {
      try {
        const { participantId, title, description, value } = data;
        
        const deal = await prisma.deal.create({
          data: {
            userId: socket.userId!,
            title,
            description,
            value,
            partnerId: participantId,
            status: 'NEGOTIATING'
          }
        });

        // Notify participant
        this.io.to(`user_${participantId}`).emit('deal_invitation', {
          deal,
          initiator: socket.userId,
          message: 'New deal proposal received'
        });

        socket.emit('deal_initiated', {
          dealId: deal.id,
          status: 'sent'
        });
      } catch (error) {
        socket.emit('deal_error', { error: 'Failed to initiate deal' });
      }
    });

    socket.on('deal_response', async (data) => {
      try {
        const { dealId, response, counterOffer } = data;
        
        const deal = await prisma.deal.findUnique({
          where: { id: dealId },
          include: { user: true }
        });

        if (!deal) {
          socket.emit('deal_error', { error: 'Deal not found' });
          return;
        }

        // Update deal status
        await prisma.deal.update({
          where: { id: dealId },
          data: { 
            status: response === 'accept' ? 'PENDING' : 'CANCELLED'
          }
        });

        // Notify deal initiator
        this.io.to(`user_${deal.userId}`).emit('deal_response', {
          dealId,
          response,
          counterOffer,
          responderId: socket.userId
        });
      } catch (error) {
        socket.emit('deal_error', { error: 'Failed to respond to deal' });
      }
    });
  }

  // Helper methods
  private async updateMessagingAnalytics(senderId: string, receiverId: string) {
    await prisma.userAnalytics.updateMany({
      where: {
        userId: { in: [senderId, receiverId] }
      },
      data: {
        messagesExchanged: { increment: 1 }
      }
    });
  }

  private async getRoomParticipants(roomId: string): Promise<any[]> {
    // Mock implementation - would query actual room participants
    return [];
  }

  private async startMarketIntelligenceUpdates(socket: AuthenticatedSocket, industries: string[]) {
    // Send periodic market intelligence updates
    const interval = setInterval(() => {
      industries.forEach(industry => {
        socket.emit('market_update', {
          industry,
          trend: `AI adoption in ${industry} increasing`,
          change: '+' + Math.floor(Math.random() * 20) + '%',
          confidence: 0.85 + Math.random() * 0.1,
          timestamp: new Date().toISOString()
        });
      });
    }, 30000); // Every 30 seconds

    socket.on('disconnect', () => {
      clearInterval(interval);
    });
  }

  private async generatePersonalizedInsights(userId: string, category: string): Promise<any[]> {
    // Mock AI insights - would use actual AI service
    return [
      {
        type: 'opportunity',
        title: 'New Partnership Opportunity',
        description: 'Potential collaboration with 3 companies in your network',
        confidence: 0.92,
        priority: 'high'
      },
      {
        type: 'trend',
        title: 'Industry Growth Trend',
        description: 'Your industry showing 23% growth this quarter',
        confidence: 0.78,
        priority: 'medium'
      }
    ];
  }

  private async processARBusinessCard(imageData: string): Promise<any> {
    // Mock AR processing - would integrate with actual AR service
    return {
      name: 'John Smith',
      title: 'Senior Developer',
      company: 'Tech Corp',
      email: 'john@techcorp.com',
      phone: '+1-555-0123',
      confidence: 0.94,
      matchScore: 87
    };
  }

  // Public methods for external use
  public notifyUser(userId: string, event: string, data: any) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  public broadcastToRoom(roomId: string, event: string, data: any) {
    this.io.to(roomId).emit(event, data);
  }

  public getActiveUsers(): number {
    return this.io.sockets.sockets.size;
  }
}

export default SocketService;
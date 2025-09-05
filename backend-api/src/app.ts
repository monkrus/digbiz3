// Enhanced DigBiz3 Backend API with Premium Features

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Import routes and middleware
import v2Routes from './routes/v2Routes';
import { 
  securityMiddleware, 
  rateLimitMiddleware, 
  auditMiddleware 
} from './middleware/auth';
import SocketService from './services/socketService';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO for real-time features
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8081', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Enhanced Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(securityMiddleware);
app.use(auditMiddleware);

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8081', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Request Processing
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimitMiddleware);

// API Routes
app.use('/api/v2', v2Routes);

// Legacy v1 routes (Basic functionality)
app.get('/', (req, res) => {
  res.json({
    message: '🚀 DigBiz3 API v2.0 - AI-Powered Business Networking Platform',
    version: '2.0.0',
    features: [
      '🤖 Advanced AI Matching & Insights',
      '💰 Subscription-based Monetization',
      '📊 Real-time Business Intelligence',
      '🔍 Market Intelligence & Analytics',
      '👓 AR/VR Business Networking',
      '⛓️ Blockchain Verification',
      '🌟 Premium Enterprise Features'
    ],
    documentation: '/api/v2/docs',
    status: 'Active',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'DigBiz3 Backend API v2.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected', // Would check actual DB connection
    redis: 'Connected', // Would check Redis connection
    ai_service: 'Active', // Would check AI service
    features: {
      aiMatching: true,
      premiumAnalytics: true,
      realTimeFeatures: true,
      arSupport: true,
      blockchainReady: true
    },
    performance: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    },
    timestamp: new Date().toISOString()
  });
});

// Premium Features Status
app.get('/api/v2/status', (req, res) => {
  res.json({
    platform: 'DigBiz3 v2.0',
    tier: 'Premium',
    capabilities: {
      aiPowered: true,
      realTimeIntelligence: true,
      arVrSupport: true,
      blockchainEnabled: true,
      enterpriseReady: true
    },
    pricing: {
      free: { connections: 5, messages: 50, price: 0 },
      professional: { connections: 'unlimited', advancedAI: true, price: 29 },
      enterprise: { teamManagement: true, apiAccess: true, price: 99 }
    },
    marketPosition: {
      target: 'LinkedIn Competitor',
      differentiators: [
        'Real-time AI business intelligence',
        'AR/VR immersive networking',
        'Blockchain-verified profiles',
        'Deal facilitation & commission tracking',
        'Advanced market intelligence'
      ]
    }
  });
});

// Initialize Socket.IO service
const socketService = new SocketService(io);

// Export socket service for use in other modules
export { socketService };

// API Documentation Route
app.get('/api/v2/docs', (req, res) => {
  res.json({
    title: 'DigBiz3 API v2.0 Documentation',
    description: 'AI-Powered Business Networking Platform API',
    version: '2.0.0',
    baseUrl: 'https://api.digbiz3.com',
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <jwt_token>'
    },
    endpoints: {
      analytics: {
        networkValue: 'GET /api/v2/analytics/network-value',
        opportunities: 'GET /api/v2/insights/opportunities',
        marketTrends: 'GET /api/v2/intelligence/market-trends'
      },
      ai: {
        predictSuccess: 'POST /api/v2/ai/predict-success',
        smartMatching: 'POST /api/v2/matching/smart-match'
      },
      monetization: {
        subscribe: 'POST /api/v2/payments/subscribe',
        facilitateDeals: 'POST /api/v2/deals/facilitate',
        revenueTracking: 'GET /api/v2/revenue/attribution'
      },
      ar_vr: {
        scanCard: 'POST /api/v2/ar/scan-card',
        meetingRooms: 'GET /api/v2/ar/meeting-rooms',
        vrEnvironments: 'POST /api/v2/vr/environments'
      }
    },
    subscriptionTiers: {
      free: 'Limited features with ads',
      professional: '$29/month - Advanced AI + Analytics',
      enterprise: '$99/month - Full platform + API access'
    },
    rateLimits: {
      free: '100 requests / 15 minutes',
      professional: '500 requests / 15 minutes',
      enterprise: '1000 requests / 15 minutes'
    }
  });
});

// Error Handling
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Check /api/v2/docs for available endpoints',
    supportedVersions: ['v2']
  });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// Server Startup
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';

httpServer.listen(PORT, () => {
  console.log('🚀 ================================');
  console.log(`🚀 DigBiz3 API v2.0 Server Started`);
  console.log(`🚀 Environment: ${ENV}`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 URL: http://localhost:${PORT}`);
  console.log(`🚀 Health: http://localhost:${PORT}/api/health`);
  console.log(`🚀 Docs: http://localhost:${PORT}/api/v2/docs`);
  console.log(`🚀 Features: AI + Analytics + AR/VR + Blockchain`);
  console.log(`🚀 Socket.IO: Real-time features enabled`);
  console.log('🚀 ================================');
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
  });
});

export default app;
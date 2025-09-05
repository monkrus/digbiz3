// Blockchain API Routes for DigBiz3 - Trust & Verification Layer

import express from 'express';
import blockchainService from '../services/blockchainService';
import { authMiddleware, premiumMiddleware } from '../middleware/auth';

const router = express.Router();

// ==================== BLOCKCHAIN SERVICE STATUS ====================

// Get blockchain service status and capabilities
router.get('/status', async (req, res) => {
  try {
    const status = await blockchainService.getBlockchainStatus();
    const features = await blockchainService.getFeatures();
    
    res.json({
      success: true,
      data: {
        ...status,
        features,
        service: 'DigBiz3 Blockchain Verification',
        version: '1.0.0'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== IDENTITY VERIFICATION ====================

// Verify user identity using multi-layer blockchain verification
router.post('/verify-identity', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const verificationData = req.body;
    
    const result = await blockchainService.verifyIdentity(userId, verificationData);
    
    res.json({
      success: true,
      data: result,
      message: result.verified ? 
        '✅ Identity successfully verified on blockchain' : 
        '❌ Identity verification failed'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's verification status and trust score
router.get('/verification-status/:userId?', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user.userId;
    const status = await blockchainService.getVerificationStatus(targetUserId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== REPUTATION TOKEN SYSTEM ====================

// Mint reputation tokens for user actions
router.post('/tokens/mint', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { amount, reason } = req.body;
    
    if (!amount || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'Amount and reason are required' 
      });
    }
    
    const tokenRecord = await blockchainService.mintReputationTokens(userId, amount, reason);
    
    res.json({
      success: true,
      data: tokenRecord,
      message: `🪙 Minted ${amount} reputation tokens for: ${reason}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Transfer reputation tokens between users
router.post('/tokens/transfer', authMiddleware, async (req, res) => {
  try {
    const { userId: fromUserId } = req.user;
    const { toUserId, amount } = req.body;
    
    if (!toUserId || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Recipient user ID and amount are required' 
      });
    }
    
    const result = await blockchainService.transferReputationTokens(fromUserId, toUserId, amount);
    
    res.json({
      success: true,
      data: result,
      message: `Transferred ${amount} tokens to user ${toUserId}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's token balance
router.get('/tokens/balance/:userId?', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user.userId;
    const balance = await blockchainService.getTokenBalance(targetUserId);
    
    res.json({
      success: true,
      data: {
        userId: targetUserId,
        balance,
        symbol: 'DBZ',
        contractAddress: process.env.REPUTATION_CONTRACT_ADDRESS
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== NFT BUSINESS CARDS ====================

// Mint NFT business card
router.post('/nft/mint-card', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const cardData = req.body;
    
    const nftCard = await blockchainService.mintNFTBusinessCard(userId, cardData);
    
    res.json({
      success: true,
      data: nftCard,
      message: '🎨 NFT Business Card minted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update NFT business card
router.put('/nft/update-card/:tokenId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { tokenId } = req.params;
    const newCardData = req.body;
    
    const result = await blockchainService.updateNFTBusinessCard(tokenId, userId, newCardData);
    
    res.json({
      success: true,
      data: result,
      message: 'NFT Business Card updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify NFT ownership
router.get('/nft/verify-ownership/:tokenId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { tokenId } = req.params;
    
    const isOwner = await blockchainService.verifyNFTOwnership(tokenId, userId);
    
    res.json({
      success: true,
      data: {
        tokenId,
        userId,
        isOwner,
        verified: isOwner,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== SMART CONTRACTS FOR DEALS ====================

// Create smart contract for deal
router.post('/contracts/create-deal', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const dealData = { ...req.body, buyerId: userId };
    
    const smartContract = await blockchainService.createDealContract(dealData);
    
    res.json({
      success: true,
      data: smartContract,
      message: '📝 Smart contract created for deal'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete a deal through smart contract
router.post('/contracts/complete-deal/:contractId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { contractId } = req.params;
    
    const result = await blockchainService.completeDeal(contractId, userId);
    
    res.json({
      success: true,
      data: result,
      message: 'Deal completed successfully through smart contract'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== VERIFIED REVIEWS ====================

// Create verified review with blockchain proof
router.post('/reviews/create-verified', authMiddleware, async (req, res) => {
  try {
    const { userId: reviewerId } = req.user;
    const reviewData = { ...req.body, reviewerId };
    
    const result = await blockchainService.createVerifiedReview(reviewData);
    
    res.json({
      success: true,
      data: result,
      message: 'Verified review created with blockchain proof'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ADVANCED BLOCKCHAIN FEATURES ====================

// Get comprehensive blockchain analytics for user
router.get('/analytics/:userId?', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId || req.user.userId;
    
    const [verificationStatus, tokenBalance] = await Promise.all([
      blockchainService.getVerificationStatus(targetUserId),
      blockchainService.getTokenBalance(targetUserId)
    ]);
    
    const analytics = {
      userId: targetUserId,
      verification: verificationStatus,
      tokenBalance,
      blockchainActivity: {
        totalTransactions: 15, // Mock data
        totalContracts: 3,
        totalNFTs: 2,
        lastActivity: new Date().toISOString()
      },
      trustMetrics: {
        verificationScore: verificationStatus.trustScore || 0,
        reputationRank: 'Top 15%', // Mock ranking
        networkTrust: 'High',
        blockchainReputation: tokenBalance > 100 ? 'Established' : 'Growing'
      }
    };
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch operations for enterprise users
router.post('/batch/verify-users', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const { userIds, verificationData } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'User IDs array is required' 
      });
    }
    
    if (userIds.length > 50) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maximum 50 users per batch operation' 
      });
    }
    
    const results = [];
    for (const userId of userIds) {
      try {
        const result = await blockchainService.verifyIdentity(userId, verificationData);
        results.push({ userId, success: true, result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      data: {
        totalProcessed: userIds.length,
        successful: successCount,
        failed: userIds.length - successCount,
        results
      },
      message: `Batch verification completed: ${successCount}/${userIds.length} successful`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get blockchain network statistics
router.get('/network/stats', async (req, res) => {
  try {
    const status = await blockchainService.getBlockchainStatus();
    
    const networkStats = {
      ...status,
      platformStats: {
        totalVerifiedUsers: 1250, // Mock data - would query database
        totalReputationTokens: 45000,
        totalNFTBusinessCards: 750,
        totalSmartContracts: 320,
        totalVerifiedReviews: 2100
      },
      performanceMetrics: {
        avgVerificationTime: '2.3 seconds',
        avgTransactionFee: '0.05 MATIC',
        successRate: '99.7%',
        uptime: '99.9%'
      }
    };
    
    res.json({
      success: true,
      data: networkStats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
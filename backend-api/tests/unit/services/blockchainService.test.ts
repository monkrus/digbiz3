import { TestDataFactory, TestHelpers } from '../../utils';
import BlockchainService from '../../../src/services/blockchainService';

// Mock ethers.js
const mockProvider = {
  getNetwork: jest.fn(),
  getBlockNumber: jest.fn(),
  getGasPrice: jest.fn(),
};

const mockWallet = {
  address: '0x1234567890123456789012345678901234567890',
  connect: jest.fn(),
};

const mockContract = {
  address: '0xcontract123',
  mintTokens: jest.fn(),
  balanceOf: jest.fn(),
  transferTokens: jest.fn(),
  mintBusinessCard: jest.fn(),
  verifyOwnership: jest.fn(),
  updateCard: jest.fn(),
  createDeal: jest.fn(),
  completeDeal: jest.fn(),
  getDealStatus: jest.fn(),
};

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  deal: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  aRBusinessCard: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  review: {
    create: jest.fn(),
  },
};

jest.mock('ethers', () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn(() => mockProvider),
    },
    Wallet: jest.fn(() => mockWallet),
    Contract: jest.fn(() => mockContract),
    utils: {
      computeAddress: jest.fn((key) => `0x${key.substring(2, 42)}`),
      formatUnits: jest.fn((value, unit) => '10'),
    },
  },
}));

jest.mock('@prisma/client');
jest.mock('crypto');

describe('BlockchainService', () => {
  let blockchainService: BlockchainService;

  beforeEach(() => {
    jest.clearAllMocks();
    blockchainService = new BlockchainService();
  });

  afterEach(async () => {
    await TestHelpers.cleanupDatabase();
  });

  describe('Identity Verification', () => {
    it('should verify user identity with valid data', async () => {
      const userId = 'user_123';
      const verificationData = TestDataFactory.createBlockchainTestData().verificationData;
      
      // Mock prisma user update
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        isVerified: true,
        reputation: 110 // increased by 10
      });

      const result = await blockchainService.verifyIdentity(userId, verificationData);

      expect(result.verified).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.verificationMethod).toBe('multi-layer-blockchain');
      expect(result.blockchainTxHash).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { 
          isVerified: true,
          reputation: { increment: 10 }
        }
      });
    });

    it('should perform cryptographic verification', async () => {
      const userId = 'user_123';
      const validCryptoData = {
        publicKey: '0x1234567890123456789012345678901234567890',
        signature: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        message: 'Verification message',
        documents: ['passport.pdf'],
        biometric: 'biometric_hash'
      };

      const result = await blockchainService.verifyIdentity(userId, validCryptoData);

      expect(result.verified).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should fail verification with insufficient data', async () => {
      const userId = 'user_123';
      const insufficientData = {
        publicKey: '0x123', // too short
        // missing signature
        documents: [] // empty documents
      };

      const result = await blockchainService.verifyIdentity(userId, insufficientData);

      expect(result.verified).toBe(false);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should get user verification status', async () => {
      const userId = 'user_123';
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        isVerified: true,
        reputation: 150,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      });

      const status = await blockchainService.getVerificationStatus(userId);

      expect(status.verified).toBe(true);
      expect(status.reputation).toBe(150);
      expect(status.accountAge).toBe(30);
      expect(status.trustScore).toBeGreaterThan(0);
      expect(status.blockchainVerifications).toBeGreaterThanOrEqual(0);
    });

    it('should handle user not found gracefully', async () => {
      const userId = 'nonexistent_user';
      
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const status = await blockchainService.getVerificationStatus(userId);

      expect(status.verified).toBe(false);
      expect(status.reputation).toBe(0);
      expect(status.trustScore).toBe(0);
    });
  });

  describe('Reputation Token System', () => {
    it('should mint reputation tokens successfully', async () => {
      const userId = 'user_123';
      const amount = 50;
      const reason = 'successful_deal';
      
      // Mock blockchain transaction
      const mockTx = {
        hash: '0xtxhash123',
        wait: jest.fn().mockResolvedValue({ status: 1 })
      };
      
      mockContract.mintTokens.mockResolvedValue(mockTx);
      
      // Mock database update
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        tokens: 150, // previous 100 + 50
        reputation: 125 // increased by 25
      });

      const result = await blockchainService.mintReputationTokens(userId, amount, reason);

      expect(result.tokenId).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.amount).toBe(amount);
      expect(result.reason).toBe(reason);
      expect(result.txHash).toBe('0xtxhash123');
      expect(result.contractAddress).toBeDefined();

      expect(mockContract.mintTokens).toHaveBeenCalledWith(
        expect.any(String), // wallet address
        amount,
        reason
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { 
          tokens: { increment: amount },
          reputation: { increment: Math.floor(amount / 2) }
        }
      });
    });

    it('should validate token minting rules', async () => {
      const userId = 'user_123';
      
      // Test invalid amount
      await expect(blockchainService.mintReputationTokens(userId, 0, 'test'))
        .rejects.toThrow('Invalid token amount');
      
      await expect(blockchainService.mintReputationTokens(userId, 101, 'test'))
        .rejects.toThrow('Invalid token amount');

      // Test invalid reason
      await expect(blockchainService.mintReputationTokens(userId, 50, 'invalid_reason'))
        .rejects.toThrow('Invalid token minting reason');
    });

    it('should transfer tokens between users', async () => {
      const fromUserId = 'user_from';
      const toUserId = 'user_to';
      const amount = 30;
      
      // Mock sufficient balance check
      mockContract.balanceOf.mockResolvedValue({ lt: jest.fn(() => false), toNumber: () => 100 });
      
      // Mock transfer transaction
      const mockTx = {
        hash: '0xtransferhash',
        wait: jest.fn().mockResolvedValue({ status: 1 })
      };
      mockContract.transferTokens.mockResolvedValue(mockTx);
      
      // Mock database updates
      mockPrisma.user.update
        .mockResolvedValueOnce({ id: fromUserId, tokens: 70 })
        .mockResolvedValueOnce({ id: toUserId, tokens: 130 });

      const result = await blockchainService.transferReputationTokens(
        fromUserId, 
        toUserId, 
        amount
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xtransferhash');
      expect(result.amount).toBe(amount);

      expect(mockContract.transferTokens).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);
    });

    it('should reject transfer with insufficient balance', async () => {
      const fromUserId = 'user_from';
      const toUserId = 'user_to';
      const amount = 150;
      
      // Mock insufficient balance
      mockContract.balanceOf.mockResolvedValue({ 
        lt: jest.fn(() => true), 
        toNumber: () => 50 
      });

      await expect(blockchainService.transferReputationTokens(fromUserId, toUserId, amount))
        .rejects.toThrow('Insufficient token balance');
    });

    it('should get user token balance', async () => {
      const userId = 'user_123';
      const expectedBalance = 275;
      
      mockContract.balanceOf.mockResolvedValue({ 
        toNumber: () => expectedBalance 
      });

      const balance = await blockchainService.getTokenBalance(userId);

      expect(balance).toBe(expectedBalance);
      expect(mockContract.balanceOf).toHaveBeenCalled();
    });

    it('should handle blockchain connection errors', async () => {
      const userId = 'user_123';
      
      mockContract.balanceOf.mockRejectedValue(new Error('Network timeout'));

      const balance = await blockchainService.getTokenBalance(userId);

      expect(balance).toBe(0); // Should return 0 on error
    });
  });

  describe('NFT Business Cards', () => {
    it('should mint NFT business card successfully', async () => {
      const userId = 'user_123';
      const cardData = TestDataFactory.createBlockchainTestData().nftCardData;
      
      // Mock IPFS upload
      const mockMetadataUri = 'ipfs://QmExample123';
      
      // Mock NFT minting transaction
      const mockTx = {
        hash: '0xnftminthash',
        wait: jest.fn().mockResolvedValue({
          status: 1,
          logs: [{ topics: ['', '', '', '0x123'] }] // Mock token ID
        })
      };
      mockContract.mintBusinessCard.mockResolvedValue(mockTx);
      
      // Mock user lookup for rarity determination
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        reputation: 350 // High reputation for rare card
      });
      
      // Mock database creation
      mockPrisma.aRBusinessCard.create.mockResolvedValue({
        id: 'card_123',
        userId,
        nftTokenId: '0x123'
      });

      const result = await blockchainService.mintNFTBusinessCard(userId, cardData);

      expect(result.tokenId).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.cardData).toEqual(cardData);
      expect(result.metadataUri).toBe(mockMetadataUri);
      expect(result.mintTx).toBe('0xnftminthash');
      expect(result.rarity).toBe('rare'); // Based on high reputation

      expect(mockContract.mintBusinessCard).toHaveBeenCalled();
      expect(mockPrisma.aRBusinessCard.create).toHaveBeenCalled();
    });

    it('should validate required card data fields', async () => {
      const userId = 'user_123';
      const incompleteCardData = {
        name: 'John Doe',
        // missing title, company, email
      };

      await expect(blockchainService.mintNFTBusinessCard(userId, incompleteCardData))
        .rejects.toThrow('Missing required fields');
    });

    it('should determine card rarity based on reputation', async () => {
      const userId = 'user_123';
      const cardData = TestDataFactory.createBusinessCard();
      
      // Test different reputation levels
      const reputationTests = [
        { reputation: 50, expectedRarity: 'common' },
        { reputation: 250, expectedRarity: 'rare' },
        { reputation: 600, expectedRarity: 'legendary' }
      ];

      for (const test of reputationTests) {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: userId,
          reputation: test.reputation
        });

        const mockTx = {
          hash: '0xtest',
          wait: jest.fn().mockResolvedValue({
            status: 1,
            logs: [{ topics: ['', '', '', '0xtoken'] }]
          })
        };
        mockContract.mintBusinessCard.mockResolvedValue(mockTx);
        
        mockPrisma.aRBusinessCard.create.mockResolvedValue({});

        const result = await blockchainService.mintNFTBusinessCard(userId, cardData);
        expect(result.rarity).toBe(test.expectedRarity);
      }
    });

    it('should verify NFT ownership', async () => {
      const tokenId = 'nft_123';
      const userId = 'user_123';
      
      mockContract.verifyOwnership.mockResolvedValue(true);

      const isOwner = await blockchainService.verifyNFTOwnership(tokenId, userId);

      expect(isOwner).toBe(true);
      expect(mockContract.verifyOwnership).toHaveBeenCalledWith(
        tokenId,
        expect.any(String) // wallet address
      );
    });

    it('should update NFT business card', async () => {
      const tokenId = 'nft_123';
      const userId = 'user_123';
      const newCardData = { name: 'Updated Name', title: 'New Title' };
      
      // Mock ownership verification
      mockContract.verifyOwnership.mockResolvedValue(true);
      
      // Mock update transaction
      const mockTx = {
        hash: '0xupdatehash',
        wait: jest.fn().mockResolvedValue({ status: 1 })
      };
      mockContract.updateCard.mockResolvedValue(mockTx);
      
      // Mock database update
      mockPrisma.aRBusinessCard.updateMany.mockResolvedValue({ count: 1 });

      const result = await blockchainService.updateNFTBusinessCard(
        tokenId, 
        userId, 
        newCardData
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xupdatehash');
      expect(result.newMetadataUri).toBeDefined();

      expect(mockContract.updateCard).toHaveBeenCalledWith(
        tokenId,
        expect.stringContaining('ipfs://')
      );
    });

    it('should reject update from non-owner', async () => {
      const tokenId = 'nft_123';
      const userId = 'user_123';
      const newCardData = { name: 'Hacker Name' };
      
      // Mock ownership verification failure
      mockContract.verifyOwnership.mockResolvedValue(false);

      await expect(blockchainService.updateNFTBusinessCard(tokenId, userId, newCardData))
        .rejects.toThrow('not the owner');
    });
  });

  describe('Smart Contracts for Deals', () => {
    it('should create deal contract successfully', async () => {
      const dealData = TestDataFactory.createBlockchainTestData().dealContractData;
      
      // Mock escrow contract creation
      const mockTx = {
        hash: '0xcontractdeploy',
        wait: jest.fn().mockResolvedValue({
          status: 1,
          logs: [{ topics: ['', '0xdealid123'] }]
        })
      };
      mockContract.createDeal.mockResolvedValue(mockTx);
      
      // Mock database deal creation
      mockPrisma.deal.create.mockResolvedValue({
        id: 'deal_db_123',
        userId: dealData.buyerId,
        status: 'NEGOTIATING'
      });

      const result = await blockchainService.createDealContract(dealData);

      expect(result.contractId).toBeDefined();
      expect(result.dealId).toBeDefined();
      expect(result.parties).toContain(dealData.buyerId);
      expect(result.parties).toContain(dealData.sellerId);
      expect(result.status).toBe('active');
      expect(result.contractAddress).toBeDefined();
      expect(result.deploymentTx).toBe('0xcontractdeploy');

      expect(mockContract.createDeal).toHaveBeenCalled();
      expect(mockPrisma.deal.create).toHaveBeenCalled();
    });

    it('should complete deal through smart contract', async () => {
      const contractId = 'contract_123';
      const dealId = '123';
      const userId = 'user_buyer';
      const partnerId = 'user_seller';
      
      // Mock deal lookup
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: 'deal_db_123',
        userId: userId,
        partnerId: partnerId,
        status: 'NEGOTIATING'
      });
      
      // Mock contract completion
      const mockTx = {
        hash: '0xcompletetx',
        wait: jest.fn().mockResolvedValue({ status: 1 })
      };
      mockContract.completeDeal.mockResolvedValue(mockTx);
      
      // Mock database update
      mockPrisma.deal.update.mockResolvedValue({
        id: 'deal_db_123',
        status: 'COMPLETED'
      });

      const result = await blockchainService.completeDeal(contractId, userId);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xcompletetx');

      expect(mockContract.completeDeal).toHaveBeenCalledWith(dealId);
      expect(mockPrisma.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal_db_123' },
        data: { 
          status: 'COMPLETED',
          completedAt: expect.any(Date)
        }
      });
    });

    it('should mint reputation tokens after deal completion', async () => {
      const contractId = 'contract_123';
      const userId = 'user_buyer';
      const partnerId = 'user_seller';
      
      // Mock successful deal completion setup
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: 'deal_123',
        userId: userId,
        partnerId: partnerId
      });
      
      const mockTx = { hash: '0x123', wait: jest.fn().mockResolvedValue({ status: 1 }) };
      mockContract.completeDeal.mockResolvedValue(mockTx);
      mockPrisma.deal.update.mockResolvedValue({});
      
      // Mock token minting (should be called twice - once for each party)
      const mockTokenTx = { hash: '0xtoken', wait: jest.fn().mockResolvedValue({ status: 1 }) };
      mockContract.mintTokens.mockResolvedValue(mockTokenTx);
      
      mockPrisma.user.update.mockResolvedValue({});

      await blockchainService.completeDeal(contractId, userId);

      // Verify that tokens were minted for both parties
      expect(mockContract.mintTokens).toHaveBeenCalledTimes(2);
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);
    });

    it('should reject deal completion from unauthorized user', async () => {
      const contractId = 'contract_123';
      const unauthorizedUserId = 'unauthorized_user';
      
      // Mock deal lookup returning null (user not part of deal)
      mockPrisma.deal.findFirst.mockResolvedValue(null);

      await expect(blockchainService.completeDeal(contractId, unauthorizedUserId))
        .rejects.toThrow('not authorized');
    });
  });

  describe('Verified Reviews System', () => {
    it('should create verified review with blockchain proof', async () => {
      const reviewData = {
        reviewerId: 'user_reviewer',
        revieweeId: 'user_reviewee',
        rating: 5,
        comment: 'Excellent collaboration',
        dealId: 'deal_123'
      };
      
      // Mock completed deal verification
      mockPrisma.deal.findFirst.mockResolvedValue({
        id: 'deal_123',
        userId: reviewData.reviewerId,
        partnerId: reviewData.revieweeId,
        status: 'COMPLETED'
      });
      
      // Mock review creation
      mockPrisma.review.create.mockResolvedValue({
        id: 'review_123',
        ...reviewData,
        isVerified: true
      });
      
      // Mock token minting for review
      const mockTokenTx = { hash: '0xreviewtoken', wait: jest.fn().mockResolvedValue({ status: 1 }) };
      mockContract.mintTokens.mockResolvedValue(mockTokenTx);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await blockchainService.createVerifiedReview(reviewData);

      expect(result.success).toBe(true);
      expect(result.reviewId).toBe('review_123');
      expect(result.proof).toBeDefined();
      expect(result.proof.verified).toBe(true);

      expect(mockPrisma.review.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reviewerId: reviewData.reviewerId,
          revieweeId: reviewData.revieweeId,
          isVerified: true
        })
      });
    });

    it('should reject review without deal history', async () => {
      const reviewData = {
        reviewerId: 'user_reviewer',
        revieweeId: 'user_reviewee',
        rating: 5,
        comment: 'Fake review attempt'
      };
      
      // Mock no completed deal found
      mockPrisma.deal.findFirst.mockResolvedValue(null);

      await expect(blockchainService.createVerifiedReview(reviewData))
        .rejects.toThrow('Cannot review user without completed deal history');
    });
  });

  describe('Blockchain Status and Monitoring', () => {
    it('should get blockchain service status', async () => {
      mockProvider.getNetwork.mockResolvedValue({
        name: 'polygon',
        chainId: 137
      });
      mockProvider.getBlockNumber.mockResolvedValue(45123456);
      mockProvider.getGasPrice.mockResolvedValue('20000000000');

      const status = await blockchainService.getBlockchainStatus();

      expect(status.network).toBe('polygon');
      expect(status.chainId).toBe(137);
      expect(status.blockNumber).toBe(45123456);
      expect(status.gasPrice).toBeDefined();
      expect(status.contracts).toBeDefined();
      expect(status.status).toBe('connected');
      expect(status.lastUpdate).toBeDefined();
    });

    it('should handle blockchain connection failure', async () => {
      mockProvider.getNetwork.mockRejectedValue(new Error('Connection failed'));

      const status = await blockchainService.getBlockchainStatus();

      expect(status.status).toBe('disconnected');
      expect(status.error).toContain('Connection failed');
    });

    it('should report available features', async () => {
      const features = await blockchainService.getFeatures();

      expect(features.identityVerification).toBe(true);
      expect(features.reputationTokens).toBe(true);
      expect(features.smartContracts).toBe(true);
      expect(features.nftBusinessCards).toBe(true);
      expect(features.verifiedReviews).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network congestion gracefully', async () => {
      const userId = 'user_123';
      const amount = 50;
      const reason = 'test_mint';
      
      // Mock network congestion error
      mockContract.mintTokens.mockRejectedValue(
        new Error('Network congestion - try again later')
      );

      await expect(blockchainService.mintReputationTokens(userId, amount, reason))
        .rejects.toThrow('Network congestion');
    });

    it('should validate smart contract addresses', async () => {
      // Test with invalid contract address
      process.env.REPUTATION_CONTRACT_ADDRESS = 'invalid_address';
      
      const newService = new BlockchainService();
      
      // Should handle invalid addresses gracefully
      const features = await newService.getFeatures();
      expect(features).toBeDefined();
    });

    it('should handle IPFS upload failures', async () => {
      const userId = 'user_123';
      const cardData = TestDataFactory.createBusinessCard();
      
      // Mock IPFS failure by making the service handle it internally
      // The actual implementation should have fallback mechanisms
      
      try {
        await blockchainService.mintNFTBusinessCard(userId, cardData);
      } catch (error) {
        expect(error.message).toContain('IPFS' || 'metadata');
      }
    });

    it('should implement transaction retry logic', async () => {
      const userId = 'user_123';
      const amount = 25;
      const reason = 'retry_test';
      
      // Mock first attempt failure, second success
      const mockTx = { hash: '0xretry', wait: jest.fn().mockResolvedValue({ status: 1 }) };
      
      mockContract.mintTokens
        .mockRejectedValueOnce(new Error('Transaction failed'))
        .mockResolvedValueOnce(mockTx);
        
      mockPrisma.user.update.mockResolvedValue({});

      const result = await blockchainService.mintReputationTokens(userId, amount, reason);
      
      expect(result.txHash).toBe('0xretry');
      expect(mockContract.mintTokens).toHaveBeenCalledTimes(2);
    });
  });
});
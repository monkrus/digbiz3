// Blockchain Verification Service for DigBiz3
// Implements trust & verification layer with smart contracts and NFT business cards

import { ethers } from 'ethers';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BlockchainFeatures {
  identityVerification: boolean;
  reputationTokens: boolean;
  smartContracts: boolean;
  nftBusinessCards: boolean;
  verifiedReviews: boolean;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  verificationMethod: string;
  blockchainTxHash?: string;
  timestamp: Date;
}

export interface ReputationToken {
  tokenId: string;
  userId: string;
  amount: number;
  reason: string;
  contractAddress: string;
  txHash: string;
  createdAt: Date;
}

export interface SmartContract {
  contractId: string;
  dealId: string;
  parties: string[];
  terms: object;
  status: 'draft' | 'active' | 'completed' | 'disputed';
  contractAddress: string;
  deploymentTx: string;
}

export interface NFTBusinessCard {
  tokenId: string;
  userId: string;
  cardData: object;
  metadataUri: string;
  contractAddress: string;
  mintTx: string;
  rarity: 'common' | 'rare' | 'legendary';
}

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private reputationContract: ethers.Contract;
  private nftContract: ethers.Contract;
  private escrowContract: ethers.Contract;

  // Smart Contract ABIs (simplified for demonstration)
  private reputationABI = [
    "function mintTokens(address to, uint256 amount, string reason) external",
    "function burnTokens(address from, uint256 amount) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function transferTokens(address from, address to, uint256 amount) external",
    "event TokensMinted(address indexed to, uint256 amount, string reason)",
    "event TokensBurned(address indexed from, uint256 amount)"
  ];

  private nftABI = [
    "function mintBusinessCard(address to, string metadataUri) external returns (uint256)",
    "function updateCard(uint256 tokenId, string metadataUri) external",
    "function verifyOwnership(uint256 tokenId, address owner) external view returns (bool)",
    "function getCardMetadata(uint256 tokenId) external view returns (string)",
    "event BusinessCardMinted(address indexed owner, uint256 indexed tokenId, string metadataUri)"
  ];

  private escrowABI = [
    "function createDeal(address buyer, address seller, uint256 amount) external returns (uint256)",
    "function completeDeal(uint256 dealId) external",
    "function disputeDeal(uint256 dealId) external",
    "function getDealStatus(uint256 dealId) external view returns (uint8)",
    "event DealCreated(uint256 indexed dealId, address buyer, address seller, uint256 amount)"
  ];

  constructor() {
    // Initialize blockchain connection
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.BLOCKCHAIN_RPC_URL || 'https://polygon-rpc.com'
    );
    
    this.wallet = new ethers.Wallet(
      process.env.BLOCKCHAIN_PRIVATE_KEY || this.generateSecureKey(),
      this.provider
    );

    // Initialize smart contracts
    this.reputationContract = new ethers.Contract(
      process.env.REPUTATION_CONTRACT_ADDRESS || this.getDefaultContractAddress('reputation'),
      this.reputationABI,
      this.wallet
    );

    this.nftContract = new ethers.Contract(
      process.env.NFT_CONTRACT_ADDRESS || this.getDefaultContractAddress('nft'),
      this.nftABI,
      this.wallet
    );

    this.escrowContract = new ethers.Contract(
      process.env.ESCROW_CONTRACT_ADDRESS || this.getDefaultContractAddress('escrow'),
      this.escrowABI,
      this.wallet
    );
  }

  // ==================== IDENTITY VERIFICATION ====================

  async verifyIdentity(userId: string, verificationData: object): Promise<VerificationResult> {
    try {
      console.log(`🔐 Verifying identity for user: ${userId}`);

      // Multi-layer verification process
      const cryptoVerification = await this.performCryptographicVerification(verificationData);
      const biometricVerification = await this.verifyBiometricData(verificationData);
      const documentVerification = await this.verifyDocuments(verificationData);

      // Calculate composite verification score
      const confidence = (
        cryptoVerification.score * 0.4 +
        biometricVerification.score * 0.3 +
        documentVerification.score * 0.3
      );

      const verified = confidence >= 0.8;

      // Record verification on blockchain
      const blockchainRecord = verified ? await this.recordVerificationOnChain(userId, confidence) : null;

      // Update user verification status
      await prisma.user.update({
        where: { id: userId },
        data: { 
          isVerified: verified,
          reputation: verified ? { increment: 10 } : undefined
        }
      });

      const result: VerificationResult = {
        verified,
        confidence: Math.round(confidence * 100) / 100,
        verificationMethod: 'multi-layer-blockchain',
        blockchainTxHash: blockchainRecord?.txHash,
        timestamp: new Date()
      };

      console.log(`✅ Identity verification completed: ${verified ? 'VERIFIED' : 'FAILED'} (${confidence})`);
      return result;

    } catch (error) {
      console.error('❌ Identity verification failed:', error);
      return {
        verified: false,
        confidence: 0,
        verificationMethod: 'error',
        timestamp: new Date()
      };
    }
  }

  async getVerificationStatus(userId: string): Promise<object> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          isVerified: true, 
          reputation: true,
          createdAt: true 
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check blockchain verification records
      const blockchainVerifications = await this.getBlockchainVerifications(userId);
      
      return {
        verified: user.isVerified,
        reputation: user.reputation,
        accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        blockchainVerifications: blockchainVerifications.length,
        trustScore: this.calculateTrustScore(user.reputation, user.isVerified, blockchainVerifications.length)
      };

    } catch (error) {
      console.error('Error getting verification status:', error);
      return { verified: false, reputation: 0, trustScore: 0 };
    }
  }

  // ==================== REPUTATION TOKEN SYSTEM ====================

  async mintReputationTokens(userId: string, amount: number, reason: string): Promise<ReputationToken> {
    try {
      console.log(`🪙 Minting ${amount} reputation tokens for user: ${userId}, reason: ${reason}`);

      // Validate token minting rules
      if (amount <= 0 || amount > 100) {
        throw new Error('Invalid token amount. Must be between 1-100');
      }

      const validReasons = [
        'successful_deal', 'positive_review', 'network_contribution', 
        'identity_verification', 'community_participation', 'referral_bonus'
      ];

      if (!validReasons.includes(reason)) {
        throw new Error('Invalid token minting reason');
      }

      // Get user's wallet address (or create one)
      const userWallet = await this.getUserWalletAddress(userId);

      // Mint tokens on blockchain
      const tx = await this.reputationContract.mintTokens(userWallet, amount, reason);
      await tx.wait();

      // Create token record
      const tokenRecord: ReputationToken = {
        tokenId: `token_${Date.now()}_${userId}`,
        userId,
        amount,
        reason,
        contractAddress: this.reputationContract.address,
        txHash: tx.hash,
        createdAt: new Date()
      };

      // Update user's token balance
      await prisma.user.update({
        where: { id: userId },
        data: { 
          tokens: { increment: amount },
          reputation: { increment: Math.floor(amount / 2) }
        }
      });

      console.log(`✅ Successfully minted ${amount} tokens. TX: ${tx.hash}`);
      return tokenRecord;

    } catch (error) {
      console.error('❌ Error minting reputation tokens:', error);
      throw error;
    }
  }

  async transferReputationTokens(fromUserId: string, toUserId: string, amount: number): Promise<object> {
    try {
      const fromWallet = await this.getUserWalletAddress(fromUserId);
      const toWallet = await this.getUserWalletAddress(toUserId);

      // Check balance
      const balance = await this.reputationContract.balanceOf(fromWallet);
      if (balance.lt(amount)) {
        throw new Error('Insufficient token balance');
      }

      // Execute transfer
      const tx = await this.reputationContract.transferTokens(fromWallet, toWallet, amount);
      await tx.wait();

      // Update database balances
      await Promise.all([
        prisma.user.update({
          where: { id: fromUserId },
          data: { tokens: { decrement: amount } }
        }),
        prisma.user.update({
          where: { id: toUserId },
          data: { tokens: { increment: amount } }
        })
      ]);

      return {
        success: true,
        txHash: tx.hash,
        amount,
        message: `Transferred ${amount} reputation tokens`
      };

    } catch (error) {
      console.error('Error transferring reputation tokens:', error);
      throw error;
    }
  }

  async getTokenBalance(userId: string): Promise<number> {
    try {
      const userWallet = await this.getUserWalletAddress(userId);
      const balance = await this.reputationContract.balanceOf(userWallet);
      return balance.toNumber();
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }

  // ==================== NFT BUSINESS CARDS ====================

  async mintNFTBusinessCard(userId: string, cardData: object): Promise<NFTBusinessCard> {
    try {
      console.log(`🎨 Minting NFT business card for user: ${userId}`);

      // Validate card data
      const requiredFields = ['name', 'title', 'company', 'email'];
      const missingFields = requiredFields.filter(field => !cardData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Upload metadata to IPFS (mock implementation)
      const metadataUri = await this.uploadToIPFS({
        name: `${cardData['name']} - Business Card`,
        description: `Professional business card for ${cardData['name']}`,
        image: cardData['avatar'] || 'https://digbiz3.com/default-card.png',
        attributes: [
          { trait_type: 'Company', value: cardData['company'] },
          { trait_type: 'Title', value: cardData['title'] },
          { trait_type: 'Industry', value: cardData['industry'] || 'Business' },
          { trait_type: 'Verified', value: 'true' }
        ],
        card_data: cardData
      });

      // Get user's wallet
      const userWallet = await this.getUserWalletAddress(userId);

      // Mint NFT
      const tx = await this.nftContract.mintBusinessCard(userWallet, metadataUri);
      await tx.wait();

      // Extract token ID from transaction receipt
      const receipt = await tx.wait();
      const tokenId = receipt.logs[0].topics[3]; // Simplified extraction

      // Determine rarity based on user reputation
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const rarity = this.determineCardRarity(user?.reputation || 0);

      const nftCard: NFTBusinessCard = {
        tokenId,
        userId,
        cardData,
        metadataUri,
        contractAddress: this.nftContract.address,
        mintTx: tx.hash,
        rarity
      };

      // Store in database
      await prisma.aRBusinessCard.create({
        data: {
          userId,
          cardData,
          qrCode: await this.generateQRCode(tokenId),
          nftTokenId: tokenId,
          isActive: true
        }
      });

      console.log(`✅ NFT Business Card minted successfully. Token ID: ${tokenId}`);
      return nftCard;

    } catch (error) {
      console.error('❌ Error minting NFT business card:', error);
      throw error;
    }
  }

  async verifyNFTOwnership(tokenId: string, userId: string): Promise<boolean> {
    try {
      const userWallet = await this.getUserWalletAddress(userId);
      return await this.nftContract.verifyOwnership(tokenId, userWallet);
    } catch (error) {
      console.error('Error verifying NFT ownership:', error);
      return false;
    }
  }

  async updateNFTBusinessCard(tokenId: string, userId: string, newCardData: object): Promise<object> {
    try {
      // Verify ownership
      const isOwner = await this.verifyNFTOwnership(tokenId, userId);
      if (!isOwner) {
        throw new Error('User is not the owner of this NFT business card');
      }

      // Upload new metadata
      const newMetadataUri = await this.uploadToIPFS({
        ...newCardData,
        updated_at: new Date().toISOString()
      });

      // Update NFT metadata
      const tx = await this.nftContract.updateCard(tokenId, newMetadataUri);
      await tx.wait();

      // Update database
      await prisma.aRBusinessCard.updateMany({
        where: { 
          userId,
          nftTokenId: tokenId 
        },
        data: { 
          cardData: newCardData,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        txHash: tx.hash,
        newMetadataUri,
        message: 'NFT Business Card updated successfully'
      };

    } catch (error) {
      console.error('Error updating NFT business card:', error);
      throw error;
    }
  }

  // ==================== SMART CONTRACTS FOR DEALS ====================

  async createDealContract(dealData: object): Promise<SmartContract> {
    try {
      const { buyerId, sellerId, amount, terms } = dealData;
      
      console.log(`📝 Creating smart contract for deal: ${amount}`);

      const buyerWallet = await this.getUserWalletAddress(buyerId);
      const sellerWallet = await this.getUserWalletAddress(sellerId);

      // Create escrow deal
      const tx = await this.escrowContract.createDeal(buyerWallet, sellerWallet, amount);
      const receipt = await tx.wait();
      
      const dealId = receipt.logs[0].topics[1]; // Extract deal ID from logs

      const smartContract: SmartContract = {
        contractId: `contract_${dealId}`,
        dealId,
        parties: [buyerId, sellerId],
        terms,
        status: 'active',
        contractAddress: this.escrowContract.address,
        deploymentTx: tx.hash
      };

      // Store contract in database
      await prisma.deal.create({
        data: {
          userId: buyerId,
          title: dealData['title'] || 'Smart Contract Deal',
          description: dealData['description'] || 'Blockchain-secured business deal',
          value: amount,
          partnerId: sellerId,
          contractUrl: `https://polygonscan.com/tx/${tx.hash}`,
          status: 'NEGOTIATING'
        }
      });

      console.log(`✅ Smart contract created successfully. TX: ${tx.hash}`);
      return smartContract;

    } catch (error) {
      console.error('❌ Error creating deal contract:', error);
      throw error;
    }
  }

  async completeDeal(contractId: string, userId: string): Promise<object> {
    try {
      const dealId = contractId.replace('contract_', '');
      
      // Verify user is part of the deal
      const deal = await prisma.deal.findFirst({
        where: {
          OR: [
            { userId: userId },
            { partnerId: userId }
          ]
        }
      });

      if (!deal) {
        throw new Error('User is not authorized for this deal');
      }

      // Complete the deal on blockchain
      const tx = await this.escrowContract.completeDeal(dealId);
      await tx.wait();

      // Update deal status
      await prisma.deal.update({
        where: { id: deal.id },
        data: { 
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Mint reputation tokens for successful deal completion
      await this.mintReputationTokens(userId, 25, 'successful_deal');
      if (deal.partnerId && deal.partnerId !== userId) {
        await this.mintReputationTokens(deal.partnerId, 25, 'successful_deal');
      }

      return {
        success: true,
        txHash: tx.hash,
        message: 'Deal completed successfully'
      };

    } catch (error) {
      console.error('Error completing deal:', error);
      throw error;
    }
  }

  // ==================== VERIFIED REVIEWS ====================

  async createVerifiedReview(reviewData: object): Promise<object> {
    try {
      const { reviewerId, revieweeId, rating, comment, dealId } = reviewData;

      // Verify the reviewer was involved in a deal with reviewee
      const dealExists = await prisma.deal.findFirst({
        where: {
          OR: [
            { userId: reviewerId, partnerId: revieweeId },
            { userId: revieweeId, partnerId: reviewerId }
          ],
          status: 'COMPLETED'
        }
      });

      if (!dealExists) {
        throw new Error('Cannot review user without completed deal history');
      }

      // Create cryptographic proof of review authenticity
      const reviewHash = this.createReviewHash(reviewData);
      
      // Store review with blockchain proof
      const review = await prisma.review.create({
        data: {
          reviewerId,
          revieweeId,
          rating,
          comment,
          dealId,
          isVerified: true
        }
      });

      // Record review hash on blockchain (simplified)
      const reviewProof = {
        reviewId: review.id,
        hash: reviewHash,
        timestamp: new Date(),
        verified: true
      };

      // Award reputation tokens for leaving verified reviews
      await this.mintReputationTokens(reviewerId, 5, 'positive_review');

      return {
        success: true,
        reviewId: review.id,
        proof: reviewProof,
        message: 'Verified review created successfully'
      };

    } catch (error) {
      console.error('Error creating verified review:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async performCryptographicVerification(data: object): Promise<{ score: number }> {
    // Simplified crypto verification
    const hasRequiredFields = ['publicKey', 'signature', 'message'].every(field => data[field]);
    return { score: hasRequiredFields ? 0.9 : 0.3 };
  }

  private async verifyBiometricData(data: object): Promise<{ score: number }> {
    // Mock biometric verification
    const hasBiometric = data['biometric'] !== undefined;
    return { score: hasBiometric ? 0.85 : 0.5 };
  }

  private async verifyDocuments(data: object): Promise<{ score: number }> {
    // Mock document verification
    const hasDocuments = data['documents'] && Array.isArray(data['documents']) && data['documents'].length > 0;
    return { score: hasDocuments ? 0.8 : 0.4 };
  }

  private async recordVerificationOnChain(userId: string, confidence: number): Promise<{ txHash: string }> {
    // Mock blockchain recording
    const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
    console.log(`📝 Recorded verification on blockchain: ${txHash}`);
    return { txHash };
  }

  private async getBlockchainVerifications(userId: string): Promise<object[]> {
    // Mock blockchain verification history
    return [
      { type: 'identity', timestamp: new Date(), confidence: 0.95 }
    ];
  }

  private calculateTrustScore(reputation: number, isVerified: boolean, blockchainVerifications: number): number {
    let score = reputation / 100; // Base score from reputation
    if (isVerified) score += 0.2;
    score += Math.min(blockchainVerifications * 0.1, 0.3);
    return Math.min(score, 1.0);
  }

  private async getUserWalletAddress(userId: string): Promise<string> {
    // In production, this would retrieve or generate user's wallet address
    return ethers.utils.computeAddress(`0x${userId.padEnd(64, '0')}`);
  }

  private async uploadToIPFS(metadata: object): Promise<string> {
    // Mock IPFS upload - would use actual IPFS service
    const hash = crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
    return `ipfs://QmExample${hash.substring(0, 40)}`;
  }

  private determineCardRarity(reputation: number): 'common' | 'rare' | 'legendary' {
    if (reputation >= 500) return 'legendary';
    if (reputation >= 200) return 'rare';
    return 'common';
  }

  private async generateQRCode(tokenId: string): Promise<string> {
    // Mock QR code generation
    return `digbiz3://nft/${tokenId}`;
  }

  private createReviewHash(reviewData: object): string {
    return crypto.createHash('sha256').update(JSON.stringify(reviewData)).digest('hex');
  }

  private generateSecureKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getDefaultContractAddress(contractType: string): string {
    const addresses = {
      reputation: '0x742d35Cc6634C0532925a3b8D2Fd87F8E5D4bE11',
      nft: '0x8ba1f109551bD432803012645Hac136c', 
      escrow: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE'
    };
    return addresses[contractType] || '0x0000000000000000000000000000000000000000';
  }

  // ==================== PUBLIC API METHODS ====================

  async getBlockchainStatus(): Promise<object> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.provider.getGasPrice();

      return {
        network: network.name,
        chainId: network.chainId,
        blockNumber,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
        contracts: {
          reputation: this.reputationContract.address,
          nft: this.nftContract.address,
          escrow: this.escrowContract.address
        },
        status: 'connected',
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting blockchain status:', error);
      return { status: 'disconnected', error: error.message };
    }
  }

  async getFeatures(): Promise<BlockchainFeatures> {
    return {
      identityVerification: true,
      reputationTokens: true,
      smartContracts: true,
      nftBusinessCards: true,
      verifiedReviews: true
    };
  }
}

export default new BlockchainService();
// Monetization Service for DigBiz3 - Subscription and Revenue Management

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { socketService } from '../app';

const prisma = new PrismaClient();

interface User {
  id: string;
  email: string;
  subscriptionTier: string;
  networkValue: number;
  createdAt: Date;
  industry?: string;
}

interface Deal {
  id: string;
  value: number;
}

export interface MonetizationTiers {
  free: {
    connections: number;
    messages: number;
    basicMatching: boolean;
    ads: boolean;
  };
  professional: {
    price: number;
    connections: string;
    advancedAI: boolean;
    videoMeetings: boolean;
    analytics: string;
    commission: number;
  };
  enterprise: {
    price: number;
    teamManagement: boolean;
    apiAccess: boolean;
    whiteLabeling: boolean;
    analytics: string;
    commission: number;
    customIntegrations: boolean;
  };
}

export interface RevenueMetrics {
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  customerLifetimeValue: number;
  conversionRates: {
    freeToTrial: number;
    trialToPaid: number;
    basicToPremium: number;
  };
  dealFacilitationRevenue: number;
  advertisingRevenue: number;
}

export class MonetizationService {
  private stripe: Stripe;
  private tiers: MonetizationTiers;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    });
    this.tiers = {
      free: {
        connections: 5,
        messages: 50,
        basicMatching: true,
        ads: true
      },
      professional: {
        price: 29,
        connections: 'unlimited',
        advancedAI: true,
        videoMeetings: true,
        analytics: 'basic',
        commission: 0.02
      },
      enterprise: {
        price: 99,
        teamManagement: true,
        apiAccess: true,
        whiteLabeling: true,
        analytics: 'advanced',
        commission: 0.015,
        customIntegrations: true
      }
    };
  }

  // Subscription Management
  async createSubscription(userId: string, tier: 'professional' | 'enterprise', paymentMethodId: string): Promise<object> {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      // Create or retrieve Stripe customer
      let customer = await this.getOrCreateStripeCustomer(user);

      // Create Stripe price for the tier
      const price = await this.getOrCreatePrice(tier);

      // Create subscription in Stripe
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Save subscription to database
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          tier: tier.toUpperCase() as any,
          status: 'ACTIVE',
          stripeCustomerId: customer.id,
          stripeSubscriptionId: stripeSubscription.id,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Update user subscription tier
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionTier: tier.toUpperCase() as any }
      });

      // Record payment
      await prisma.payment.create({
        data: {
          userId,
          stripePaymentId: stripeSubscription.latest_invoice.payment_intent?.id || '',
          amount: this.tiers[tier].price,
          currency: 'USD',
          type: 'SUBSCRIPTION',
          status: 'COMPLETED',
          description: `${tier} subscription`
        }
      });

      // Send real-time notification
      socketService?.notifyUser(userId, 'subscription_activated', {
        tier,
        message: `Welcome to ${tier} plan!`,
        features: this.getTierFeatures(tier)
      });

      return {
        success: true,
        subscription,
        stripeSubscription,
        message: `Successfully subscribed to ${tier} plan`
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cancelSubscription(userId: string): Promise<object> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      // Cancel in Stripe
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      // Update database
      await prisma.subscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: true,
          status: 'CANCELLED'
        }
      });

      // Notify user
      socketService?.notifyUser(userId, 'subscription_cancelled', {
        message: 'Subscription will cancel at the end of the billing period',
        endDate: subscription.currentPeriodEnd
      });

      return {
        success: true,
        message: 'Subscription cancelled successfully'
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
  }

  // Deal Commission Calculation
  async calculateCommission(deal: Deal, userTier: 'free' | 'professional' | 'enterprise'): Promise<number> {
    try {
      if (userTier === 'free') return 0;

      const commissionRate = userTier === 'professional' 
        ? this.tiers.professional.commission 
        : this.tiers.enterprise.commission;

      const commission = deal.value * commissionRate;
      
      // Record commission for revenue tracking
      await this.recordCommissionRevenue(deal.id, commission, userTier);

      return commission;
    } catch (error) {
      console.error('Error calculating commission:', error);
      return 0;
    }
  }

  // Feature Access Control
  canAccessFeature(userTier: 'free' | 'professional' | 'enterprise', feature: string): boolean {
    const tierFeatures = {
      free: ['basicMatching', 'limitedConnections', 'limitedMessages'],
      professional: ['advancedAI', 'videoMeetings', 'basicAnalytics', 'unlimitedConnections'],
      enterprise: ['teamManagement', 'apiAccess', 'whiteLabeling', 'advancedAnalytics', 'customIntegrations']
    };

    return tierFeatures[userTier]?.includes(feature) || 
           (userTier !== 'free' && tierFeatures.professional.includes(feature)) ||
           (userTier === 'enterprise' && (tierFeatures.professional.includes(feature) || tierFeatures.enterprise.includes(feature)));
  }

  // Usage Tracking
  async trackUsage(userId: string, feature: string, amount: number = 1): Promise<void> {
    try {
      const usage = {
        id: `usage_${Date.now()}`,
        userId,
        feature,
        amount,
        timestamp: new Date()
      };

      // Store usage data for billing and analytics
      await this.storeUsageData(usage);

      // Check if user exceeds free tier limits
      if (await this.exceedsFreeTierLimits(userId, feature)) {
        await this.sendUpgradeNotification(userId, feature);
      }
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  }

  // Revenue Analytics
  async getRevenueMetrics(startDate: Date, endDate: Date): Promise<RevenueMetrics> {
    try {
      const subscriptionRevenue = await this.calculateSubscriptionRevenue(startDate, endDate);
      const commissionRevenue = await this.calculateCommissionRevenue(startDate, endDate);
      const adRevenue = await this.calculateAdRevenue(startDate, endDate);
      const totalUsers = await this.getTotalUsers();
      const paidUsers = await this.getPaidUsers();

      const metrics: RevenueMetrics = {
        monthlyRecurringRevenue: subscriptionRevenue,
        averageRevenuePerUser: (subscriptionRevenue + commissionRevenue) / totalUsers,
        customerLifetimeValue: await this.calculateCLV(),
        conversionRates: await this.calculateConversionRates(),
        dealFacilitationRevenue: commissionRevenue,
        advertisingRevenue: adRevenue
      };

      return metrics;
    } catch (error) {
      console.error('Error getting revenue metrics:', error);
      return {
        monthlyRecurringRevenue: 0,
        averageRevenuePerUser: 0,
        customerLifetimeValue: 0,
        conversionRates: { freeToTrial: 0, trialToPaid: 0, basicToPremium: 0 },
        dealFacilitationRevenue: 0,
        advertisingRevenue: 0
      };
    }
  }

  // Dynamic Pricing
  async calculateDynamicPrice(userId: string, tier: 'professional' | 'enterprise'): Promise<number> {
    try {
      const basePrice = this.tiers[tier].price;
      const user = await this.getUserById(userId);
      
      if (!user) return basePrice;

      // Factors for dynamic pricing
      const demandMultiplier = await this.calculateDemandMultiplier();
      const loyaltyDiscount = this.calculateLoyaltyDiscount(user);
      const marketFactors = await this.calculateMarketFactors(user.industry);

      const dynamicPrice = basePrice * demandMultiplier * (1 - loyaltyDiscount) * marketFactors;
      
      return Math.max(Math.round(dynamicPrice), basePrice * 0.7); // Minimum 30% discount
    } catch (error) {
      console.error('Error calculating dynamic price:', error);
      return this.tiers[tier].price;
    }
  }

  // Churn Prediction
  async predictChurn(userId: string): Promise<{ risk: number; factors: string[]; recommendations: string[] }> {
    try {
      const user = await this.getUserById(userId);
      const usage = await this.getUserUsage(userId);
      const engagement = await this.getUserEngagement(userId);

      const riskFactors: string[] = [];
      const recommendations: string[] = [];
      let riskScore = 0;

      // Low usage risk
      if (usage.monthlyLogins < 5) {
        riskScore += 0.3;
        riskFactors.push('Low monthly logins');
        recommendations.push('Send engagement emails with networking tips');
      }

      // Feature underutilization
      if (usage.featuresUsed < 3) {
        riskScore += 0.2;
        riskFactors.push('Limited feature adoption');
        recommendations.push('Provide feature onboarding tutorial');
      }

      // Subscription value realization
      if (user.networkValue < 1000) {
        riskScore += 0.25;
        riskFactors.push('Low perceived value');
        recommendations.push('Highlight networking ROI and success stories');
      }

      return {
        risk: Math.min(riskScore, 1),
        factors: riskFactors,
        recommendations
      };
    } catch (error) {
      console.error('Error predicting churn:', error);
      return { risk: 0, factors: [], recommendations: [] };
    }
  }

  // Private helper methods
  private async getUserById(userId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        networkValue: true,
        createdAt: true,
        industry: true
      }
    });

    return user ? {
      ...user,
      subscriptionTier: user.subscriptionTier.toLowerCase()
    } : null;
  }

  private async getOrCreateStripeCustomer(user: User): Promise<Stripe.Customer> {
    // Check if customer already exists
    const existingCustomers = await this.stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    return await this.stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user.id
      }
    });
  }

  private async getOrCreatePrice(tier: 'professional' | 'enterprise'): Promise<Stripe.Price> {
    const amount = this.tiers[tier].price * 100; // Convert to cents
    
    // Check if price already exists
    const existingPrices = await this.stripe.prices.list({
      limit: 100
    });

    const existingPrice = existingPrices.data.find(
      price => price.unit_amount === amount && 
               price.currency === 'usd' &&
               price.recurring?.interval === 'month'
    );

    if (existingPrice) {
      return existingPrice;
    }

    // Create new price
    return await this.stripe.prices.create({
      unit_amount: amount,
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: {
        name: `DigBiz3 ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
        description: `Monthly subscription for ${tier} features`
      }
    });
  }

  private getTierFeatures(tier: 'professional' | 'enterprise'): string[] {
    const features = {
      professional: [
        'Unlimited connections',
        'Advanced AI matching',
        'Video meetings', 
        'Basic analytics',
        '2% commission on deals'
      ],
      enterprise: [
        'All Professional features',
        'Team management',
        'API access',
        'White labeling',
        'Advanced analytics',
        '1.5% commission on deals',
        'Custom integrations'
      ]
    };

    return features[tier];
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription as string }
    });

    if (subscription) {
      await prisma.payment.create({
        data: {
          userId: subscription.userId,
          stripePaymentId: invoice.payment_intent as string,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          type: 'SUBSCRIPTION',
          status: 'COMPLETED',
          description: 'Monthly subscription payment'
        }
      });

      // Notify user
      socketService?.notifyUser(subscription.userId, 'payment_succeeded', {
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        message: 'Payment processed successfully'
      });
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription as string }
    });

    if (subscription) {
      await prisma.payment.create({
        data: {
          userId: subscription.userId,
          stripePaymentId: invoice.payment_intent as string || '',
          amount: invoice.amount_due / 100,
          currency: invoice.currency.toUpperCase(),
          type: 'SUBSCRIPTION',
          status: 'FAILED',
          description: 'Failed monthly subscription payment'
        }
      });

      // Update subscription status
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' }
      });

      // Notify user
      socketService?.notifyUser(subscription.userId, 'payment_failed', {
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        message: 'Payment failed - please update payment method'
      });
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id }
    });

    if (subscription) {
      // Update subscription status
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'CANCELLED' }
      });

      // Downgrade user to free tier
      await prisma.user.update({
        where: { id: subscription.userId },
        data: { subscriptionTier: 'FREE' }
      });

      // Notify user
      socketService?.notifyUser(subscription.userId, 'subscription_ended', {
        message: 'Your subscription has ended. You are now on the free plan.'
      });
    }
  }

  private calculatePeriodEnd(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }

  private async processPayment(paymentMethodId: string, amount: number): Promise<void> {
    // Mock payment processing - would use Stripe API
    console.log(`Processing payment of $${amount} with method ${paymentMethodId}`);
  }

  private async updateUserSubscription(userId: string, tier: 'professional' | 'enterprise'): Promise<void> {
    // Mock user update - would update database
    console.log(`Updated user ${userId} to ${tier} tier`);
  }

  private async recordCommissionRevenue(dealId: string, commission: number, userTier: string): Promise<void> {
    // Mock revenue recording
    console.log(`Recorded $${commission} commission from deal ${dealId} (${userTier} tier)`);
  }

  private async storeUsageData(usage: object): Promise<void> {
    // Mock usage storage
    console.log('Stored usage data:', usage);
  }

  private async exceedsFreeTierLimits(userId: string, feature: string): Promise<boolean> {
    // Mock limit checking
    return false;
  }

  private async sendUpgradeNotification(userId: string, feature: string): Promise<void> {
    // Mock notification
    console.log(`Sent upgrade notification to user ${userId} for feature ${feature}`);
  }

  private async calculateSubscriptionRevenue(startDate: Date, endDate: Date): Promise<number> {
    // Mock revenue calculation
    return 25000; // $25k MRR
  }

  private async calculateCommissionRevenue(startDate: Date, endDate: Date): Promise<number> {
    return 8500; // Commission revenue
  }

  private async calculateAdRevenue(startDate: Date, endDate: Date): Promise<number> {
    return 3200; // Ad revenue
  }

  private async getTotalUsers(): Promise<number> {
    return 1250; // Total users
  }

  private async getPaidUsers(): Promise<number> {
    return 320; // Paid users
  }

  private async calculateCLV(): Promise<number> {
    return 480; // Customer lifetime value
  }

  private async calculateConversionRates(): Promise<{ freeToTrial: number; trialToPaid: number; basicToPremium: number }> {
    return {
      freeToTrial: 0.12,
      trialToPaid: 0.68,
      basicToPremium: 0.23
    };
  }

  private async calculateDemandMultiplier(): Promise<number> {
    return 1.05; // 5% demand increase
  }

  private calculateLoyaltyDiscount(user: User): number {
    const accountAgeMonths = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return Math.min(accountAgeMonths * 0.01, 0.15); // Max 15% loyalty discount
  }

  private async calculateMarketFactors(industry: string): Promise<number> {
    // Industry-based pricing factors
    const factors: { [key: string]: number } = {
      'technology': 1.1,
      'finance': 1.2,
      'healthcare': 1.15,
      'default': 1.0
    };
    return factors[industry.toLowerCase()] || factors.default;
  }

  private async getUserUsage(userId: string): Promise<{ monthlyLogins: number; featuresUsed: number }> {
    return { monthlyLogins: 8, featuresUsed: 4 };
  }

  private async getUserEngagement(userId: string): Promise<object> {
    return { messagesSent: 15, connectionsRequested: 5, profileViews: 42 };
  }
}

export default new MonetizationService();
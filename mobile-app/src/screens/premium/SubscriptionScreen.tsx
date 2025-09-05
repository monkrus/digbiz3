import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Redux
import { useAppSelector } from '../../store';
import { useSubscribeMutation } from '../../store/api/apiSlice';
import { useAuth } from '../../hooks/useAuth';

// Constants
import { COLORS, FONTS, SPACING, SHADOWS, SUBSCRIPTION_THEMES } from '../../constants/theme';

interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  popular?: boolean;
  features: PlanFeature[];
  color: string;
  icon: string;
  description: string;
}

const SubscriptionScreen: React.FC = () => {
  const { user, getSubscriptionInfo } = useAuth();
  const { subscriptionPlans } = useAppSelector((state) => state.premium);
  const [subscribe, { isLoading }] = useSubscribeMutation();
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const currentSubscription = getSubscriptionInfo();

  const enhancedPlans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      description: 'Perfect for getting started with basic networking',
      features: [
        { text: '5 connections per month', included: true },
        { text: '50 messages per month', included: true },
        { text: 'Basic profile', included: true },
        { text: 'Simple matching', included: true },
        { text: 'Advanced AI matching', included: false },
        { text: 'Video meetings', included: false },
        { text: 'Analytics dashboard', included: false },
        { text: 'AR business cards', included: false },
        { text: 'Deal facilitation', included: false },
        { text: 'Market intelligence', included: false },
      ],
      color: COLORS.gray500,
      icon: '🆓',
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 29,
      popular: true,
      description: 'Advanced AI-powered networking for professionals',
      features: [
        { text: 'Unlimited connections', included: true, highlight: true },
        { text: 'Unlimited messages', included: true, highlight: true },
        { text: 'Advanced AI matching', included: true, highlight: true },
        { text: 'Video meeting rooms', included: true },
        { text: 'Basic analytics dashboard', included: true },
        { text: 'AR business card scanner', included: true },
        { text: 'Deal facilitation (2% commission)', included: true },
        { text: 'Market intelligence', included: true },
        { text: 'Priority support', included: true },
        { text: 'Team management', included: false },
      ],
      color: COLORS.primary,
      icon: '⭐',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99,
      description: 'Complete business networking solution for teams',
      features: [
        { text: 'All Professional features', included: true },
        { text: 'Team management (up to 50 users)', included: true, highlight: true },
        { text: 'API access & integrations', included: true, highlight: true },
        { text: 'White label options', included: true },
        { text: 'Advanced analytics & reporting', included: true },
        { text: 'Custom AI training', included: true },
        { text: 'Deal facilitation (1.5% commission)', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'SLA & premium support', included: true },
        { text: 'Custom integrations', included: true },
      ],
      color: COLORS.enterprise,
      icon: '💎',
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') {
      Alert.alert('Already on Free Plan', 'You are currently on the free plan.');
      return;
    }

    try {
      // In a real app, you'd integrate with Stripe or another payment processor
      Alert.alert(
        'Subscribe to ' + planId.charAt(0).toUpperCase() + planId.slice(1),
        'This would redirect to payment processing. For demo purposes, we\'ll simulate a successful subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: async () => {
              try {
                const result = await subscribe({
                  tier: planId.toUpperCase() as 'PROFESSIONAL' | 'ENTERPRISE',
                  paymentMethodId: 'demo_payment_method'
                }).unwrap();
                
                Alert.alert(
                  'Subscription Successful! 🎉',
                  `Welcome to ${planId.charAt(0).toUpperCase() + planId.slice(1)}! Your premium features are now active.`,
                  [{ text: 'Great!', onPress: () => {/* Navigate back */} }]
                );
              } catch (error) {
                Alert.alert('Subscription Failed', 'Please try again later.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Subscription error:', error);
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = user?.subscriptionTier?.toLowerCase() === plan.id;
    const isSelected = selectedPlan === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && { borderColor: plan.color, borderWidth: 2 },
          isCurrentPlan && { backgroundColor: COLORS.gray50 }
        ]}
        onPress={() => setSelectedPlan(plan.id)}
        activeOpacity={0.8}
      >
        {plan.popular && (
          <View style={styles.popularBadge}>
            <LinearGradient
              colors={[COLORS.secondary, COLORS.warning]}
              style={styles.popularGradient}
            >
              <Text style={styles.popularText}>Most Popular</Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.planHeader}>
          <View style={styles.planIconContainer}>
            <Text style={styles.planIcon}>{plan.icon}</Text>
          </View>
          
          <View style={styles.planTitleContainer}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            ${plan.price}
            <Text style={styles.priceUnit}>/month</Text>
          </Text>
          {plan.price > 0 && (
            <Text style={styles.priceNote}>Billed monthly</Text>
          )}
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons
                name={feature.included ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={feature.included ? COLORS.accent : COLORS.gray400}
              />
              <Text
                style={[
                  styles.featureText,
                  !feature.included && { color: COLORS.gray400 },
                  feature.highlight && { fontFamily: FONTS.bold, color: plan.color }
                ]}
              >
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            isCurrentPlan
              ? { backgroundColor: COLORS.gray300 }
              : { backgroundColor: plan.color }
          ]}
          onPress={() => handleSubscribe(plan.id)}
          disabled={isCurrentPlan || isLoading}
        >
          {isLoading && selectedPlan === plan.id ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.selectButtonText}>
              {isCurrentPlan ? 'Current Plan' : `Choose ${plan.name}`}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Choose Your Plan</Text>
          <Text style={styles.headerSubtitle}>
            Unlock powerful AI networking features
          </Text>
        </LinearGradient>
      </View>

      {/* Current Subscription Info */}
      {currentSubscription && (
        <View style={styles.currentPlanContainer}>
          <Text style={styles.currentPlanTitle}>Current Plan</Text>
          <View style={styles.currentPlanInfo}>
            <Text style={styles.currentPlanIcon}>{currentSubscription.icon}</Text>
            <View style={styles.currentPlanDetails}>
              <Text style={styles.currentPlanName}>{currentSubscription.name}</Text>
              <Text style={styles.currentPlanFeatures}>
                {currentSubscription.features.slice(0, 2).join(' • ')}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Plans */}
      <View style={styles.plansContainer}>
        {enhancedPlans.map(renderPlanCard)}
      </View>

      {/* Benefits Section */}
      <View style={styles.benefitsSection}>
        <Text style={styles.benefitsTitle}>Why Choose DigBiz3 Premium?</Text>
        
        <View style={styles.benefitItem}>
          <View style={[styles.benefitIcon, { backgroundColor: COLORS.primary }]}>
            <Ionicons name="brain" size={20} color="white" />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>AI-Powered Matching</Text>
            <Text style={styles.benefitDescription}>
              Our advanced AI analyzes compatibility, shared interests, and business goals to find your perfect networking matches.
            </Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <View style={[styles.benefitIcon, { backgroundColor: COLORS.accent }]}>
            <Ionicons name="trending-up" size={20} color="white" />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Revenue Tracking</Text>
            <Text style={styles.benefitDescription}>
              Track deals, commissions, and ROI from your networking activities with detailed analytics and insights.
            </Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <View style={[styles.benefitIcon, { backgroundColor: COLORS.cyber }]}>
            <Ionicons name="cube" size={20} color="white" />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>AR & VR Networking</Text>
            <Text style={styles.benefitDescription}>
              Experience the future of networking with AR business cards and immersive virtual meeting rooms.
            </Text>
          </View>
        </View>
      </View>

      {/* FAQ Section */}
      <View style={styles.faqSection}>
        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
        
        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Can I cancel my subscription anytime?</Text>
          <Text style={styles.faqAnswer}>
            Yes, you can cancel your subscription at any time. You'll continue to have access to premium features until the end of your billing period.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>How does the deal commission work?</Text>
          <Text style={styles.faqAnswer}>
            When you facilitate deals through our platform, we take a small commission (2% for Professional, 1.5% for Enterprise) only on successful completed deals.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Is there a free trial?</Text>
          <Text style={styles.faqAnswer}>
            Your free account gives you access to basic features. Upgrade anytime to unlock premium AI features and unlimited networking capabilities.
          </Text>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  headerGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS['2xl'],
    fontFamily: FONTS.bold,
    color: 'white',
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONTS.base,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  currentPlanContainer: {
    margin: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: 'white',
    borderRadius: 16,
    ...SHADOWS.md,
  },
  currentPlanTitle: {
    fontSize: FONTS.base,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  currentPlanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPlanIcon: {
    fontSize: FONTS.xl,
    marginRight: SPACING.md,
  },
  currentPlanDetails: {
    flex: 1,
  },
  currentPlanName: {
    fontSize: FONTS.lg,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  currentPlanFeatures: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  plansContainer: {
    padding: SPACING.lg,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  popularGradient: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  popularText: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.bold,
    color: 'white',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  planIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  planIcon: {
    fontSize: FONTS.xl,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: FONTS.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  planDescription: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  price: {
    fontSize: FONTS['3xl'],
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  priceUnit: {
    fontSize: FONTS.base,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  priceNote: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  featuresContainer: {
    marginBottom: SPACING.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureText: {
    flex: 1,
    fontSize: FONTS.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
  selectButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: FONTS.base,
    fontFamily: FONTS.bold,
    color: 'white',
  },
  benefitsSection: {
    padding: SPACING.lg,
  },
  benefitsTitle: {
    fontSize: FONTS.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FONTS.base,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  benefitDescription: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  faqSection: {
    padding: SPACING.lg,
    backgroundColor: 'white',
  },
  faqTitle: {
    fontSize: FONTS.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  faqItem: {
    marginBottom: SPACING.lg,
  },
  faqQuestion: {
    fontSize: FONTS.base,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  faqAnswer: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
});

export default SubscriptionScreen;
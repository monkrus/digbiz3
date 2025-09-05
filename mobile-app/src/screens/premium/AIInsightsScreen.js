import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../../services/apiService';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';

export default function AIInsightsScreen({ navigation }) {
  const [insights, setInsights] = useState([]);
  const [networkValue, setNetworkValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marketTrends, setMarketTrends] = useState([]);

  useEffect(() => {
    loadAIInsights();
    loadNetworkValue();
    loadMarketTrends();
  }, []);

  const loadAIInsights = async () => {
    try {
      const response = await apiService.get('/v2/insights/opportunities');
      setInsights(response.data.opportunities || []);
    } catch (error) {
      console.error('Error loading AI insights:', error);
      // Mock data for demonstration
      setInsights([
        {
          id: 1,
          title: 'High-Value Connection Opportunity',
          description: 'AI detected potential partnership with Sarah Chen (VP Innovation) - 94% compatibility',
          confidence: 0.94,
          priority: 'high',
          type: 'opportunity',
          aiRecommendation: 'Schedule meeting this week for optimal timing',
          potentialValue: '$125K',
          estimatedRevenue: 125000
        },
        {
          id: 2,
          title: 'Market Expansion Opportunity',
          description: 'Growing demand for AI consulting in healthcare sector - your expertise match: 87%',
          confidence: 0.87,
          priority: 'medium',
          type: 'market_trend',
          aiRecommendation: 'Consider targeting healthcare startups in Q4',
          potentialValue: '$230K',
          estimatedRevenue: 230000
        },
        {
          id: 3,
          title: 'Network Gap Analysis',
          description: 'Missing key connections in fintech C-suite level. Expanding here could increase network value by 34%',
          confidence: 0.82,
          priority: 'high',
          type: 'network_analysis',
          aiRecommendation: 'Attend FinTech Summit next month',
          potentialValue: '$85K',
          estimatedRevenue: 85000
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadNetworkValue = async () => {
    try {
      const response = await apiService.get('/v2/analytics/network-value');
      setNetworkValue(response.data.networkValue || 0);
    } catch (error) {
      console.error('Error loading network value:', error);
      setNetworkValue(847500); // Mock value
    }
  };

  const loadMarketTrends = async () => {
    try {
      const response = await apiService.get('/v2/intelligence/market-trends?industry=technology');
      setMarketTrends(response.data.industryTrends || []);
    } catch (error) {
      console.error('Error loading market trends:', error);
      setMarketTrends([
        { trend: 'AI adoption acceleration', growth: '+67%', impact: 'high' },
        { trend: 'Remote work normalization', growth: '+23%', impact: 'medium' },
        { trend: 'Sustainability focus', growth: '+45%', impact: 'high' }
      ]);
    }
  };

  const handleInsightPress = (insight) => {
    Alert.alert(
      `${insight.title}`,
      `${insight.description}\n\nAI Recommendation: ${insight.aiRecommendation}\n\nConfidence: ${Math.round(insight.confidence * 100)}%`,
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Take Action', onPress: () => takeInsightAction(insight) },
      ]
    );
  };

  const takeInsightAction = (insight) => {
    Alert.alert('Action Taken', `Acting on: ${insight.title}\n\nThis would typically trigger relevant workflows like scheduling meetings, sending connection requests, or creating action items.`);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return COLORS.danger;
      case 'medium': return COLORS.warning;
      case 'low': return COLORS.success;
      default: return COLORS.textSecondary;
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'opportunity': return '🎯';
      case 'market_trend': return '📈';
      case 'network_analysis': return '🔍';
      case 'competitor': return '⚔️';
      default: return '💡';
    }
  };

  const InsightCard = ({ insight }) => (
    <TouchableOpacity 
      style={styles.insightCard}
      onPress={() => handleInsightPress(insight)}
    >
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{getInsightIcon(insight.type)}</Text>
        <View style={styles.insightTitleContainer}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={[styles.priorityBadge, { backgroundColor: getPriorityColor(insight.priority) }]}>
            {insight.priority.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.insightDescription}>{insight.description}</Text>
      
      <View style={styles.insightFooter}>
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>AI Confidence</Text>
          <Text style={styles.confidenceValue}>{Math.round(insight.confidence * 100)}%</Text>
        </View>
        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Potential Value</Text>
          <Text style={styles.valueAmount}>{insight.potentialValue}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🤖 AI analyzing your network...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Business Intelligence</Text>
          <Text style={styles.headerSubtitle}>Powered by advanced machine learning</Text>
          
          <View style={styles.networkValueContainer}>
            <Text style={styles.networkValueLabel}>Current Network Value</Text>
            <Text style={styles.networkValue}>${networkValue.toLocaleString()}</Text>
            <Text style={styles.networkGrowth}>+23% this month</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 AI-Generated Opportunities</Text>
          <Text style={styles.sectionSubtitle}>High-confidence business opportunities</Text>
          
          {insights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Market Intelligence</Text>
          <Text style={styles.sectionSubtitle}>Real-time industry trends</Text>
          
          {marketTrends.map((trend, index) => (
            <View key={index} style={styles.trendCard}>
              <Text style={styles.trendTitle}>{trend.trend}</Text>
              <View style={styles.trendMetrics}>
                <Text style={styles.trendGrowth}>{trend.growth}</Text>
                <Text style={[styles.trendImpact, { 
                  color: trend.impact === 'high' ? COLORS.success : COLORS.warning 
                }]}>
                  {trend.impact} impact
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Smart Matching', 'AI will analyze your goals and find optimal connection opportunities.')}
          >
            <Text style={styles.actionButtonText}>🎯 Find Smart Matches</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Deal Prediction', 'AI will analyze potential deals and predict success rates.')}
          >
            <Text style={styles.actionButtonText}>💼 Analyze Deal Opportunities</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Competitor Intelligence', 'AI monitoring your competitive landscape and opportunities.')}
          >
            <Text style={styles.actionButtonText}>⚔️ Competitor Analysis</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>✨ Premium AI Features</Text>
            <Text style={styles.premiumDescription}>
              Advanced machine learning algorithms analyze your network, market trends, and business opportunities to provide actionable intelligence.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: 'white',
    opacity: 0.9,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  networkValueContainer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
  },
  networkValueLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'white',
    opacity: 0.8,
  },
  networkValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: SPACING.xs,
  },
  networkGrowth: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  insightCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  insightIcon: {
    fontSize: FONT_SIZES.xl,
    marginRight: SPACING.md,
  },
  insightTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  insightTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: FONT_SIZES.xs,
    color: 'white',
    fontWeight: 'bold',
  },
  insightDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  confidenceContainer: {
    alignItems: 'flex-start',
  },
  confidenceLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  confidenceValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  valueAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  trendCard: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  trendMetrics: {
    alignItems: 'flex-end',
  },
  trendGrowth: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  trendImpact: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  premiumBadge: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  premiumText: {
    color: 'white',
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  premiumDescription: {
    color: 'white',
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 20,
  },
});
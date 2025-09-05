import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../store';
import { COLORS, FONTS } from '../../constants/theme';
import api from '../../services/apiService';

const { width, height } = Dimensions.get('window');

interface NetworkAnalytics {
  networkValue: number;
  growth: string;
  roi: number;
  totalConnections: number;
  activeConnections: number;
  dealsCompleted: number;
  totalRevenue: number;
  revenueGrowth: string;
  networkScore: number;
  industryRanking: string;
}

interface Connection {
  id: string;
  name: string;
  title: string;
  company: string;
  value: number;
  lastInteraction: string;
  status: 'active' | 'inactive' | 'pending';
}

const NetworkAnalyticsScreen: React.FC = () => {
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [topConnections, setTopConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

  const user = useAppSelector((state) => state.auth.user);

  const timeframes = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
    { label: '1 Year', value: '1y' }
  ];

  const fetchNetworkAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsResponse, connectionsResponse] = await Promise.all([
        api.get(`/v2/analytics/network-value?timeframe=${selectedTimeframe}`),
        api.get(`/v2/analytics/top-connections?limit=10`)
      ]);

      if (analyticsResponse.data.success) {
        setAnalytics(analyticsResponse.data.data);
      }

      if (connectionsResponse.data.success) {
        setTopConnections(connectionsResponse.data.data.connections || []);
      }
    } catch (error) {
      console.error('Error fetching network analytics:', error);
      Alert.alert('Error', 'Failed to load network analytics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNetworkAnalytics();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user?.subscriptionTier === 'PROFESSIONAL' || user?.subscriptionTier === 'ENTERPRISE') {
      fetchNetworkAnalytics();
    }
  }, [selectedTimeframe]);

  const renderTimeframeSelector = () => (
    <View style={styles.timeframeSelector}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {timeframes.map((timeframe) => (
          <TouchableOpacity
            key={timeframe.value}
            style={[
              styles.timeframeChip,
              selectedTimeframe === timeframe.value && styles.selectedTimeframeChip
            ]}
            onPress={() => setSelectedTimeframe(timeframe.value)}
          >
            <Text style={[
              styles.timeframeChipText,
              selectedTimeframe === timeframe.value && styles.selectedTimeframeChipText
            ]}>
              {timeframe.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderNetworkValueCard = () => {
    if (!analytics) return null;

    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.networkValueCard}
      >
        <Text style={styles.cardTitle}>💎 Network Value</Text>
        <View style={styles.valueMetrics}>
          <View style={styles.mainValue}>
            <Text style={styles.networkValue}>
              ${analytics.networkValue.toLocaleString()}
            </Text>
            <Text style={styles.growthBadge}>
              {analytics.growth} ↗️
            </Text>
          </View>
          <View style={styles.roiContainer}>
            <Text style={styles.roiLabel}>ROI</Text>
            <Text style={styles.roiValue}>
              {(analytics.roi * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
        <Text style={styles.networkScore}>
          Network Score: {analytics.networkScore}/100
        </Text>
      </LinearGradient>
    );
  };

  const renderStatsGrid = () => {
    if (!analytics) return null;

    const stats = [
      {
        label: 'Total Connections',
        value: analytics.totalConnections.toString(),
        icon: '👥',
        color: COLORS.primary
      },
      {
        label: 'Active Connections',
        value: analytics.activeConnections.toString(),
        icon: '⚡',
        color: COLORS.success
      },
      {
        label: 'Deals Completed',
        value: analytics.dealsCompleted.toString(),
        icon: '🤝',
        color: COLORS.warning
      },
      {
        label: 'Total Revenue',
        value: `$${analytics.totalRevenue.toLocaleString()}`,
        icon: '💰',
        color: COLORS.successDark
      }
    ];

    return (
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <TouchableOpacity key={index} style={styles.statCard}>
            <LinearGradient
              colors={[stat.color, `${stat.color}CC`]}
              style={styles.statGradient}
            >
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPerformanceInsights = () => {
    if (!analytics) return null;

    const insights = [
      {
        title: 'Revenue Growth',
        value: analytics.revenueGrowth,
        description: 'Compared to previous period',
        trend: 'up',
        color: COLORS.success
      },
      {
        title: 'Industry Ranking',
        value: analytics.industryRanking,
        description: 'Among your industry peers',
        trend: analytics.industryRanking.includes('Top') ? 'up' : 'neutral',
        color: COLORS.primary
      },
      {
        title: 'Connection Quality',
        value: `${Math.round((analytics.activeConnections / analytics.totalConnections) * 100)}%`,
        description: 'Active vs total connections',
        trend: 'up',
        color: COLORS.warning
      }
    ];

    return (
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>📊 Performance Insights</Text>
        {insights.map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={[styles.trendIcon, { color: insight.color }]}>
                {insight.trend === 'up' ? '↗️' : insight.trend === 'down' ? '↘️' : '→'}
              </Text>
            </View>
            <Text style={[styles.insightValue, { color: insight.color }]}>
              {insight.value}
            </Text>
            <Text style={styles.insightDescription}>
              {insight.description}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTopConnections = () => {
    if (!topConnections.length) return null;

    return (
      <View style={styles.connectionsSection}>
        <Text style={styles.sectionTitle}>⭐ Top Value Connections</Text>
        {topConnections.map((connection, index) => (
          <TouchableOpacity key={connection.id} style={styles.connectionCard}>
            <View style={styles.connectionInfo}>
              <View style={styles.connectionAvatar}>
                <Text style={styles.avatarText}>
                  {connection.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.connectionDetails}>
                <Text style={styles.connectionName}>{connection.name}</Text>
                <Text style={styles.connectionTitle}>
                  {connection.title} at {connection.company}
                </Text>
                <Text style={styles.connectionValue}>
                  Network Value: ${connection.value?.toLocaleString() || '0'}
                </Text>
              </View>
            </View>
            <View style={styles.connectionStatus}>
              <Text style={[
                styles.statusBadge,
                { 
                  backgroundColor: connection.status === 'active' ? COLORS.success : 
                                  connection.status === 'pending' ? COLORS.warning : COLORS.textMuted,
                  color: COLORS.white
                }
              ]}>
                {connection.status?.toUpperCase() || 'UNKNOWN'}
              </Text>
              <Text style={styles.lastInteraction}>
                Last: {connection.lastInteraction || 'Never'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRecommendations = () => {
    const recommendations = [
      {
        title: 'Increase Engagement',
        description: 'Reach out to 5 inactive connections this week',
        priority: 'high',
        icon: '📞'
      },
      {
        title: 'Expand Network',
        description: 'Target 3 new connections in complementary industries',
        priority: 'medium',
        icon: '🎯'
      },
      {
        title: 'Revenue Opportunity',
        description: 'Follow up on 2 pending deals worth $50K+',
        priority: 'high',
        icon: '💼'
      }
    ];

    return (
      <View style={styles.recommendationsSection}>
        <Text style={styles.sectionTitle}>💡 AI Recommendations</Text>
        {recommendations.map((rec, index) => (
          <TouchableOpacity key={index} style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
              <Text style={styles.recommendationIcon}>{rec.icon}</Text>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>{rec.title}</Text>
                <Text style={styles.recommendationDescription}>{rec.description}</Text>
              </View>
              <Text style={[
                styles.priorityBadge,
                { 
                  backgroundColor: rec.priority === 'high' ? COLORS.error : COLORS.warning,
                  color: COLORS.white
                }
              ]}>
                {rec.priority.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (user?.subscriptionTier !== 'PROFESSIONAL' && user?.subscriptionTier !== 'ENTERPRISE') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          style={styles.upgradeCard}
        >
          <Text style={styles.upgradeTitle}>🔒 Premium Feature</Text>
          <Text style={styles.upgradeDescription}>
            Network Analytics requires Professional or Enterprise subscription
          </Text>
          <TouchableOpacity style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Analyzing your network...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>📈 Network Analytics</Text>
        <Text style={styles.headerSubtitle}>
          Track your network value and ROI
        </Text>
      </LinearGradient>

      {renderTimeframeSelector()}
      {renderNetworkValueCard()}
      {renderStatsGrid()}
      {renderPerformanceInsights()}
      {renderTopConnections()}
      {renderRecommendations()}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Analytics updated in real-time
        </Text>
      </View>
    </ScrollView>
  );
};

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
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    fontFamily: FONTS.regular,
  },
  timeframeSelector: {
    padding: 20,
    paddingBottom: 10,
  },
  timeframeChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedTimeframeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeframeChipText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.medium,
  },
  selectedTimeframeChipText: {
    color: COLORS.white,
  },
  networkValueCard: {
    margin: 20,
    marginBottom: 10,
    padding: 24,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 20,
  },
  valueMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainValue: {
    flex: 1,
  },
  networkValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  growthBadge: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
    fontFamily: FONTS.medium,
  },
  roiContainer: {
    alignItems: 'center',
  },
  roiLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.8,
    fontFamily: FONTS.regular,
  },
  roiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  networkScore: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'right',
    fontFamily: FONTS.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    paddingTop: 10,
  },
  statCard: {
    width: (width - 60) / 2,
    marginRight: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
    fontFamily: FONTS.medium,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 16,
  },
  insightsSection: {
    padding: 20,
    paddingTop: 10,
  },
  insightCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  trendIcon: {
    fontSize: 16,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  connectionsSection: {
    padding: 20,
    paddingTop: 10,
  },
  connectionCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  connectionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  connectionDetails: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  connectionTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    marginBottom: 4,
  },
  connectionValue: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  connectionStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  lastInteraction: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  recommendationsSection: {
    padding: 20,
    paddingTop: 10,
  },
  recommendationCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
  },
  upgradeCard: {
    margin: 20,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 100,
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  upgradeDescription: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: FONTS.regular,
  },
  upgradeButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
});

export default NetworkAnalyticsScreen;
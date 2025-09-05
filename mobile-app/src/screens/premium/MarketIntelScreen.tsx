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

interface MarketTrend {
  industry: string;
  trend: string;
  impact: string;
  description: string;
  confidence: number;
  source: string;
}

interface MarketIntelligence {
  industryGrowth: {
    rate: number;
    trajectory: string;
  };
  emergingTrends: string[];
  competitorAnalysis: any[];
  investmentOpportunities: any[];
  marketDemand: {
    short_term: string;
    long_term: string;
    factors: string[];
  };
  confidence: number;
  lastUpdated: string;
}

const MarketIntelScreen: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState('technology');

  const user = useAppSelector((state) => state.auth.user);

  const industries = [
    'Technology', 'Finance', 'Healthcare', 'Marketing', 
    'Consulting', 'Real Estate', 'Manufacturing'
  ];

  const fetchMarketIntelligence = async (industry = selectedIndustry) => {
    try {
      setLoading(true);
      const response = await api.get(`/v2/intelligence/market-trends?industry=${industry}`);
      if (response.data.success) {
        setMarketData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching market intelligence:', error);
      Alert.alert('Error', 'Failed to load market intelligence data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMarketIntelligence();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user?.subscriptionTier === 'PROFESSIONAL' || user?.subscriptionTier === 'ENTERPRISE') {
      fetchMarketIntelligence();
    }
  }, [selectedIndustry]);

  const renderIndustrySelector = () => (
    <View style={styles.industrySelector}>
      <Text style={styles.sectionTitle}>Select Industry</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.industryScrollView}>
        {industries.map((industry) => (
          <TouchableOpacity
            key={industry}
            style={[
              styles.industryChip,
              selectedIndustry === industry.toLowerCase() && styles.selectedIndustryChip
            ]}
            onPress={() => setSelectedIndustry(industry.toLowerCase())}
          >
            <Text style={[
              styles.industryChipText,
              selectedIndustry === industry.toLowerCase() && styles.selectedIndustryChipText
            ]}>
              {industry}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderGrowthMetrics = () => {
    if (!marketData) return null;

    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.growthCard}
      >
        <Text style={styles.cardTitle}>📈 Industry Growth</Text>
        <View style={styles.growthMetrics}>
          <View style={styles.growthStat}>
            <Text style={styles.growthValue}>
              {(marketData.industryGrowth.rate * 100).toFixed(1)}%
            </Text>
            <Text style={styles.growthLabel}>Annual Growth</Text>
          </View>
          <View style={styles.growthStat}>
            <Text style={styles.growthValue}>
              {marketData.confidence > 0.8 ? '🔥' : marketData.confidence > 0.6 ? '📊' : '⚠️'}
            </Text>
            <Text style={styles.growthLabel}>
              {marketData.industryGrowth.trajectory}
            </Text>
          </View>
        </View>
        <Text style={styles.confidenceText}>
          Confidence: {(marketData.confidence * 100).toFixed(0)}%
        </Text>
      </LinearGradient>
    );
  };

  const renderTrendsList = () => {
    if (!marketData) return null;

    return (
      <View style={styles.trendsSection}>
        <Text style={styles.sectionTitle}>🚀 Emerging Trends</Text>
        {marketData.emergingTrends.map((trend, index) => (
          <View key={index} style={styles.trendItem}>
            <View style={styles.trendIcon}>
              <Text style={styles.trendEmoji}>🔥</Text>
            </View>
            <View style={styles.trendContent}>
              <Text style={styles.trendTitle}>{trend}</Text>
              <Text style={styles.trendDescription}>
                High growth opportunity in {selectedIndustry} sector
              </Text>
            </View>
            <View style={styles.trendImpact}>
              <Text style={styles.impactBadge}>HIGH</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderCompetitorAnalysis = () => {
    if (!marketData || !marketData.competitorAnalysis.length) return null;

    return (
      <View style={styles.competitorSection}>
        <Text style={styles.sectionTitle}>🏆 Competitive Landscape</Text>
        {marketData.competitorAnalysis.map((competitor, index) => (
          <View key={index} style={styles.competitorItem}>
            <View style={styles.competitorHeader}>
              <Text style={styles.competitorName}>{competitor.name || 'Market Player'}</Text>
              <Text style={[
                styles.threatLevel,
                { color: competitor.threat_level === 'high' ? COLORS.error : 
                        competitor.threat_level === 'medium' ? COLORS.warning : COLORS.success }
              ]}>
                {competitor.threat_level?.toUpperCase() || 'MEDIUM'} THREAT
              </Text>
            </View>
            <Text style={styles.competitorShare}>
              Market Share: {competitor.market_share || '15%'}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderInvestmentOpportunities = () => {
    if (!marketData || !marketData.investmentOpportunities.length) return null;

    return (
      <View style={styles.opportunitiesSection}>
        <Text style={styles.sectionTitle}>💰 Investment Opportunities</Text>
        {marketData.investmentOpportunities.map((opportunity, index) => (
          <TouchableOpacity key={index} style={styles.opportunityCard}>
            <LinearGradient
              colors={[COLORS.success, COLORS.successLight]}
              style={styles.opportunityGradient}
            >
              <Text style={styles.opportunityTitle}>{opportunity.sector || 'Growth Sector'}</Text>
              <View style={styles.opportunityDetails}>
                <Text style={styles.opportunityPotential}>
                  Potential: {opportunity.potential?.toUpperCase() || 'HIGH'}
                </Text>
                <Text style={styles.opportunityRisk}>
                  Risk: {opportunity.risk?.toUpperCase() || 'MEDIUM'}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMarketDemand = () => {
    if (!marketData) return null;

    return (
      <View style={styles.demandSection}>
        <Text style={styles.sectionTitle}>📊 Market Demand Forecast</Text>
        <View style={styles.demandCard}>
          <View style={styles.demandItem}>
            <Text style={styles.demandLabel}>Short-term (3-6 months)</Text>
            <Text style={[
              styles.demandValue,
              { color: marketData.marketDemand.short_term === 'increasing' ? COLORS.success : COLORS.warning }
            ]}>
              {marketData.marketDemand.short_term?.toUpperCase() || 'STABLE'}
            </Text>
          </View>
          <View style={styles.demandItem}>
            <Text style={styles.demandLabel}>Long-term (12+ months)</Text>
            <Text style={[
              styles.demandValue,
              { color: marketData.marketDemand.long_term === 'strong' ? COLORS.success : COLORS.warning }
            ]}>
              {marketData.marketDemand.long_term?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>
        {marketData.marketDemand.factors && (
          <View style={styles.factorsContainer}>
            <Text style={styles.factorsTitle}>Key Factors:</Text>
            {marketData.marketDemand.factors.map((factor, index) => (
              <Text key={index} style={styles.factorItem}>• {factor}</Text>
            ))}
          </View>
        )}
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
            Market Intelligence requires Professional or Enterprise subscription
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
        <Text style={styles.loadingText}>Loading market intelligence...</Text>
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
        <Text style={styles.headerTitle}>🧠 Market Intelligence</Text>
        <Text style={styles.headerSubtitle}>
          AI-powered market insights and trends
        </Text>
      </LinearGradient>

      {renderIndustrySelector()}
      {renderGrowthMetrics()}
      {renderTrendsList()}
      {renderCompetitorAnalysis()}
      {renderInvestmentOpportunities()}
      {renderMarketDemand()}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {marketData?.lastUpdated ? 
            new Date(marketData.lastUpdated).toLocaleDateString() : 
            'Now'}
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
  industrySelector: {
    padding: 20,
    paddingBottom: 10,
  },
  industryScrollView: {
    marginTop: 10,
  },
  industryChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedIndustryChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  industryChipText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.medium,
  },
  selectedIndustryChipText: {
    color: COLORS.white,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 16,
  },
  growthCard: {
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 16,
  },
  growthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  growthStat: {
    alignItems: 'center',
  },
  growthValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  growthLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
    fontFamily: FONTS.medium,
  },
  confidenceText: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    textAlign: 'right',
    fontFamily: FONTS.regular,
  },
  trendsSection: {
    padding: 20,
    paddingTop: 10,
  },
  trendItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  trendIcon: {
    marginRight: 12,
  },
  trendEmoji: {
    fontSize: 20,
  },
  trendContent: {
    flex: 1,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  trendDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  trendImpact: {
    marginLeft: 8,
  },
  impactBadge: {
    backgroundColor: COLORS.success,
    color: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
  },
  competitorSection: {
    padding: 20,
    paddingTop: 10,
  },
  competitorItem: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  competitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  competitorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  threatLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
  },
  competitorShare: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  opportunitiesSection: {
    padding: 20,
    paddingTop: 10,
  },
  opportunityCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  opportunityGradient: {
    padding: 16,
  },
  opportunityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  opportunityDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  opportunityPotential: {
    fontSize: 14,
    color: COLORS.white,
    fontFamily: FONTS.medium,
  },
  opportunityRisk: {
    fontSize: 14,
    color: COLORS.white,
    fontFamily: FONTS.medium,
  },
  demandSection: {
    padding: 20,
    paddingTop: 10,
  },
  demandCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  demandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  demandLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  demandValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
  },
  factorsContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
  },
  factorsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  factorItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    marginBottom: 4,
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

export default MarketIntelScreen;
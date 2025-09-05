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
  TextInput,
  Modal,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../store';
import { COLORS, FONTS } from '../../constants/theme';
import api from '../../services/apiService';

const { width, height } = Dimensions.get('window');

interface Deal {
  id: string;
  title: string;
  description: string;
  value: number;
  currency: string;
  status: 'draft' | 'negotiating' | 'pending' | 'completed' | 'cancelled';
  partnerId?: string;
  partnerName?: string;
  partnerCompany?: string;
  createdAt: string;
  aiScore?: number;
  successProbability?: number;
  recommendations?: string[];
}

interface DealPrediction {
  success_probability: number;
  confidence: number;
  key_factors: Array<{
    factor: string;
    importance: number;
    current_value: number;
    impact: 'positive' | 'negative';
  }>;
  recommendations: string[];
  risk_level: 'Low' | 'Medium' | 'High';
  recommended_action: string;
}

const DealMakerScreen: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [predictionModalVisible, setPredictionModalVisible] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [prediction, setPrediction] = useState<DealPrediction | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // New deal form state
  const [newDeal, setNewDeal] = useState({
    title: '',
    description: '',
    value: '',
    partnerId: '',
    partnerName: '',
    partnerCompany: ''
  });

  const user = useAppSelector((state) => state.auth.user);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/v2/deals/my-deals');
      if (response.data.success) {
        setDeals(response.data.data.deals || []);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      Alert.alert('Error', 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeals();
    setRefreshing(false);
  };

  const createDeal = async () => {
    try {
      if (!newDeal.title || !newDeal.description || !newDeal.value) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const dealData = {
        ...newDeal,
        value: parseFloat(newDeal.value)
      };

      const response = await api.post('/v2/deals/facilitate', dealData);
      
      if (response.data.success) {
        Alert.alert('Success', 'Deal created successfully!');
        setModalVisible(false);
        setNewDeal({
          title: '',
          description: '',
          value: '',
          partnerId: '',
          partnerName: '',
          partnerCompany: ''
        });
        fetchDeals();
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      Alert.alert('Error', 'Failed to create deal');
    }
  };

  const predictDealSuccess = async (deal: Deal) => {
    try {
      setPredictionLoading(true);
      setSelectedDeal(deal);
      setPredictionModalVisible(true);

      const response = await api.post('/v2/ai/predict-deal', {
        title: deal.title,
        description: deal.description,
        value: deal.value,
        duration_months: 6, // default duration
        match_score: deal.aiScore || 75 // use AI score or default
      });

      if (response.data.success) {
        setPrediction(response.data.prediction);
      }
    } catch (error) {
      console.error('Error predicting deal success:', error);
      Alert.alert('Error', 'Failed to analyze deal');
    } finally {
      setPredictionLoading(false);
    }
  };

  useEffect(() => {
    if (user?.subscriptionTier === 'PROFESSIONAL' || user?.subscriptionTier === 'ENTERPRISE') {
      fetchDeals();
    }
  }, []);

  const renderHeader = () => (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      style={styles.header}
    >
      <Text style={styles.headerTitle}>🤖 AI Deal Assistant</Text>
      <Text style={styles.headerSubtitle}>
        Smart deal analysis and success prediction
      </Text>
    </LinearGradient>
  );

  const renderStatsOverview = () => {
    const stats = {
      totalDeals: deals.length,
      activeDeals: deals.filter(d => d.status === 'negotiating' || d.status === 'pending').length,
      completedDeals: deals.filter(d => d.status === 'completed').length,
      totalValue: deals.reduce((sum, deal) => sum + deal.value, 0)
    };

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>📊 Deal Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalDeals}</Text>
            <Text style={styles.statLabel}>Total Deals</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.activeDeals}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completedDeals}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${stats.totalValue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCreateDealButton = () => (
    <TouchableOpacity
      style={styles.createDealButton}
      onPress={() => setModalVisible(true)}
    >
      <LinearGradient
        colors={[COLORS.success, COLORS.successDark]}
        style={styles.createDealGradient}
      >
        <Text style={styles.createDealText}>+ Create New Deal</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'negotiating': return COLORS.warning;
      case 'pending': return COLORS.primary;
      case 'cancelled': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getSuccessProbabilityColor = (probability: number) => {
    if (probability >= 75) return COLORS.success;
    if (probability >= 50) return COLORS.warning;
    return COLORS.error;
  };

  const renderDealsList = () => {
    if (!deals.length) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No deals yet</Text>
          <Text style={styles.emptyStateDescription}>
            Create your first deal to get AI-powered insights
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.dealsContainer}>
        <Text style={styles.sectionTitle}>💼 Your Deals</Text>
        {deals.map((deal) => (
          <TouchableOpacity
            key={deal.id}
            style={styles.dealCard}
            onPress={() => predictDealSuccess(deal)}
          >
            <View style={styles.dealHeader}>
              <Text style={styles.dealTitle}>{deal.title}</Text>
              <Text style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(deal.status) }
              ]}>
                {deal.status.toUpperCase()}
              </Text>
            </View>
            
            <Text style={styles.dealDescription} numberOfLines={2}>
              {deal.description}
            </Text>

            <View style={styles.dealFooter}>
              <View style={styles.dealValue}>
                <Text style={styles.dealValueText}>
                  ${deal.value.toLocaleString()} {deal.currency || 'USD'}
                </Text>
                {deal.partnerName && (
                  <Text style={styles.dealPartner}>
                    with {deal.partnerName}
                  </Text>
                )}
              </View>

              {deal.successProbability && (
                <View style={styles.successProbability}>
                  <Text style={[
                    styles.probabilityText,
                    { color: getSuccessProbabilityColor(deal.successProbability) }
                  ]}>
                    {deal.successProbability.toFixed(0)}% success
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={() => predictDealSuccess(deal)}
            >
              <Text style={styles.analyzeButtonText}>🔮 AI Analysis</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCreateDealModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Deal</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Deal Title *"
            value={newDeal.title}
            onChangeText={(text) => setNewDeal({...newDeal, title: text})}
            placeholderTextColor={COLORS.textMuted}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Deal Description *"
            value={newDeal.description}
            onChangeText={(text) => setNewDeal({...newDeal, description: text})}
            multiline
            numberOfLines={4}
            placeholderTextColor={COLORS.textMuted}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Deal Value (USD) *"
            value={newDeal.value}
            onChangeText={(text) => setNewDeal({...newDeal, value: text})}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Partner Name"
            value={newDeal.partnerName}
            onChangeText={(text) => setNewDeal({...newDeal, partnerName: text})}
            placeholderTextColor={COLORS.textMuted}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Partner Company"
            value={newDeal.partnerCompany}
            onChangeText={(text) => setNewDeal({...newDeal, partnerCompany: text})}
            placeholderTextColor={COLORS.textMuted}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.createButton]}
              onPress={createDeal}
            >
              <Text style={styles.createButtonText}>Create Deal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPredictionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={predictionModalVisible}
      onRequestClose={() => setPredictionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.predictionModal} showsVerticalScrollIndicator={false}>
          <View style={styles.predictionContent}>
            <Text style={styles.predictionTitle}>🔮 AI Deal Analysis</Text>
            
            {selectedDeal && (
              <Text style={styles.dealTitleInModal}>{selectedDeal.title}</Text>
            )}

            {predictionLoading ? (
              <View style={styles.predictionLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Analyzing deal...</Text>
              </View>
            ) : prediction ? (
              <>
                {/* Success Probability */}
                <LinearGradient
                  colors={[
                    getSuccessProbabilityColor(prediction.success_probability),
                    `${getSuccessProbabilityColor(prediction.success_probability)}CC`
                  ]}
                  style={styles.probabilityCard}
                >
                  <Text style={styles.probabilityCardTitle}>Success Probability</Text>
                  <Text style={styles.probabilityCardValue}>
                    {prediction.success_probability.toFixed(1)}%
                  </Text>
                  <Text style={styles.probabilityCardSubtitle}>
                    Confidence: {(prediction.confidence * 100).toFixed(0)}%
                  </Text>
                </LinearGradient>

                {/* Risk Assessment */}
                <View style={styles.riskAssessment}>
                  <Text style={styles.riskTitle}>Risk Level: {prediction.risk_level}</Text>
                  <Text style={styles.recommendedAction}>{prediction.recommended_action}</Text>
                </View>

                {/* Key Factors */}
                {prediction.key_factors && prediction.key_factors.length > 0 && (
                  <View style={styles.factorsSection}>
                    <Text style={styles.factorsTitle}>📊 Key Success Factors</Text>
                    {prediction.key_factors.map((factor, index) => (
                      <View key={index} style={styles.factorItem}>
                        <View style={styles.factorHeader}>
                          <Text style={styles.factorName}>{factor.factor}</Text>
                          <Text style={[
                            styles.factorImpact,
                            { color: factor.impact === 'positive' ? COLORS.success : COLORS.error }
                          ]}>
                            {factor.impact === 'positive' ? '↗️' : '↘️'}
                          </Text>
                        </View>
                        <Text style={styles.factorImportance}>
                          Importance: {(factor.importance * 100).toFixed(0)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recommendations */}
                {prediction.recommendations && prediction.recommendations.length > 0 && (
                  <View style={styles.recommendationsSection}>
                    <Text style={styles.recommendationsTitle}>💡 AI Recommendations</Text>
                    {prediction.recommendations.map((rec, index) => (
                      <View key={index} style={styles.recommendationItem}>
                        <Text style={styles.recommendationText}>• {rec}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.errorText}>Failed to analyze deal</Text>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setPredictionModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (user?.subscriptionTier !== 'PROFESSIONAL' && user?.subscriptionTier !== 'ENTERPRISE') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          style={styles.upgradeCard}
        >
          <Text style={styles.upgradeTitle}>🔒 Premium Feature</Text>
          <Text style={styles.upgradeDescription}>
            AI Deal Assistant requires Professional or Enterprise subscription
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
        <Text style={styles.loadingText}>Loading deals...</Text>
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
      {renderHeader()}
      {renderStatsOverview()}
      {renderCreateDealButton()}
      {renderDealsList()}
      {renderCreateDealModal()}
      {renderPredictionModal()}
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 16,
  },
  statsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  createDealButton: {
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createDealGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  createDealText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  dealsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  dealCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  dealDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    marginBottom: 12,
    lineHeight: 20,
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dealValue: {
    flex: 1,
  },
  dealValueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  dealPartner: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  successProbability: {
    alignItems: 'flex-end',
  },
  probabilityText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
  },
  analyzeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  analyzeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.regular,
    marginBottom: 16,
    backgroundColor: COLORS.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surface,
    marginRight: 8,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  predictionModal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    margin: 20,
    maxHeight: height * 0.8,
  },
  predictionContent: {
    padding: 24,
  },
  predictionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  dealTitleInModal: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    marginBottom: 24,
    textAlign: 'center',
  },
  predictionLoading: {
    alignItems: 'center',
    padding: 40,
  },
  probabilityCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  probabilityCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  probabilityCardValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  probabilityCardSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    fontFamily: FONTS.regular,
    opacity: 0.9,
  },
  riskAssessment: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  recommendedAction: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  factorsSection: {
    marginBottom: 20,
  },
  factorsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 12,
  },
  factorItem: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  factorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  factorImpact: {
    fontSize: 16,
  },
  factorImportance: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  recommendationsSection: {
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 12,
  },
  recommendationItem: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  closeModalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    padding: 20,
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
});

export default DealMakerScreen;
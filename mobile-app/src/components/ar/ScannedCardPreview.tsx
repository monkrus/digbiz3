import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Constants
import { COLORS, FONTS, SPACING, SHADOWS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface ScannedCardPreviewProps {
  cardData: {
    id: string;
    name: string;
    title: string;
    company: string;
    email: string;
    phone?: string;
    avatar?: string;
    matchScore?: number;
    holographicData?: any;
  };
  visible: boolean;
  onClose: () => void;
  onConnect: () => void;
}

const ScannedCardPreview: React.FC<ScannedCardPreviewProps> = ({
  cardData,
  visible,
  onClose,
  onConnect,
}) => {
  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return COLORS.accent;
    if (score >= 60) return COLORS.warning;
    return COLORS.error;
  };

  const getMatchScoreText = (score: number) => {
    if (score >= 80) return 'High Match';
    if (score >= 60) return 'Good Match';
    return 'Low Match';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <BlurView intensity={90} style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Business Card Scanned</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* AR/Holographic Indicator */}
              {cardData.holographicData && (
                <View style={styles.arBadge}>
                  <LinearGradient
                    colors={[COLORS.cyber, COLORS.hologram]}
                    style={styles.arGradient}
                  >
                    <Ionicons name="diamond" size={16} color="white" />
                    <Text style={styles.arText}>AR Enhanced</Text>
                  </LinearGradient>
                </View>
              )}

              {/* Profile Section */}
              <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                  {cardData.avatar ? (
                    <Image source={{ uri: cardData.avatar }} style={styles.avatar} />
                  ) : (
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryLight]}
                      style={styles.avatarPlaceholder}
                    >
                      <Text style={styles.avatarText}>
                        {cardData.name.charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                </View>

                <View style={styles.profileInfo}>
                  <Text style={styles.name}>{cardData.name}</Text>
                  <Text style={styles.title}>{cardData.title}</Text>
                  <Text style={styles.company}>{cardData.company}</Text>
                </View>
              </View>

              {/* Match Score */}
              {cardData.matchScore && (
                <View style={styles.matchSection}>
                  <View style={styles.matchHeader}>
                    <Ionicons 
                      name="analytics" 
                      size={20} 
                      color={getMatchScoreColor(cardData.matchScore)} 
                    />
                    <Text style={styles.matchTitle}>
                      {getMatchScoreText(cardData.matchScore)}
                    </Text>
                    <Text style={[
                      styles.matchScore,
                      { color: getMatchScoreColor(cardData.matchScore) }
                    ]}>
                      {cardData.matchScore}%
                    </Text>
                  </View>
                  
                  <View style={styles.matchBar}>
                    <View 
                      style={[
                        styles.matchBarFill,
                        {
                          width: `${cardData.matchScore}%`,
                          backgroundColor: getMatchScoreColor(cardData.matchScore),
                        }
                      ]} 
                    />
                  </View>
                  
                  <Text style={styles.matchDescription}>
                    Based on mutual connections, industry alignment, and professional interests
                  </Text>
                </View>
              )}

              {/* Contact Information */}
              <View style={styles.contactSection}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                
                <View style={styles.contactItem}>
                  <Ionicons name="mail" size={20} color={COLORS.primary} />
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>{cardData.email}</Text>
                  </View>
                </View>

                {cardData.phone && (
                  <View style={styles.contactItem}>
                    <Ionicons name="call" size={20} color={COLORS.primary} />
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactLabel}>Phone</Text>
                      <Text style={styles.contactValue}>{cardData.phone}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* AI Insights */}
              <View style={styles.insightsSection}>
                <Text style={styles.sectionTitle}>AI Insights</Text>
                
                <View style={styles.insightItem}>
                  <View style={styles.insightIcon}>
                    <Ionicons name="bulb" size={16} color={COLORS.warning} />
                  </View>
                  <Text style={styles.insightText}>
                    Both of you work in digital innovation - great conversation starter!
                  </Text>
                </View>

                <View style={styles.insightItem}>
                  <View style={styles.insightIcon}>
                    <Ionicons name="people" size={16} color={COLORS.accent} />
                  </View>
                  <Text style={styles.insightText}>
                    You have 3 mutual connections who could provide warm introductions
                  </Text>
                </View>

                <View style={styles.insightItem}>
                  <View style={styles.insightIcon}>
                    <Ionicons name="trending-up" size={16} color={COLORS.info} />
                  </View>
                  <Text style={styles.insightText}>
                    Their company is expanding - potential collaboration opportunity
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Save Contact</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.primaryButton} onPress={onConnect}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  style={styles.primaryGradient}
                >
                  <Ionicons name="person-add" size={20} color="white" />
                  <Text style={styles.primaryButtonText}>Connect</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: width - SPACING.xl * 2,
    maxHeight: height * 0.85,
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.lg,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  arBadge: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  arGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  arText: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.medium,
    color: 'white',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarContainer: {
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONTS['2xl'],
    fontFamily: FONTS.bold,
    color: 'white',
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: FONTS.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONTS.base,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  company: {
    fontSize: FONTS.base,
    fontFamily: FONTS.regular,
    color: COLORS.primary,
  },
  matchSection: {
    backgroundColor: COLORS.gray50,
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.lg,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  matchTitle: {
    flex: 1,
    fontSize: FONTS.base,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  matchScore: {
    fontSize: FONTS.base,
    fontFamily: FONTS.bold,
  },
  matchBar: {
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: 3,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  matchBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  matchDescription: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  contactSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  contactInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  contactLabel: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: FONTS.base,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
  },
  insightsSection: {
    marginBottom: SPACING.lg,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  insightIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: FONTS.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  secondaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: FONTS.base,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  primaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  primaryGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  primaryButtonText: {
    fontSize: FONTS.base,
    fontFamily: FONTS.medium,
    color: 'white',
  },
});

export default ScannedCardPreview;
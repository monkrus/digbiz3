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
import apiService from '../services/apiService';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

export default function HomeScreen({ navigation }) {
  const [apiStatus, setApiStatus] = useState('checking');
  const [userStats, setUserStats] = useState({
    connections: 0,
    businessCards: 0,
    events: 0
  });

  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    try {
      await apiService.checkHealth();
      setApiStatus('connected');
    } catch (error) {
      setApiStatus('disconnected');
      console.error('API connection failed:', error);
    }
  };

  const handleQuickAction = (action) => {
    Alert.alert('Feature Coming Soon', `${action} feature will be available soon!`);
  };

  const StatusIndicator = () => (
    <View style={styles.statusContainer}>
      <View style={[
        styles.statusDot, 
        { backgroundColor: apiStatus === 'connected' ? COLORS.success : COLORS.danger }
      ]} />
      <Text style={styles.statusText}>
        API {apiStatus === 'connected' ? 'Connected' : 'Disconnected'}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Welcome to</Text>
          <Text style={styles.appName}>DigBiz3</Text>
          <Text style={styles.subtitle}>Smart Business Networking</Text>
          <StatusIndicator />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userStats.connections}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userStats.businessCards}</Text>
            <Text style={styles.statLabel}>Business Cards</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userStats.events}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('Scan Business Card')}
          >
            <Text style={styles.actionButtonText}>📱 Scan Business Card</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('Share My Card')}
          >
            <Text style={styles.actionButtonText}>📤 Share My Card</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('Find Events')}
          >
            <Text style={styles.actionButtonText}>🎯 Find Networking Events</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('View Analytics')}
          >
            <Text style={styles.actionButtonText}>📊 View Analytics</Text>
          </TouchableOpacity>
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
  header: {
    paddingTop: 60,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  headerContent: {
    alignItems: 'center',
  },
  greeting: {
    fontSize: FONT_SIZES.lg,
    color: 'white',
    opacity: 0.9,
  },
  appName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: 'white',
    opacity: 0.8,
    marginBottom: SPACING.md,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  statusText: {
    color: 'white',
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  statNumber: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  quickActions: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  actionButton: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
});
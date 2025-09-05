import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import apiService from '../../services/apiService';

const { width, height } = Dimensions.get('window');

export default function ARScannerScreen({ navigation }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanAnimation] = useState(new Animated.Value(0));
  const [detectedCard, setDetectedCard] = useState(null);
  const [arMode, setArMode] = useState('scan'); // 'scan', 'detected', 'holographic'

  useEffect(() => {
    // Start scanning animation
    startScanningAnimation();
  }, []);

  const startScanningAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const simulateCardScan = async () => {
    setIsScanning(true);
    
    try {
      // Simulate camera capture and AI processing
      setTimeout(async () => {
        try {
          const mockImageData = 'base64_image_data_here';
          const response = await apiService.post('/v2/ar/scan-card', {
            imageData: mockImageData,
            location: { lat: 37.7749, lng: -122.4194 }
          });

          if (response.success) {
            setDetectedCard(response.data.extractedInfo);
            setArMode('detected');
            setIsScanning(false);
            
            // Show AR overlay
            setTimeout(() => {
              setArMode('holographic');
              showHolographicCard(response.data);
            }, 1000);
          }
        } catch (error) {
          console.error('AR scan error:', error);
          // Mock successful scan for demo
          const mockCard = {
            name: 'Sarah Johnson',
            title: 'Marketing Director',
            company: 'Digital Innovations',
            email: 'sarah@digitalinnovations.com',
            phone: '+1 (555) 123-4567',
            confidence: 0.95,
            matchScore: 87,
            arEnabled: true
          };
          
          setDetectedCard(mockCard);
          setArMode('detected');
          setIsScanning(false);
        }
      }, 3000);
    } catch (error) {
      setIsScanning(false);
      Alert.alert('Scan Error', 'Failed to process business card. Please try again.');
    }
  };

  const showHolographicCard = (cardData) => {
    Alert.alert(
      '✨ Holographic Business Card',
      `Now displaying AR holographic card for ${cardData.extractedInfo.name}\n\n🎯 Match Score: ${cardData.matchScore}%\n\n3D Model: Loaded\nAnimation: Active\nInteractive Elements: Available`,
      [
        { text: 'View in AR Space', onPress: () => openARSpace(cardData) },
        { text: 'Save Contact', onPress: () => saveContact(cardData.extractedInfo) },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  const openARSpace = (cardData) => {
    Alert.alert(
      '🌟 AR Networking Space',
      'Opening immersive AR environment...\n\n• 3D holographic business card\n• Interactive company information\n• Real-time collaboration tools\n• Virtual meeting room access',
      [
        { text: 'Enter AR Space', onPress: () => enterARSpace(cardData) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const enterARSpace = (cardData) => {
    navigation.navigate('VirtualMeeting', { cardData, mode: 'ar_space' });
  };

  const saveContact = async (contactInfo) => {
    try {
      // In real app, this would save to contacts and create connection
      Alert.alert(
        '✅ Contact Saved',
        `${contactInfo.name} has been added to your network!\n\nConnection request sent automatically.\nMatch score: ${detectedCard?.matchScore}%`
      );
      
      // Reset scanner
      setTimeout(() => {
        setDetectedCard(null);
        setArMode('scan');
      }, 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const retryScanning = () => {
    setDetectedCard(null);
    setArMode('scan');
    setIsScanning(false);
  };

  const ScannerOverlay = () => (
    <View style={styles.scannerContainer}>
      <View style={styles.scannerFrame}>
        <View style={styles.scannerCorner} />
        <View style={[styles.scannerCorner, styles.topRight]} />
        <View style={[styles.scannerCorner, styles.bottomLeft]} />
        <View style={[styles.scannerCorner, styles.bottomRight]} />
        
        <Animated.View
          style={[
            styles.scanLine,
            {
              transform: [{
                translateY: scanAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 200]
                })
              }]
            }
          ]}
        />
        
        {isScanning && (
          <View style={styles.scanningIndicator}>
            <Text style={styles.scanningText}>🤖 AI Processing...</Text>
            <Text style={styles.scanningSubtext}>Analyzing business card</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.instructionText}>
        {arMode === 'scan' ? 'Position business card within frame' : 
         arMode === 'detected' ? '✅ Business card detected!' :
         '✨ AR holographic display active'}
      </Text>
    </View>
  );

  const DetectedCardOverlay = () => (
    <View style={styles.detectedCardContainer}>
      <LinearGradient
        colors={[COLORS.success + '20', COLORS.success + '40']}
        style={styles.detectedCard}
      >
        <Text style={styles.detectedTitle}>📱 Card Detected</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{detectedCard.name}</Text>
          <Text style={styles.cardTitle}>{detectedCard.title}</Text>
          <Text style={styles.cardCompany}>{detectedCard.company}</Text>
          
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>AI Confidence</Text>
            <Text style={styles.confidenceValue}>
              {Math.round(detectedCard.confidence * 100)}%
            </Text>
          </View>
          
          <View style={styles.matchContainer}>
            <Text style={styles.matchLabel}>Compatibility Score</Text>
            <Text style={styles.matchValue}>{detectedCard.matchScore}%</Text>
          </View>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={() => saveContact(detectedCard)}
          >
            <Text style={styles.saveButtonText}>💾 Save Contact</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.arButton}
            onPress={() => showHolographicCard({ extractedInfo: detectedCard, matchScore: detectedCard.matchScore })}
          >
            <Text style={styles.arButtonText}>✨ View in AR</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>AR Business Card Scanner</Text>
        <Text style={styles.headerSubtitle}>Next-generation networking</Text>
      </LinearGradient>

      <View style={styles.cameraContainer}>
        {/* Mock camera view */}
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraText}>📷 Camera View</Text>
          <Text style={styles.cameraSubtext}>AI-powered business card recognition</Text>
        </View>
        
        <ScannerOverlay />
        
        {detectedCard && arMode === 'detected' && <DetectedCardOverlay />}
      </View>

      <View style={styles.controls}>
        <View style={styles.controlsTop}>
          <TouchableOpacity 
            style={styles.modeButton}
            onPress={() => Alert.alert('AR Features', '• Holographic display\n• 3D business cards\n• Virtual meeting rooms\n• Real-time translations')}
          >
            <Text style={styles.modeButtonText}>🌟 AR Features</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modeButton}
            onPress={() => Alert.alert('Smart Analysis', '• AI compatibility scoring\n• Business insights\n• Connection recommendations\n• Market intelligence')}
          >
            <Text style={styles.modeButtonText}>🧠 Smart Analysis</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.scanButton, isScanning && styles.scanButtonActive]}
          onPress={arMode === 'scan' ? simulateCardScan : retryScanning}
          disabled={isScanning}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? '🤖 Scanning...' : 
             arMode === 'scan' ? '📱 Scan Business Card' : 
             '🔄 Scan Another'}
          </Text>
        </TouchableOpacity>

        <View style={styles.featuresList}>
          <Text style={styles.featuresTitle}>✨ Premium AR Features</Text>
          <Text style={styles.featureItem}>🎯 Smart compatibility scoring</Text>
          <Text style={styles.featureItem}>👓 Holographic business cards</Text>
          <Text style={styles.featureItem}>🌍 Virtual meeting rooms</Text>
          <Text style={styles.featureItem}>🤖 AI-powered insights</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  backButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
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
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraText: {
    color: 'white',
    fontSize: FONT_SIZES.xl,
    marginBottom: SPACING.sm,
  },
  cameraSubtext: {
    color: 'white',
    opacity: 0.7,
    fontSize: FONT_SIZES.md,
  },
  scannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 300,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primary,
    borderWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    borderRightWidth: 3,
    borderLeftWidth: 0,
    top: 0,
    right: 0,
  },
  bottomLeft: {
    borderBottomWidth: 3,
    borderTopWidth: 0,
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    bottom: 0,
    right: 0,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  scanningIndicator: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  scanningText: {
    color: 'white',
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
  },
  scanningSubtext: {
    color: 'white',
    opacity: 0.7,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.xs,
  },
  instructionText: {
    color: 'white',
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginTop: SPACING.xl,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  detectedCardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
  },
  detectedCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  detectedTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.success,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  cardInfo: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cardName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  cardCompany: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  confidenceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginRight: SPACING.md,
  },
  confidenceValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginRight: SPACING.md,
  },
  matchValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  arButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  arButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  controls: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
  },
  controlsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  modeButton: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  modeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  scanButtonActive: {
    backgroundColor: COLORS.warning,
  },
  scanButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  featuresList: {
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  featureItem: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
});
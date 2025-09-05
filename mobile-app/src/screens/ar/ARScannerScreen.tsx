import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Vibration,
  Animated,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Redux
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setCameraActive,
  setScanningMode,
  addScannedCard,
  setLoading,
  setError,
  clearScanningResults,
} from '../../store/slices/arSlice';
import { useScanARCardMutation } from '../../store/api/apiSlice';

// Components
import AROverlay from '../../components/ar/AROverlay';
import ScannedCardPreview from '../../components/ar/ScannedCardPreview';

// Constants
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

const { width, height } = Dimensions.get('window');

const ARScannerScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { hasPremiumAccess } = useAuth();
  const { 
    isCameraActive, 
    isScanningMode, 
    isLoading, 
    error,
    lastScanResult,
    permissions 
  } = useAppSelector((state) => state.ar);

  const [scanARCard] = useScanARCardMutation();
  
  // Local State
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);
  const [scannedData, setScannedData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Refs
  const cameraRef = useRef<Camera>(null);
  const scanAnimation = useRef(new Animated.Value(0)).current;

  // Permission and initialization
  useEffect(() => {
    requestPermissions();
    startScanAnimation();
    return () => {
      dispatch(setCameraActive(false));
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      
      if (cameraPermission.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to scan business cards.',
          [{ text: 'OK' }]
        );
        return;
      }

      dispatch(setCameraActive(true));
      dispatch(setScanningMode(true));
    } catch (error) {
      console.error('Permission error:', error);
      dispatch(setError('Failed to get camera permissions'));
    }
  };

  const startScanAnimation = () => {
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

  const handleBarcodeScanned = async ({ type, data }: any) => {
    if (!isScanningMode || isLoading) return;

    try {
      dispatch(setLoading(true));
      Vibration.vibrate(100);

      // Check if it's a DigBiz3 AR business card QR code
      if (data.startsWith('digbiz3://card/')) {
        const cardId = data.replace('digbiz3://card/', '');
        await processARCard(cardId);
      } else {
        // Regular QR code with contact information
        await processQRCode(data);
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      dispatch(setError('Failed to process scanned code'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const processARCard = async (cardId: string) => {
    try {
      // Simulate AR card processing
      const mockCardData = {
        id: cardId,
        name: 'Sarah Johnson',
        title: 'Marketing Director',
        company: 'Digital Innovations',
        email: 'sarah@digitalinnovations.com',
        phone: '+1 (555) 123-4567',
        avatar: null,
        holographicData: {
          model3D: 'sarah_card.obj',
          animation: 'fadeIn',
          position: { x: 0, y: 0, z: 0 },
        },
        scannedAt: new Date().toISOString(),
        matchScore: 87,
      };

      dispatch(addScannedCard(mockCardData));
      setScannedData(mockCardData);
      setShowPreview(true);
      
      Alert.alert(
        '🎯 AR Business Card Scanned!',
        `Connected with ${mockCardData.name} from ${mockCardData.company}`,
        [
          { 
            text: 'View Profile', 
            onPress: () => {
              setShowPreview(false);
              // Navigate to user profile
            }
          },
          { 
            text: 'Continue Scanning', 
            onPress: () => {
              setShowPreview(false);
              setScannedData(null);
            }
          }
        ]
      );
    } catch (error) {
      dispatch(setError('Failed to process AR business card'));
    }
  };

  const processQRCode = async (data: string) => {
    try {
      // Parse QR code data (could be vCard, JSON, or other formats)
      let contactInfo;
      
      if (data.startsWith('BEGIN:VCARD')) {
        contactInfo = parseVCard(data);
      } else if (data.startsWith('{')) {
        contactInfo = JSON.parse(data);
      } else {
        // Handle URL or plain text
        contactInfo = { rawData: data };
      }

      // Create business card from parsed data
      const businessCard = {
        id: `scan_${Date.now()}`,
        userId: `user_${Date.now()}`,
        name: contactInfo.name || 'Unknown',
        title: contactInfo.title || '',
        company: contactInfo.company || '',
        email: contactInfo.email || '',
        phone: contactInfo.phone || '',
        scannedAt: new Date().toISOString(),
        matchScore: Math.floor(Math.random() * 20) + 60, // 60-80 range
      };

      dispatch(addScannedCard(businessCard));
      setScannedData(businessCard);
      setShowPreview(true);
    } catch (error) {
      dispatch(setError('Failed to parse business card data'));
    }
  };

  const parseVCard = (vCardData: string) => {
    const lines = vCardData.split('\n');
    const contact: any = {};
    
    lines.forEach(line => {
      if (line.startsWith('FN:')) contact.name = line.substring(3);
      if (line.startsWith('TITLE:')) contact.title = line.substring(6);
      if (line.startsWith('ORG:')) contact.company = line.substring(4);
      if (line.startsWith('EMAIL:')) contact.email = line.substring(6);
      if (line.startsWith('TEL:')) contact.phone = line.substring(4);
    });
    
    return contact;
  };

  const takePicture = async () => {
    if (!cameraRef.current || !hasPremiumAccess()) {
      Alert.alert(
        'Premium Feature',
        'AI-powered business card scanning from photos requires a premium subscription.',
        [{ text: 'Upgrade', onPress: () => {} }, { text: 'Cancel' }]
      );
      return;
    }

    try {
      dispatch(setLoading(true));
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        exif: false,
      });

      // Process image with AI
      const result = await scanARCard({
        imageData: photo.base64!,
        location: 'camera_capture'
      }).unwrap();

      if (result.success) {
        const businessCard = {
          id: `ai_scan_${Date.now()}`,
          userId: `user_${Date.now()}`,
          name: result.data.extractedInfo.name,
          title: result.data.extractedInfo.title,
          company: result.data.extractedInfo.company,
          email: result.data.extractedInfo.email,
          phone: result.data.extractedInfo.phone,
          scannedAt: new Date().toISOString(),
          matchScore: result.data.matchScore,
          holographicData: result.data.holographicData,
        };

        dispatch(addScannedCard(businessCard));
        setScannedData(businessCard);
        setShowPreview(true);
        
        Vibration.vibrate([100, 100, 100]);
      }
    } catch (error) {
      console.error('Photo scan error:', error);
      dispatch(setError('Failed to scan business card from photo'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const toggleFlash = () => {
    setFlashMode(
      flashMode === Camera.Constants.FlashMode.off
        ? Camera.Constants.FlashMode.torch
        : Camera.Constants.FlashMode.off
    );
  };

  const toggleCamera = () => {
    setCameraType(
      cameraType === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  if (!permissions.camera) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Enable camera access to scan AR business cards
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      {isCameraActive && (
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType}
          flashMode={flashMode}
          onBarCodeScanned={handleBarcodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
          }}
        >
          {/* AR Overlay */}
          <AROverlay 
            isScanning={isScanningMode && !isLoading}
            scanAnimation={scanAnimation}
          />
          
          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              <Ionicons 
                name={flashMode === Camera.Constants.FlashMode.off ? "flash-off" : "flash"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
              <Ionicons name="camera-reverse-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Scanning Instructions */}
          <View style={styles.instructionsContainer}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.instructionsGradient}
            >
              <Text style={styles.instructionsTitle}>
                {isLoading ? 'Processing...' : 'Scan AR Business Card'}
              </Text>
              <Text style={styles.instructionsText}>
                Point your camera at a QR code or business card
              </Text>
            </LinearGradient>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity 
              style={styles.captureButton}
              onPress={takePicture}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
          </View>

          {/* Premium Badge */}
          {hasPremiumAccess() && (
            <View style={styles.premiumBadge}>
              <LinearGradient
                colors={[COLORS.gold, COLORS.secondary]}
                style={styles.premiumGradient}
              >
                <Ionicons name="diamond" size={16} color="white" />
                <Text style={styles.premiumText}>AI Enhanced</Text>
              </LinearGradient>
            </View>
          )}
        </Camera>
      )}

      {/* Scanned Card Preview Modal */}
      {showPreview && scannedData && (
        <ScannedCardPreview
          cardData={scannedData}
          visible={showPreview}
          onClose={() => {
            setShowPreview(false);
            setScannedData(null);
          }}
          onConnect={() => {
            // Handle connection request
            setShowPreview(false);
            setScannedData(null);
          }}
        />
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => dispatch(clearScanningResults())}
          >
            <Text style={styles.errorButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  permissionTitle: {
    fontSize: FONTS.xl,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  permissionText: {
    fontSize: FONTS.base,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 25,
  },
  permissionButtonText: {
    fontSize: FONTS.base,
    fontFamily: FONTS.medium,
    color: 'white',
  },
  topControls: {
    position: 'absolute',
    top: 60,
    right: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: SPACING.md,
    borderRadius: 25,
  },
  instructionsContainer: {
    position: 'absolute',
    top: height * 0.15,
    left: 0,
    right: 0,
  },
  instructionsGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: FONTS.xl,
    fontFamily: FONTS.bold,
    color: 'white',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  instructionsText: {
    fontSize: FONTS.base,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  premiumBadge: {
    position: 'absolute',
    top: 60,
    left: SPACING.lg,
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 15,
    gap: SPACING.xs,
  },
  premiumText: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.medium,
    color: 'white',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 140,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    padding: SPACING.md,
  },
  errorText: {
    fontSize: FONTS.base,
    fontFamily: FONTS.medium,
    color: 'white',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  errorButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    alignSelf: 'center',
  },
  errorButtonText: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.medium,
    color: 'white',
  },
});

export default ARScannerScreen;
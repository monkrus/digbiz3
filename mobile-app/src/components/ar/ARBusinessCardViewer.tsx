import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface BusinessCardData {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  industry?: string;
  bio?: string;
  avatar?: string;
  nftTokenId?: string;
  isVerified?: boolean;
}

interface ARBusinessCardViewerProps {
  cardData: BusinessCardData;
  isHolographic?: boolean;
  onConnect?: () => void;
  onSaveContact?: () => void;
  onClose?: () => void;
}

const ARBusinessCardViewer: React.FC<ARBusinessCardViewerProps> = ({
  cardData,
  isHolographic = true,
  onConnect,
  onSaveContact,
  onClose
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Animation values
  const cardRotation = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const hologramOpacity = useRef(new Animated.Value(0.8)).current;
  const glowIntensity = useRef(new Animated.Value(0.5)).current;
  const floatingAnimation = useRef(new Animated.Value(0)).current;

  // 3D card rotation
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Calculate rotation based on gesture
        const rotateX = gestureState.dy / height * 360;
        const rotateY = gestureState.dx / width * 360;
        
        cardRotation.setValue({
          x: rotateX,
          y: rotateY
        });
      },
      onPanResponderRelease: () => {
        // Return to original position
        Animated.spring(cardRotation, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (isHolographic) {
      startHolographicEffects();
    }
  }, [isHolographic]);

  const startHolographicEffects = () => {
    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnimation, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow pulsing
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowIntensity, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowIntensity, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Hologram opacity variation
    Animated.loop(
      Animated.sequence([
        Animated.timing(hologramOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(hologramOpacity, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const flipCard = () => {
    Animated.timing(cardRotation, {
      toValue: isFlipped ? 0 : 180,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setIsFlipped(!isFlipped);
    });
  };

  const expandCard = () => {
    const targetScale = isExpanded ? 1 : 1.2;
    
    Animated.spring(cardScale, {
      toValue: targetScale,
      useNativeDriver: true,
    }).start();
    
    setIsExpanded(!isExpanded);
  };

  const getIndustryGradient = (industry: string) => {
    switch (industry?.toLowerCase()) {
      case 'technology':
        return [COLORS.primary, COLORS.secondary];
      case 'finance':
        return [COLORS.success, COLORS.successDark];
      case 'healthcare':
        return [COLORS.warning, COLORS.warningDark];
      case 'marketing':
        return [COLORS.info, COLORS.infoDark];
      default:
        return [COLORS.primary, COLORS.primaryDark];
    }
  };

  const renderCardFront = () => (
    <LinearGradient
      colors={getIndustryGradient(cardData.industry)}
      style={styles.cardSide}
    >
      {/* Holographic grid overlay */}
      {isHolographic && (
        <Animated.View
          style={[
            styles.holographicGrid,
            { opacity: hologramOpacity }
          ]}
        />
      )}

      {/* Verification badge */}
      {cardData.isVerified && (
        <View style={styles.verificationBadge}>
          <Text style={styles.verificationIcon}>✓</Text>
        </View>
      )}

      {/* NFT badge */}
      {cardData.nftTokenId && (
        <View style={styles.nftBadge}>
          <Text style={styles.nftText}>NFT</Text>
        </View>
      )}

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {cardData.name.split(' ').map(n => n.charAt(0)).join('')}
          </Text>
        </View>
        {isHolographic && (
          <Animated.View 
            style={[
              styles.avatarGlow,
              { opacity: glowIntensity }
            ]}
          />
        )}
      </View>

      {/* Main Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{cardData.name}</Text>
        <Text style={styles.cardTitle}>{cardData.title}</Text>
        <Text style={styles.cardCompany}>{cardData.company}</Text>
      </View>

      {/* Contact info */}
      <View style={styles.contactInfo}>
        <Text style={styles.contactText}>{cardData.email}</Text>
        {cardData.phone && (
          <Text style={styles.contactText}>{cardData.phone}</Text>
        )}
      </View>

      {/* Holographic scanlines */}
      {isHolographic && (
        <View style={styles.scanlines} />
      )}
    </LinearGradient>
  );

  const renderCardBack = () => (
    <LinearGradient
      colors={getIndustryGradient(cardData.industry).reverse()}
      style={styles.cardSide}
    >
      {/* Bio section */}
      <View style={styles.bioSection}>
        <Text style={styles.bioTitle}>About</Text>
        <Text style={styles.bioText}>
          {cardData.bio || 'Professional in ' + cardData.industry}
        </Text>
      </View>

      {/* Social links */}
      <View style={styles.socialLinks}>
        {cardData.website && (
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialIcon}>🌐</Text>
            <Text style={styles.socialText}>Website</Text>
          </TouchableOpacity>
        )}
        
        {cardData.linkedin && (
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialIcon}>💼</Text>
            <Text style={styles.socialText}>LinkedIn</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* QR Code placeholder */}
      <View style={styles.qrCodeContainer}>
        <View style={styles.qrCode}>
          <Text style={styles.qrText}>QR</Text>
        </View>
        <Text style={styles.qrLabel}>Scan to connect</Text>
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      {/* AR Card Container */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [
              { 
                translateY: floatingAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10]
                })
              },
              { scale: cardScale },
              {
                rotateX: cardRotation.interpolate
                  ? cardRotation.x.interpolate({
                      inputRange: [-360, 360],
                      outputRange: ['-360deg', '360deg']
                    })
                  : '0deg'
              },
              {
                rotateY: cardRotation.interpolate
                  ? cardRotation.y.interpolate({
                      inputRange: [-360, 360],
                      outputRange: ['-360deg', '360deg']
                    })
                  : '0deg'
              }
            ],
            opacity: hologramOpacity
          }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.card} 
          onPress={expandCard}
          activeOpacity={0.9}
        >
          {!isFlipped ? renderCardFront() : renderCardBack()}
        </TouchableOpacity>

        {/* Holographic base */}
        {isHolographic && (
          <Animated.View 
            style={[
              styles.holographicBase,
              { opacity: glowIntensity }
            ]}
          />
        )}
      </Animated.View>

      {/* AR Controls */}
      <View style={styles.arControls}>
        <TouchableOpacity style={styles.controlButton} onPress={flipCard}>
          <Text style={styles.controlIcon}>🔄</Text>
          <Text style={styles.controlText}>Flip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={onSaveContact}>
          <Text style={styles.controlIcon}>💾</Text>
          <Text style={styles.controlText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={onConnect}>
          <Text style={styles.controlIcon}>🤝</Text>
          <Text style={styles.controlText}>Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={onClose}>
          <Text style={styles.controlIcon}>✕</Text>
          <Text style={styles.controlText}>Close</Text>
        </TouchableOpacity>
      </View>

      {/* AR Info Panel */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoPanelTitle}>AR Business Card</Text>
        <Text style={styles.infoPanelText}>
          {isHolographic ? '🌟 Holographic Mode' : '📱 Standard View'}
        </Text>
        {cardData.nftTokenId && (
          <Text style={styles.infoPanelText}>
            🎨 NFT Token: {cardData.nftTokenId.substring(0, 8)}...
          </Text>
        )}
        <Text style={styles.instructionText}>
          • Drag to rotate • Tap to expand • Swipe to interact
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    alignItems: 'center',
  },
  card: {
    width: 320,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  cardSide: {
    flex: 1,
    padding: 20,
    position: 'relative',
  },
  holographicGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
      linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px',
  },
  scanlines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(255,255,255,0.05) 2px,
        rgba(255,255,255,0.05) 4px
      )
    `,
  },
  verificationBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationIcon: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  nftBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nftText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  avatarGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    top: -10,
    left: -10,
  },
  cardInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    fontFamily: FONTS.medium,
    marginBottom: 2,
    textAlign: 'center',
  },
  cardCompany: {
    fontSize: 16,
    color: COLORS.white,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
  contactInfo: {
    alignItems: 'center',
  },
  contactText: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    fontFamily: FONTS.regular,
    marginBottom: 2,
  },
  bioSection: {
    marginBottom: 20,
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  socialButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  socialIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  socialText: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: FONTS.medium,
  },
  qrCodeContainer: {
    alignItems: 'center',
  },
  qrCode: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 8,
  },
  qrText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  qrLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    fontFamily: FONTS.regular,
  },
  holographicBase: {
    width: 340,
    height: 20,
    borderRadius: 170,
    backgroundColor: COLORS.primary,
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  arControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 60,
  },
  controlIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  controlText: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: FONTS.medium,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  infoPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  infoPanelText: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    fontFamily: FONTS.regular,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.7,
    fontFamily: FONTS.regular,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default ARBusinessCardViewer;
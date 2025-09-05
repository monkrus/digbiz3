import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface AROverlayProps {
  isScanning: boolean;
  scanAnimation: Animated.Value;
}

const AROverlay: React.FC<AROverlayProps> = ({ isScanning, scanAnimation }) => {
  const scanLineTranslateY = scanAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200], // Scan line moves 200px
  });

  const scanLineOpacity = scanAnimation.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0.3, 1, 1, 0.3],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Corner Frame */}
      <View style={styles.frame}>
        {/* Top corners */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        
        {/* Bottom corners */}
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        
        {/* Scanning line */}
        {isScanning && (
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [{ translateY: scanLineTranslateY }],
                opacity: scanLineOpacity,
              },
            ]}
          >
            <LinearGradient
              colors={[
                'transparent',
                COLORS.primary,
                COLORS.primaryLight,
                COLORS.primary,
                'transparent',
              ]}
              style={styles.scanLineGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
        )}
        
        {/* Center crosshair */}
        <View style={styles.crosshair}>
          <View style={styles.crosshairHorizontal} />
          <View style={styles.crosshairVertical} />
        </View>
      </View>

      {/* AR Indicators */}
      <View style={styles.indicators}>
        {/* Left indicator */}
        <View style={styles.leftIndicator}>
          <View style={styles.indicatorDot} />
          <Text style={styles.indicatorText}>AR</Text>
        </View>
        
        {/* Right indicator */}
        <View style={styles.rightIndicator}>
          <View style={styles.indicatorDot} />
          <Text style={styles.indicatorText}>AI</Text>
        </View>
      </View>

      {/* Scan progress bars (optional) */}
      <View style={styles.progressBars}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: scanAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: 280,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 15,
    right: 15,
    height: 2,
  },
  scanLineGradient: {
    flex: 1,
    borderRadius: 1,
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
    width: 20,
    height: 20,
  },
  crosshairHorizontal: {
    position: 'absolute',
    top: 9,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  crosshairVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 9,
    width: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  indicators: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  leftIndicator: {
    alignItems: 'center',
  },
  rightIndicator: {
    alignItems: 'center',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginBottom: 4,
  },
  indicatorText: {
    fontSize: FONTS.xs,
    fontFamily: FONTS.bold,
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressBars: {
    position: 'absolute',
    bottom: '25%',
    left: 40,
    right: 40,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 1.5,
  },
});

export default AROverlay;
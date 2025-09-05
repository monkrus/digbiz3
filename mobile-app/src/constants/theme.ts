// Theme Constants for DigBiz3 Mobile App

export const COLORS = {
  // Primary Brand Colors
  primary: '#6366F1',
  primaryLight: '#8B5CF6',
  primaryDark: '#4F46E5',
  
  // Secondary Colors
  secondary: '#F59E0B',
  secondaryLight: '#FCD34D',
  secondaryDark: '#D97706',
  
  // Accent Colors
  accent: '#10B981',
  accentLight: '#34D399',
  accentDark: '#059669',
  
  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Neutral Colors
  black: '#000000',
  white: '#FFFFFF',
  
  // Gray Scale
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // App Specific Colors
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceDark: '#F8FAFC',
  
  // Text Colors
  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textPlaceholder: '#D1D5DB',
  textInverse: '#FFFFFF',
  
  // Border Colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
  
  // Premium Colors
  gold: '#F59E0B',
  platinum: '#6B7280',
  diamond: '#8B5CF6',
  
  // AR/VR Colors
  neon: '#00D4AA',
  cyber: '#FF6B6B',
  hologram: '#4ECDC4',
  
  // Subscription Tiers
  free: '#9CA3AF',
  professional: '#6366F1',
  enterprise: '#7C3AED',
};

export const FONTS = {
  // Font Families
  regular: 'System',
  medium: 'System',
  bold: 'System',
  
  // Font Sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
};

export const LAYOUT = {
  // Screen Dimensions
  window: {
    width: 375, // Default iPhone width
    height: 812, // Default iPhone height
  },
  
  // Common Sizes
  headerHeight: 56,
  tabBarHeight: 70,
  buttonHeight: 48,
  inputHeight: 44,
  
  // Safe Areas
  safeAreaTop: 44,
  safeAreaBottom: 34,
};

export const ANIMATIONS = {
  // Duration
  fast: 150,
  medium: 300,
  slow: 500,
  
  // Easing
  easeInOut: 'ease-in-out',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  linear: 'linear',
};

// Theme object for easy access
export const THEME = {
  colors: COLORS,
  fonts: FONTS,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  layout: LAYOUT,
  animations: ANIMATIONS,
};

// Subscription tier specific styling
export const SUBSCRIPTION_THEMES = {
  FREE: {
    primaryColor: COLORS.free,
    gradient: ['#9CA3AF', '#6B7280'],
    icon: '🆓',
  },
  PROFESSIONAL: {
    primaryColor: COLORS.professional,
    gradient: ['#6366F1', '#8B5CF6'],
    icon: '⭐',
  },
  ENTERPRISE: {
    primaryColor: COLORS.enterprise,
    gradient: ['#7C3AED', '#A855F7'],
    icon: '💎',
  },
};

export default THEME;
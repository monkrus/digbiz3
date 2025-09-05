import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { View, Text, ActivityIndicator } from 'react-native';

// Redux Store
import { store, persistor } from './src/store';

// Screens
import AuthScreen from './src/screens/auth/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import NetworkScreen from './src/screens/NetworkScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import AIInsightsScreen from './src/screens/premium/AIInsightsScreen';
import ARScannerScreen from './src/screens/ar/ARScannerScreen';
import SubscriptionScreen from './src/screens/premium/SubscriptionScreen';

// Premium Screens
import MarketIntelScreen from './src/screens/premium/MarketIntelScreen';
import NetworkAnalyticsScreen from './src/screens/premium/NetworkAnalyticsScreen';
import DealMakerScreen from './src/screens/premium/DealMakerScreen';

// Components
import LoadingScreen from './src/components/LoadingScreen';

// Constants
import { COLORS, FONTS } from './src/constants/theme';

// Hooks
import { useAuth } from './src/hooks/useAuth';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Tab Icon Component
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={{ 
    fontSize: 24, 
    opacity: focused ? 1 : 0.6,
    color: focused ? COLORS.primary : COLORS.textMuted
  }}>
    {name}
  </Text>
);

// Main Tab Navigator
const MainTabs = () => {
  const { user } = useAuth();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.borderLight,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
          fontFamily: FONTS.medium,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="🏠" focused={focused} />,
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Network"
        component={NetworkScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="🌐" focused={focused} />,
          tabBarLabel: 'Network',
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="💬" focused={focused} />,
          tabBarLabel: 'Messages',
        }}
      />
      {(user?.subscriptionTier === 'PROFESSIONAL' || user?.subscriptionTier === 'ENTERPRISE') && (
        <Tab.Screen
          name="AI Insights"
          component={AIInsightsScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="🤖" focused={focused} />,
            tabBarLabel: 'AI Insights',
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="👤" focused={focused} />,
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth Stack
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen 
            name="MarketIntel" 
            component={MarketIntelScreen}
            options={{
              headerShown: true,
              title: 'Market Intelligence',
              headerStyle: { backgroundColor: COLORS.primary },
              headerTintColor: COLORS.white,
              headerTitleStyle: { fontFamily: FONTS.bold }
            }}
          />
          <Stack.Screen 
            name="NetworkAnalytics" 
            component={NetworkAnalyticsScreen}
            options={{
              headerShown: true,
              title: 'Network Analytics',
              headerStyle: { backgroundColor: COLORS.primary },
              headerTintColor: COLORS.white,
              headerTitleStyle: { fontFamily: FONTS.bold }
            }}
          />
          <Stack.Screen 
            name="DealMaker" 
            component={DealMakerScreen}
            options={{
              headerShown: true,
              title: 'AI Deal Assistant',
              headerStyle: { backgroundColor: COLORS.primary },
              headerTintColor: COLORS.white,
              headerTitleStyle: { fontFamily: FONTS.bold }
            }}
          />
          <Stack.Screen 
            name="ARScanner" 
            component={ARScannerScreen}
            options={{
              headerShown: true,
              title: 'AR Business Card',
              headerStyle: { backgroundColor: COLORS.black },
              headerTintColor: COLORS.white,
              headerTitleStyle: { fontFamily: FONTS.bold }
            }}
          />
          <Stack.Screen 
            name="Subscription" 
            component={SubscriptionScreen}
            options={{
              headerShown: true,
              title: 'Subscription Plans',
              headerStyle: { backgroundColor: COLORS.primary },
              headerTintColor: COLORS.white,
              headerTitleStyle: { fontFamily: FONTS.bold }
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

// Loading Component for PersistGate
const Loading = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={{ 
      marginTop: 16, 
      fontSize: 16, 
      color: COLORS.textSecondary,
      fontFamily: FONTS.medium 
    }}>
      Loading DigBiz3...
    </Text>
  </View>
);

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<Loading />} persistor={persistor}>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor={COLORS.primary} />
          <AppNavigator />
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
}
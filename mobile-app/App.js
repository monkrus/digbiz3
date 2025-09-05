import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import NetworkScreen from './src/screens/NetworkScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Import theme
import { COLORS } from './src/constants/theme';

const Tab = createBottomTabNavigator();

// Simple icon component for tabs
const TabIcon = ({ name, focused }) => (
  <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.6 }}>
    {name}
  </Text>
);

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.background,
            borderTopColor: COLORS.borderLight,
            paddingTop: 8,
            paddingBottom: 8,
            height: 70,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="🏠" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Network"
          component={NetworkScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="👥" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon name="👤" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

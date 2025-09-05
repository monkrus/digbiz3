import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { useLoginMutation, useRegisterMutation } from '../store/api/apiSlice';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  clearError,
} from '../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isLoading, error } = useAppSelector(
    (state) => state.auth
  );

  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        dispatch(loginStart());
        const result = await loginMutation({ email, password }).unwrap();
        
        // Store token in AsyncStorage
        await AsyncStorage.setItem('authToken', result.token);
        
        dispatch(loginSuccess(result));
        return { success: true, user: result.user };
      } catch (error: any) {
        const errorMessage = error?.data?.error || 'Login failed';
        dispatch(loginFailure(errorMessage));
        return { success: false, error: errorMessage };
      }
    },
    [dispatch, loginMutation]
  );

  const register = useCallback(
    async (userData: {
      email: string;
      username: string;
      password: string;
      firstName: string;
      lastName: string;
      company?: string;
      position?: string;
      industry?: string;
      location?: string;
    }) => {
      try {
        dispatch(loginStart()); // Reuse loading state
        const result = await registerMutation(userData).unwrap();
        
        // Store token in AsyncStorage
        await AsyncStorage.setItem('authToken', result.token);
        
        dispatch(loginSuccess(result));
        return { success: true, user: result.user };
      } catch (error: any) {
        const errorMessage = error?.data?.error || 'Registration failed';
        dispatch(loginFailure(errorMessage));
        return { success: false, error: errorMessage };
      }
    },
    [dispatch, registerMutation]
  );

  const signOut = useCallback(async () => {
    try {
      // Remove token from AsyncStorage
      await AsyncStorage.removeItem('authToken');
      
      dispatch(logout());
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  }, [dispatch]);

  const updateProfile = useCallback(
    (updates: Partial<typeof user>) => {
      dispatch(updateUser(updates));
    },
    [dispatch]
  );

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Check if user has premium subscription
  const hasPremiumAccess = useCallback(() => {
    return user?.subscriptionTier === 'PROFESSIONAL' || user?.subscriptionTier === 'ENTERPRISE';
  }, [user]);

  const hasEnterpriseAccess = useCallback(() => {
    return user?.subscriptionTier === 'ENTERPRISE';
  }, [user]);

  // Get user's subscription tier display info
  const getSubscriptionInfo = useCallback(() => {
    if (!user) return null;
    
    const tierInfo = {
      FREE: {
        name: 'Free',
        color: '#9CA3AF',
        icon: '🆓',
        features: ['5 connections/month', '50 messages/month', 'Basic matching'],
      },
      PROFESSIONAL: {
        name: 'Professional',
        color: '#6366F1',
        icon: '⭐',
        features: ['Unlimited connections', 'Advanced AI', 'Video meetings', 'Analytics'],
      },
      ENTERPRISE: {
        name: 'Enterprise',
        color: '#7C3AED',
        icon: '💎',
        features: ['All Professional features', 'Team management', 'API access', 'White labeling'],
      },
    };

    return tierInfo[user.subscriptionTier as keyof typeof tierInfo];
  }, [user]);

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    signOut,
    updateProfile,
    clearAuthError,
    
    // Computed
    hasPremiumAccess,
    hasEnterpriseAccess,
    getSubscriptionInfo,
  };
};
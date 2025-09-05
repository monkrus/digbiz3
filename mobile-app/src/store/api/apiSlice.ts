import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  company?: string;
  position?: string;
  industry?: string;
  location?: string;
  subscriptionTier: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE';
  reputation: number;
  networkValue: number;
  totalRevenue: number;
  isVerified: boolean;
}

export interface Connection {
  id: string;
  user: User;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  matchScore?: number;
  createdAt: string;
  updatedAt: string;
  isRequester: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VOICE' | 'VIDEO' | 'AR_CARD';
  isRead: boolean;
  createdAt: string;
  sender?: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  value?: number;
  currency: string;
  status: 'NEGOTIATING' | 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  partnerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIInsight {
  id: string;
  insightType: string;
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  priority: number;
  isRead: boolean;
  createdAt: string;
}

export interface MarketTrend {
  id: string;
  industry: string;
  trend: string;
  impact: string;
  description: string;
  confidence: number;
  createdAt: string;
}

// Base query with auth
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v2',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// API Slice
export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Connection', 'Message', 'Deal', 'AIInsight', 'MarketTrend'],
  endpoints: (builder) => ({
    // Auth Endpoints
    login: builder.mutation<
      { user: User; token: string },
      { email: string; password: string }
    >({
      query: (credentials) => ({
        url: '/users/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation<
      { user: User; token: string },
      {
        email: string;
        username: string;
        password: string;
        firstName: string;
        lastName: string;
        company?: string;
        position?: string;
        industry?: string;
        location?: string;
      }
    >({
      query: (userData) => ({
        url: '/users/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),

    // User Endpoints
    getProfile: builder.query<{ user: User }, void>({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation<
      { user: User },
      Partial<User>
    >({
      query: (updates) => ({
        url: '/users/profile',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['User'],
    }),

    searchUsers: builder.query<
      { users: User[]; total: number },
      { query?: string; industry?: string; location?: string; limit?: number }
    >({
      query: (params) => ({
        url: '/users/search',
        params,
      }),
    }),

    // Connection Endpoints
    getConnections: builder.query<
      { connections: Connection[]; total: number },
      { status?: string; limit?: number }
    >({
      query: (params) => ({
        url: '/connections/list',
        params,
      }),
      providesTags: ['Connection'],
    }),

    sendConnectionRequest: builder.mutation<
      Connection,
      { receiverId: string; message?: string }
    >({
      query: (data) => ({
        url: '/connections/request',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Connection'],
    }),

    respondToConnection: builder.mutation<
      Connection,
      { connectionId: string; action: 'ACCEPTED' | 'REJECTED' }
    >({
      query: ({ connectionId, action }) => ({
        url: `/connections/${connectionId}/respond`,
        method: 'PUT',
        body: { action },
      }),
      invalidatesTags: ['Connection'],
    }),

    getPendingRequests: builder.query<
      { requests: Connection[]; total: number },
      void
    >({
      query: () => '/connections/pending',
      providesTags: ['Connection'],
    }),

    // Message Endpoints
    getMessages: builder.query<
      Message[],
      { receiverId: string; limit?: number }
    >({
      query: (params) => ({
        url: '/messages',
        params,
      }),
      providesTags: ['Message'],
    }),

    sendMessage: builder.mutation<
      Message,
      { receiverId: string; content: string; messageType?: string }
    >({
      query: (data) => ({
        url: '/messages/send',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Message'],
    }),

    // Deal Endpoints
    getDeals: builder.query<Deal[], void>({
      query: () => '/deals',
      providesTags: ['Deal'],
    }),

    createDeal: builder.mutation<
      Deal,
      {
        participantId: string;
        title: string;
        description: string;
        value?: number;
      }
    >({
      query: (data) => ({
        url: '/deals/facilitate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Deal'],
    }),

    // Premium/AI Endpoints
    getNetworkValue: builder.query<
      {
        networkValue: number;
        growth: string;
        insights: AIInsight[];
        roi: number;
      },
      void
    >({
      query: () => '/analytics/network-value',
    }),

    getAIInsights: builder.query<
      {
        opportunities: AIInsight[];
        totalOpportunities: number;
        highPriority: number;
      },
      void
    >({
      query: () => '/insights/opportunities',
      providesTags: ['AIInsight'],
    }),

    getMarketTrends: builder.query<
      MarketTrend,
      { industry?: string }
    >({
      query: (params) => ({
        url: '/intelligence/market-trends',
        params,
      }),
      providesTags: ['MarketTrend'],
    }),

    predictSuccess: builder.mutation<
      {
        successProbability: number;
        confidence: number;
        recommendations: string[];
      },
      {
        partnerId?: string;
        context?: string;
        dealData?: any;
      }
    >({
      query: (data) => ({
        url: '/ai/predict-success',
        method: 'POST',
        body: data,
      }),
    }),

    smartMatching: builder.mutation<
      {
        matches: any[];
        totalMatches: number;
        algorithm: string;
      },
      {
        preferences?: any;
        location?: string;
        industry?: string;
      }
    >({
      query: (data) => ({
        url: '/matching/smart-match',
        method: 'POST',
        body: data,
      }),
    }),

    // Subscription Endpoints
    subscribe: builder.mutation<
      any,
      { tier: 'PROFESSIONAL' | 'ENTERPRISE'; paymentMethodId: string }
    >({
      query: (data) => ({
        url: '/payments/subscribe',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    getRevenueAttribution: builder.query<
      {
        totalRevenue: number;
        dealsCompleted: number;
        averageDealSize: number;
        commissionEarned: number;
        networkGrowthImpact: string;
        roi: string;
      },
      { startDate?: string; endDate?: string }
    >({
      query: (params) => ({
        url: '/revenue/attribution',
        params,
      }),
    }),

    // AR Endpoints
    scanARCard: builder.mutation<
      {
        extractedInfo: any;
        matchScore: number;
        arEnabled: boolean;
        holographicData: any;
      },
      { imageData: string; location?: string }
    >({
      query: (data) => ({
        url: '/ar/scan-card',
        method: 'POST',
        body: data,
      }),
    }),

    getVRMeetingRooms: builder.query<
      {
        availableRooms: any[];
        currentOccupancy: number;
        maxCapacity: number;
      },
      void
    >({
      query: () => '/ar/meeting-rooms',
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useSearchUsersQuery,
  useGetConnectionsQuery,
  useSendConnectionRequestMutation,
  useRespondToConnectionMutation,
  useGetPendingRequestsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useGetDealsQuery,
  useCreateDealMutation,
  useGetNetworkValueQuery,
  useGetAIInsightsQuery,
  useGetMarketTrendsQuery,
  usePredictSuccessMutation,
  useSmartMatchingMutation,
  useSubscribeMutation,
  useGetRevenueAttributionQuery,
  useScanARCardMutation,
  useGetVRMeetingRoomsQuery,
} = api;
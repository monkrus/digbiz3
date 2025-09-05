import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Connection, User } from '../api/apiSlice';

interface NetworkState {
  connections: Connection[];
  pendingRequests: Connection[];
  searchResults: User[];
  smartMatches: any[];
  selectedConnection: Connection | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status: 'all' | 'ACCEPTED' | 'PENDING' | 'REJECTED';
    industry?: string;
    location?: string;
  };
}

const initialState: NetworkState = {
  connections: [],
  pendingRequests: [],
  searchResults: [],
  smartMatches: [],
  selectedConnection: null,
  isLoading: false,
  error: null,
  filters: {
    status: 'all',
  },
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setConnections: (state, action: PayloadAction<Connection[]>) => {
      state.connections = action.payload;
    },
    addConnection: (state, action: PayloadAction<Connection>) => {
      state.connections.push(action.payload);
    },
    updateConnection: (state, action: PayloadAction<Connection>) => {
      const index = state.connections.findIndex(conn => conn.id === action.payload.id);
      if (index !== -1) {
        state.connections[index] = action.payload;
      }
    },
    removeConnection: (state, action: PayloadAction<string>) => {
      state.connections = state.connections.filter(conn => conn.id !== action.payload);
    },
    setPendingRequests: (state, action: PayloadAction<Connection[]>) => {
      state.pendingRequests = action.payload;
    },
    removePendingRequest: (state, action: PayloadAction<string>) => {
      state.pendingRequests = state.pendingRequests.filter(req => req.id !== action.payload);
    },
    setSearchResults: (state, action: PayloadAction<User[]>) => {
      state.searchResults = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    setSmartMatches: (state, action: PayloadAction<any[]>) => {
      state.smartMatches = action.payload;
    },
    setSelectedConnection: (state, action: PayloadAction<Connection | null>) => {
      state.selectedConnection = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<NetworkState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setConnections,
  addConnection,
  updateConnection,
  removeConnection,
  setPendingRequests,
  removePendingRequest,
  setSearchResults,
  clearSearchResults,
  setSmartMatches,
  setSelectedConnection,
  setFilters,
  clearError,
} = networkSlice.actions;

export default networkSlice.reducer;
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupListeners } from '@reduxjs/toolkit/query';

// API Slice
import { api } from './api/apiSlice';

// Feature Slices
import authSlice from './slices/authSlice';
import networkSlice from './slices/networkSlice';
import messagesSlice from './slices/messagesSlice';
import premiumSlice from './slices/premiumSlice';
import arSlice from './slices/arSlice';
import analyticsSlice from './slices/analyticsSlice';

// Persist Config
const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'network', 'premium'], // Only persist certain slices
  blacklist: ['api'], // Don't persist API cache
};

// Root Reducer
const rootReducer = combineReducers({
  auth: authSlice,
  network: networkSlice,
  messages: messagesSlice,
  premium: premiumSlice,
  ar: arSlice,
  analytics: analyticsSlice,
  api: api.reducer,
});

// Persisted Reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure Store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(api.middleware),
  devTools: __DEV__, // Only enable in development
});

// Setup RTK Query listeners
setupListeners(store.dispatch);

// Create persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
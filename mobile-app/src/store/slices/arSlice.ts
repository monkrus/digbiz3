import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ARBusinessCard {
  id: string;
  userId: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone?: string;
  avatar?: string;
  holographicData?: any;
  scannedAt: string;
  matchScore?: number;
}

interface VRMeetingRoom {
  id: string;
  name: string;
  capacity: number;
  environment: string;
  features: string[];
  participants?: any[];
  isActive: boolean;
}

interface ARState {
  // AR Business Cards
  scannedCards: ARBusinessCard[];
  userARCard?: {
    cardData: any;
    qrCode?: string;
    nftTokenId?: string;
    isActive: boolean;
    scanCount: number;
  };
  
  // Camera and Scanning
  isCameraActive: boolean;
  isScanningMode: boolean;
  scanningResults: any | null;
  lastScanResult?: ARBusinessCard;
  
  // VR Meeting Rooms
  availableRooms: VRMeetingRoom[];
  currentRoom?: VRMeetingRoom;
  roomParticipants: any[];
  
  // AR Features
  arFeatures: {
    businessCardScanning: boolean;
    holographicDisplay: boolean;
    contextualInformation: boolean;
    virtualMeetingRooms: boolean;
    productDemonstrations: boolean;
  };
  
  // User Position and Avatar (for VR)
  userPosition: {
    x: number;
    y: number;
    z: number;
    rotation: number;
  };
  userAvatar: {
    model: string;
    animations: string[];
    customizations: any;
  };
  
  // State
  isLoading: boolean;
  error: string | null;
  permissions: {
    camera: boolean;
    location: boolean;
    microphone: boolean;
  };
}

const initialState: ARState = {
  scannedCards: [],
  userARCard: undefined,
  
  isCameraActive: false,
  isScanningMode: false,
  scanningResults: null,
  lastScanResult: undefined,
  
  availableRooms: [],
  currentRoom: undefined,
  roomParticipants: [],
  
  arFeatures: {
    businessCardScanning: true,
    holographicDisplay: true,
    contextualInformation: true,
    virtualMeetingRooms: true,
    productDemonstrations: false,
  },
  
  userPosition: {
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
  },
  userAvatar: {
    model: 'default_business_avatar',
    animations: ['idle', 'wave', 'handshake', 'presentation'],
    customizations: {},
  },
  
  isLoading: false,
  error: null,
  permissions: {
    camera: false,
    location: false,
    microphone: false,
  },
};

const arSlice = createSlice({
  name: 'ar',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Camera and Scanning
    setCameraActive: (state, action: PayloadAction<boolean>) => {
      state.isCameraActive = action.payload;
      if (!action.payload) {
        state.isScanningMode = false;
        state.scanningResults = null;
      }
    },
    setScanningMode: (state, action: PayloadAction<boolean>) => {
      state.isScanningMode = action.payload;
      if (!action.payload) {
        state.scanningResults = null;
      }
    },
    setScanningResults: (state, action: PayloadAction<any>) => {
      state.scanningResults = action.payload;
    },
    clearScanningResults: (state) => {
      state.scanningResults = null;
    },
    
    // AR Business Cards
    addScannedCard: (state, action: PayloadAction<ARBusinessCard>) => {
      // Check if card already exists
      const existingIndex = state.scannedCards.findIndex(
        card => card.email === action.payload.email
      );
      
      if (existingIndex !== -1) {
        // Update existing card
        state.scannedCards[existingIndex] = action.payload;
      } else {
        // Add new card
        state.scannedCards.unshift(action.payload);
      }
      
      state.lastScanResult = action.payload;
    },
    updateScannedCard: (state, action: PayloadAction<ARBusinessCard>) => {
      const index = state.scannedCards.findIndex(card => card.id === action.payload.id);
      if (index !== -1) {
        state.scannedCards[index] = action.payload;
      }
    },
    removeScannedCard: (state, action: PayloadAction<string>) => {
      state.scannedCards = state.scannedCards.filter(card => card.id !== action.payload);
    },
    setUserARCard: (state, action: PayloadAction<ARState['userARCard']>) => {
      state.userARCard = action.payload;
    },
    updateUserARCardScanCount: (state) => {
      if (state.userARCard) {
        state.userARCard.scanCount += 1;
      }
    },
    
    // VR Meeting Rooms
    setAvailableRooms: (state, action: PayloadAction<VRMeetingRoom[]>) => {
      state.availableRooms = action.payload;
    },
    joinVRRoom: (state, action: PayloadAction<VRMeetingRoom>) => {
      state.currentRoom = action.payload;
      state.roomParticipants = action.payload.participants || [];
    },
    leaveVRRoom: (state) => {
      state.currentRoom = undefined;
      state.roomParticipants = [];
      state.userPosition = initialState.userPosition;
    },
    updateRoomParticipants: (state, action: PayloadAction<any[]>) => {
      state.roomParticipants = action.payload;
    },
    addRoomParticipant: (state, action: PayloadAction<any>) => {
      const exists = state.roomParticipants.find(p => p.userId === action.payload.userId);
      if (!exists) {
        state.roomParticipants.push(action.payload);
      }
    },
    removeRoomParticipant: (state, action: PayloadAction<string>) => {
      state.roomParticipants = state.roomParticipants.filter(p => p.userId !== action.payload);
    },
    updateParticipantPosition: (state, action: PayloadAction<{ userId: string; position: any; rotation?: number }>) => {
      const participant = state.roomParticipants.find(p => p.userId === action.payload.userId);
      if (participant) {
        participant.position = action.payload.position;
        if (action.payload.rotation !== undefined) {
          participant.rotation = action.payload.rotation;
        }
      }
    },
    
    // User Position and Avatar
    updateUserPosition: (state, action: PayloadAction<Partial<ARState['userPosition']>>) => {
      state.userPosition = { ...state.userPosition, ...action.payload };
    },
    setUserAvatar: (state, action: PayloadAction<Partial<ARState['userAvatar']>>) => {
      state.userAvatar = { ...state.userAvatar, ...action.payload };
    },
    
    // AR Features
    setARFeature: (state, action: PayloadAction<{ feature: keyof ARState['arFeatures']; enabled: boolean }>) => {
      state.arFeatures[action.payload.feature] = action.payload.enabled;
    },
    
    // Permissions
    setPermissions: (state, action: PayloadAction<Partial<ARState['permissions']>>) => {
      state.permissions = { ...state.permissions, ...action.payload };
    },
    setPermission: (state, action: PayloadAction<{ permission: keyof ARState['permissions']; granted: boolean }>) => {
      state.permissions[action.payload.permission] = action.payload.granted;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    reset: () => initialState,
  },
});

export const {
  setLoading,
  setError,
  setCameraActive,
  setScanningMode,
  setScanningResults,
  clearScanningResults,
  addScannedCard,
  updateScannedCard,
  removeScannedCard,
  setUserARCard,
  updateUserARCardScanCount,
  setAvailableRooms,
  joinVRRoom,
  leaveVRRoom,
  updateRoomParticipants,
  addRoomParticipant,
  removeRoomParticipant,
  updateParticipantPosition,
  updateUserPosition,
  setUserAvatar,
  setARFeature,
  setPermissions,
  setPermission,
  clearError,
  reset,
} = arSlice.actions;

export default arSlice.reducer;
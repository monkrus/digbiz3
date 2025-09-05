import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Message } from '../api/apiSlice';

interface Conversation {
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  isOnline: boolean;
  lastSeen?: string;
}

interface MessagesState {
  conversations: Conversation[];
  currentConversation: string | null;
  messages: { [conversationId: string]: Message[] };
  isLoading: boolean;
  error: string | null;
  typingUsers: { [userId: string]: boolean };
  searchQuery: string;
}

const initialState: MessagesState = {
  conversations: [],
  currentConversation: null,
  messages: {},
  isLoading: false,
  error: null,
  typingUsers: {},
  searchQuery: '',
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.find(conv => conv.userId === action.payload.userId);
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },
    updateConversation: (state, action: PayloadAction<Partial<Conversation> & { userId: string }>) => {
      const index = state.conversations.findIndex(conv => conv.userId === action.payload.userId);
      if (index !== -1) {
        state.conversations[index] = { ...state.conversations[index], ...action.payload };
      }
    },
    setCurrentConversation: (state, action: PayloadAction<string | null>) => {
      state.currentConversation = action.payload;
      
      // Mark messages as read when entering conversation
      if (action.payload) {
        const conversation = state.conversations.find(conv => conv.userId === action.payload);
        if (conversation) {
          conversation.unreadCount = 0;
        }
      }
    },
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<{ conversationId: string; message: Message }>) => {
      const { conversationId, message } = action.payload;
      
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      
      state.messages[conversationId].push(message);
      
      // Update conversation
      const conversation = state.conversations.find(conv => conv.userId === conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        if (state.currentConversation !== conversationId) {
          conversation.unreadCount += 1;
        }
        
        // Move conversation to top
        const index = state.conversations.findIndex(conv => conv.userId === conversationId);
        if (index > 0) {
          const [conv] = state.conversations.splice(index, 1);
          state.conversations.unshift(conv);
        }
      }
    },
    updateMessage: (state, action: PayloadAction<{ conversationId: string; message: Message }>) => {
      const { conversationId, message } = action.payload;
      const messages = state.messages[conversationId];
      
      if (messages) {
        const index = messages.findIndex(msg => msg.id === message.id);
        if (index !== -1) {
          messages[index] = message;
        }
      }
    },
    markMessagesAsRead: (state, action: PayloadAction<{ conversationId: string; messageIds: string[] }>) => {
      const { conversationId, messageIds } = action.payload;
      const messages = state.messages[conversationId];
      
      if (messages) {
        messages.forEach(message => {
          if (messageIds.includes(message.id)) {
            message.isRead = true;
          }
        });
      }
      
      // Update conversation unread count
      const conversation = state.conversations.find(conv => conv.userId === conversationId);
      if (conversation) {
        conversation.unreadCount = Math.max(0, conversation.unreadCount - messageIds.length);
      }
    },
    setTypingUser: (state, action: PayloadAction<{ userId: string; isTyping: boolean }>) => {
      const { userId, isTyping } = action.payload;
      if (isTyping) {
        state.typingUsers[userId] = true;
      } else {
        delete state.typingUsers[userId];
      }
    },
    setUserOnlineStatus: (state, action: PayloadAction<{ userId: string; isOnline: boolean; lastSeen?: string }>) => {
      const conversation = state.conversations.find(conv => conv.userId === action.payload.userId);
      if (conversation) {
        conversation.isOnline = action.payload.isOnline;
        if (action.payload.lastSeen) {
          conversation.lastSeen = action.payload.lastSeen;
        }
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearMessages: (state, action: PayloadAction<string>) => {
      delete state.messages[action.payload];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setConversations,
  addConversation,
  updateConversation,
  setCurrentConversation,
  setMessages,
  addMessage,
  updateMessage,
  markMessagesAsRead,
  setTypingUser,
  setUserOnlineStatus,
  setSearchQuery,
  clearMessages,
  clearError,
} = messagesSlice.actions;

export default messagesSlice.reducer;
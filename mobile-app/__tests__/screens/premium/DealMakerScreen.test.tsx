import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DealMakerScreen from '../../../src/screens/premium/DealMakerScreen';
import { createMockStore, mockApiService } from '../../utils/testHelpers';

// Mock dependencies
jest.mock('../../../src/services/apiService');
jest.mock('../../../src/constants/theme', () => ({
  COLORS: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#6D6D80',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500'
  },
  FONTS: {
    regular: 'System',
    medium: 'System',
    bold: 'System'
  }
}));

describe('DealMakerScreen', () => {
  let store: ReturnType<typeof configureStore>;
  let mockApi: jest.Mocked<typeof mockApiService>;

  const renderComponent = (user = { subscriptionTier: 'PROFESSIONAL' }) => {
    store = createMockStore({
      auth: { user, isAuthenticated: true },
      deals: {
        items: [],
        loading: false,
        creating: false,
        error: null
      }
    });

    return render(
      <Provider store={store}>
        <DealMakerScreen />
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi = mockApiService;
  });

  describe('Subscription Tier Access Control', () => {
    it('should display premium feature access for professional users', () => {
      const { getByText, getByTestId } = renderComponent({ 
        subscriptionTier: 'PROFESSIONAL' 
      });

      expect(getByText('🤖 AI Deal Assistant')).toBeTruthy();
      expect(getByText('Smart deal analysis and success prediction')).toBeTruthy();
      expect(getByTestId('deal-stats')).toBeTruthy();
      expect(getByTestId('create-deal-button')).toBeTruthy();
    });

    it('should display premium feature access for enterprise users', () => {
      const { getByText, getByTestId } = renderComponent({ 
        subscriptionTier: 'ENTERPRISE' 
      });

      expect(getByText('🤖 AI Deal Assistant')).toBeTruthy();
      expect(getByTestId('deal-stats')).toBeTruthy();
      expect(getByTestId('create-deal-button')).toBeTruthy();
    });

    it('should show upgrade prompt for free users', () => {
      const { getByText, queryByTestId } = renderComponent({ 
        subscriptionTier: 'FREE' 
      });

      expect(getByText('🔒 Premium Feature')).toBeTruthy();
      expect(getByText('AI Deal Assistant requires Professional or Enterprise subscription')).toBeTruthy();
      expect(getByText('Upgrade Now')).toBeTruthy();
      
      // Should not show premium features
      expect(queryByTestId('deal-stats')).toBeFalsy();
      expect(queryByTestId('create-deal-button')).toBeFalsy();
    });

    it('should handle upgrade button press for free users', () => {
      const { getByText } = renderComponent({ subscriptionTier: 'FREE' });
      
      const upgradeButton = getByText('Upgrade Now');
      fireEvent.press(upgradeButton);
      
      // Would typically navigate to subscription screen
      // This would be tested with navigation mocks
    });
  });

  describe('Deal Overview Statistics', () => {
    it('should display deal statistics correctly', async () => {
      const mockDeals = [
        { id: '1', status: 'negotiating', value: 50000 },
        { id: '2', status: 'completed', value: 75000 },
        { id: '3', status: 'pending', value: 30000 }
      ];

      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: mockDeals } }
      });

      const { getByText, getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('total-deals-stat')).toBeTruthy();
        expect(getByTestId('active-deals-stat')).toBeTruthy();
        expect(getByTestId('completed-deals-stat')).toBeTruthy();
        expect(getByTestId('total-value-stat')).toBeTruthy();
      });

      expect(getByText('3')).toBeTruthy(); // Total deals
      expect(getByText('2')).toBeTruthy(); // Active deals (negotiating + pending)
      expect(getByText('1')).toBeTruthy(); // Completed deals
      expect(getByText('$155,000')).toBeTruthy(); // Total value
    });

    it('should handle empty deals state', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [] } }
      });

      const { getByText } = renderComponent();

      await waitFor(() => {
        expect(getByText('No deals yet')).toBeTruthy();
        expect(getByText('Create your first deal to get AI-powered insights')).toBeTruthy();
      });
    });
  });

  describe('Deal Creation Flow', () => {
    it('should open deal creation modal', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [] } }
      });

      const { getByTestId, getByText } = renderComponent();

      await waitFor(() => {
        const createButton = getByTestId('create-deal-button');
        fireEvent.press(createButton);
      });

      expect(getByText('Create New Deal')).toBeTruthy();
      expect(getByTestId('deal-title-input')).toBeTruthy();
      expect(getByTestId('deal-description-input')).toBeTruthy();
      expect(getByTestId('deal-value-input')).toBeTruthy();
    });

    it('should validate required fields', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [] } }
      });

      const { getByTestId, getByText } = renderComponent();

      // Open modal
      await waitFor(() => {
        fireEvent.press(getByTestId('create-deal-button'));
      });

      // Try to submit without filling fields
      const submitButton = getByTestId('submit-deal-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Please fill in all required fields')).toBeTruthy();
      });
    });

    it('should create deal successfully', async () => {
      const mockDeals = [];
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: mockDeals } }
      });

      mockApi.post.mockResolvedValue({
        data: { 
          success: true, 
          data: { 
            deal: {
              id: 'new_deal_123',
              title: 'Test Deal',
              value: 50000,
              status: 'draft'
            }
          } 
        }
      });

      const { getByTestId, getByText } = renderComponent();

      // Open modal
      await waitFor(() => {
        fireEvent.press(getByTestId('create-deal-button'));
      });

      // Fill form
      fireEvent.changeText(getByTestId('deal-title-input'), 'Test Deal');
      fireEvent.changeText(getByTestId('deal-description-input'), 'A test deal for validation');
      fireEvent.changeText(getByTestId('deal-value-input'), '50000');
      fireEvent.changeText(getByTestId('partner-name-input'), 'Partner Company');

      // Submit
      fireEvent.press(getByTestId('submit-deal-button'));

      await waitFor(() => {
        expect(getByText('Deal created successfully!')).toBeTruthy();
      });

      expect(mockApi.post).toHaveBeenCalledWith('/v2/deals/facilitate', {
        title: 'Test Deal',
        description: 'A test deal for validation',
        value: 50000,
        partnerName: 'Partner Company'
      });
    });

    it('should handle deal creation error', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [] } }
      });

      mockApi.post.mockRejectedValue(new Error('Network error'));

      const { getByTestId, getByText } = renderComponent();

      // Open modal and fill form
      await waitFor(() => {
        fireEvent.press(getByTestId('create-deal-button'));
      });

      fireEvent.changeText(getByTestId('deal-title-input'), 'Test Deal');
      fireEvent.changeText(getByTestId('deal-description-input'), 'Test description');
      fireEvent.changeText(getByTestId('deal-value-input'), '50000');

      fireEvent.press(getByTestId('submit-deal-button'));

      await waitFor(() => {
        expect(getByText('Failed to create deal')).toBeTruthy();
      });
    });

    it('should validate numeric input for deal value', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [] } }
      });

      const { getByTestId, getByText } = renderComponent();

      await waitFor(() => {
        fireEvent.press(getByTestId('create-deal-button'));
      });

      // Enter non-numeric value
      fireEvent.changeText(getByTestId('deal-title-input'), 'Test Deal');
      fireEvent.changeText(getByTestId('deal-description-input'), 'Test');
      fireEvent.changeText(getByTestId('deal-value-input'), 'not a number');

      fireEvent.press(getByTestId('submit-deal-button'));

      await waitFor(() => {
        expect(getByText('Please enter a valid amount')).toBeTruthy();
      });
    });
  });

  describe('AI Deal Analysis', () => {
    const mockDeal = {
      id: 'deal_123',
      title: 'Software Development Project',
      description: 'Custom CRM development',
      value: 150000,
      status: 'negotiating',
      aiScore: 0.85
    };

    beforeEach(() => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [mockDeal] } }
      });
    });

    it('should trigger AI analysis for deal', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          success: true,
          prediction: {
            success_probability: 0.78,
            confidence: 0.91,
            key_factors: [
              { factor: 'Deal Size', importance: 0.8, current_value: 0.7, impact: 'positive' },
              { factor: 'Timeline', importance: 0.6, current_value: 0.9, impact: 'positive' }
            ],
            recommendations: ['Negotiate payment terms', 'Set clear milestones'],
            risk_level: 'Medium',
            recommended_action: 'Proceed with caution'
          }
        }
      });

      const { getByTestId, getByText } = renderComponent();

      await waitFor(() => {
        const analyzeButton = getByTestId('analyze-deal-button');
        fireEvent.press(analyzeButton);
      });

      await waitFor(() => {
        expect(getByText('🔮 AI Deal Analysis')).toBeTruthy();
        expect(getByTestId('success-probability')).toBeTruthy();
        expect(getByTestId('ai-recommendations')).toBeTruthy();
      });

      expect(mockApi.post).toHaveBeenCalledWith('/v2/ai/predict-deal', {
        title: mockDeal.title,
        description: mockDeal.description,
        value: mockDeal.value,
        duration_months: 6,
        match_score: mockDeal.aiScore
      });
    });

    it('should display success probability with visual indicator', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          success: true,
          prediction: {
            success_probability: 0.82,
            confidence: 0.87,
            key_factors: [],
            recommendations: [],
            risk_level: 'Low'
          }
        }
      });

      const { getByTestId, getByText } = renderComponent();

      await waitFor(() => {
        fireEvent.press(getByTestId('analyze-deal-button'));
      });

      await waitFor(() => {
        expect(getByText('82%')).toBeTruthy();
        expect(getByText('Success Probability')).toBeTruthy();
        expect(getByText('Confidence: 87%')).toBeTruthy();
        expect(getByText('Risk Level: Low')).toBeTruthy();
      });
    });

    it('should display key success factors', async () => {
      const mockFactors = [
        { factor: 'Industry Compatibility', importance: 0.9, current_value: 0.85, impact: 'positive' },
        { factor: 'Timeline Feasibility', importance: 0.7, current_value: 0.6, impact: 'negative' }
      ];

      mockApi.post.mockResolvedValue({
        data: {
          success: true,
          prediction: {
            success_probability: 0.75,
            confidence: 0.88,
            key_factors: mockFactors,
            recommendations: [],
            risk_level: 'Medium'
          }
        }
      });

      const { getByTestId, getByText } = renderComponent();

      await waitFor(() => {
        fireEvent.press(getByTestId('analyze-deal-button'));
      });

      await waitFor(() => {
        expect(getByText('📊 Key Success Factors')).toBeTruthy();
        expect(getByText('Industry Compatibility')).toBeTruthy();
        expect(getByText('Timeline Feasibility')).toBeTruthy();
        expect(getByText('Importance: 90%')).toBeTruthy();
        expect(getByText('Importance: 70%')).toBeTruthy();
      });

      // Check for impact indicators
      expect(getByTestId('positive-impact-indicator')).toBeTruthy();
      expect(getByTestId('negative-impact-indicator')).toBeTruthy();
    });

    it('should display AI recommendations', async () => {
      const mockRecommendations = [
        'Negotiate better payment terms',
        'Set clear project milestones',
        'Include change request procedures'
      ];

      mockApi.post.mockResolvedValue({
        data: {
          success: true,
          prediction: {
            success_probability: 0.70,
            confidence: 0.85,
            key_factors: [],
            recommendations: mockRecommendations,
            risk_level: 'Medium'
          }
        }
      });

      const { getByTestId, getByText } = renderComponent();

      await waitFor(() => {
        fireEvent.press(getByTestId('analyze-deal-button'));
      });

      await waitFor(() => {
        expect(getByText('💡 AI Recommendations')).toBeTruthy();
        mockRecommendations.forEach(recommendation => {
          expect(getByText(`• ${recommendation}`)).toBeTruthy();
        });
      });
    });

    it('should handle AI analysis loading state', async () => {
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockApi.post.mockReturnValue(delayedPromise as any);

      const { getByTestId, getByText } = renderComponent();

      await waitFor(() => {
        fireEvent.press(getByTestId('analyze-deal-button'));
      });

      // Should show loading state
      expect(getByText('Analyzing deal...')).toBeTruthy();
      expect(getByTestId('analysis-loading-indicator')).toBeTruthy();

      // Resolve the promise
      act(() => {
        resolvePromise!({
          data: {
            success: true,
            prediction: { success_probability: 0.8, confidence: 0.9, key_factors: [], recommendations: [] }
          }
        });
      });

      await waitFor(() => {
        expect(getByText('80%')).toBeTruthy();
      });
    });

    it('should handle AI analysis error', async () => {
      mockApi.post.mockRejectedValue(new Error('AI service unavailable'));

      const { getByTestId, getByText } = renderComponent();

      await waitFor(() => {
        fireEvent.press(getByTestId('analyze-deal-button'));
      });

      await waitFor(() => {
        expect(getByText('Failed to analyze deal')).toBeTruthy();
      });
    });
  });

  describe('Deal List Display', () => {
    const mockDeals = [
      {
        id: 'deal_1',
        title: 'E-commerce Platform',
        description: 'Building a custom e-commerce solution',
        value: 75000,
        currency: 'USD',
        status: 'negotiating',
        partnerName: 'Tech Solutions Inc',
        successProbability: 0.85
      },
      {
        id: 'deal_2',
        title: 'Mobile App Development',
        description: 'React Native mobile application',
        value: 45000,
        currency: 'USD',
        status: 'completed',
        partnerName: 'StartUp Co',
        successProbability: 0.72
      }
    ];

    beforeEach(() => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: mockDeals } }
      });
    });

    it('should display list of deals', async () => {
      const { getByText, getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByText('💼 Your Deals')).toBeTruthy();
        expect(getByText('E-commerce Platform')).toBeTruthy();
        expect(getByText('Mobile App Development')).toBeTruthy();
        expect(getByText('$75,000 USD')).toBeTruthy();
        expect(getByText('$45,000 USD')).toBeTruthy();
      });
    });

    it('should display deal status badges with correct colors', async () => {
      const { getByText, getByTestId } = renderComponent();

      await waitFor(() => {
        const negotiatingBadge = getByText('NEGOTIATING');
        const completedBadge = getByText('COMPLETED');
        
        expect(negotiatingBadge).toBeTruthy();
        expect(completedBadge).toBeTruthy();
      });
    });

    it('should display success probability when available', async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        expect(getByText('85% success')).toBeTruthy();
        expect(getByText('72% success')).toBeTruthy();
      });
    });

    it('should handle deal item press for analysis', async () => {
      const { getByTestId } = renderComponent();

      await waitFor(() => {
        const dealCard = getByTestId('deal-card-deal_1');
        fireEvent.press(dealCard);
      });

      // Should open analysis modal
      await waitFor(() => {
        expect(getByTestId('deal-analysis-modal')).toBeTruthy();
      });
    });

    it('should show partner information when available', async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        expect(getByText('with Tech Solutions Inc')).toBeTruthy();
        expect(getByText('with StartUp Co')).toBeTruthy();
      });
    });
  });

  describe('Refresh and Loading States', () => {
    it('should show loading state when fetching deals', () => {
      const { getByTestId } = renderComponent();
      
      // Initial loading state
      expect(getByTestId('deals-loading-indicator')).toBeTruthy();
      expect(getByText('Loading deals...')).toBeTruthy();
    });

    it('should support pull-to-refresh', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [] } }
      });

      const { getByTestId } = renderComponent();

      await waitFor(() => {
        const scrollView = getByTestId('deals-scroll-view');
        fireEvent(scrollView, 'refresh');
      });

      expect(mockApi.get).toHaveBeenCalledWith('/v2/deals/my-deals');
    });

    it('should handle refresh error gracefully', async () => {
      mockApi.get
        .mockResolvedValueOnce({
          data: { success: true, data: { deals: [] } }
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { getByTestId, getByText } = renderComponent();

      await waitFor(() => {
        const scrollView = getByTestId('deals-scroll-view');
        fireEvent(scrollView, 'refresh');
      });

      await waitFor(() => {
        expect(getByText('Failed to refresh deals')).toBeTruthy();
      });
    });
  });

  describe('Modal Management', () => {
    it('should close create deal modal on cancel', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [] } }
      });

      const { getByTestId, getByText, queryByText } = renderComponent();

      // Open modal
      await waitFor(() => {
        fireEvent.press(getByTestId('create-deal-button'));
      });

      expect(getByText('Create New Deal')).toBeTruthy();

      // Close modal
      const cancelButton = getByTestId('cancel-deal-button');
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(queryByText('Create New Deal')).toBeFalsy();
      });
    });

    it('should close analysis modal', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [
          { id: 'deal_1', title: 'Test Deal', value: 10000, status: 'draft' }
        ] } }
      });

      mockApi.post.mockResolvedValue({
        data: {
          success: true,
          prediction: { success_probability: 0.8, confidence: 0.9, key_factors: [], recommendations: [] }
        }
      });

      const { getByTestId, queryByTestId } = renderComponent();

      // Trigger analysis
      await waitFor(() => {
        fireEvent.press(getByTestId('analyze-deal-button'));
      });

      await waitFor(() => {
        expect(getByTestId('deal-analysis-modal')).toBeTruthy();
      });

      // Close modal
      const closeButton = getByTestId('close-analysis-modal');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByTestId('deal-analysis-modal')).toBeFalsy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [] } }
      });

      const { getByLabelText } = renderComponent();

      await waitFor(() => {
        expect(getByLabelText('Create new deal')).toBeTruthy();
        expect(getByLabelText('Deal statistics overview')).toBeTruthy();
      });
    });

    it('should support screen reader navigation', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { deals: [
          { id: 'deal_1', title: 'Test Deal', value: 10000, status: 'draft' }
        ] } }
      });

      const { getByRole } = renderComponent();

      await waitFor(() => {
        expect(getByRole('button', { name: /analyze deal/i })).toBeTruthy();
      });
    });
  });
});
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import ARBusinessCardViewer from '../../../src/components/ar/ARBusinessCardViewer';

// Mock dependencies
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      timing: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback())
      })),
      spring: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback())
      })),
      loop: jest.fn(() => ({
        start: jest.fn()
      })),
      sequence: jest.fn(() => ({
        start: jest.fn()
      })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        interpolate: jest.fn(() => ({
          interpolate: jest.fn(() => '0deg')
        }))
      }))
    },
    PanResponder: {
      create: jest.fn(() => ({
        panHandlers: {}
      }))
    }
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient'
}));

describe('ARBusinessCardViewer', () => {
  const mockCardData = {
    id: 'card_123',
    name: 'John Doe',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    email: 'john@techcorp.com',
    phone: '+1-555-0123',
    website: 'https://johndoe.dev',
    linkedin: 'https://linkedin.com/in/johndoe',
    industry: 'technology',
    bio: 'Passionate software engineer with 10 years of experience',
    avatar: 'https://example.com/avatar.jpg',
    nftTokenId: 'nft_456',
    isVerified: true
  };

  const defaultProps = {
    cardData: mockCardData,
    isHolographic: true,
    onConnect: jest.fn(),
    onSaveContact: jest.fn(),
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Card Data Display', () => {
    it('should render business card with correct data', () => {
      const { getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Senior Software Engineer')).toBeTruthy();
      expect(getByText('Tech Corp')).toBeTruthy();
      expect(getByText('john@techcorp.com')).toBeTruthy();
      expect(getByText('+1-555-0123')).toBeTruthy();
    });

    it('should display verification badge for verified users', () => {
      const { getByTestId } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByTestId('verification-badge')).toBeTruthy();
    });

    it('should display NFT badge when token ID exists', () => {
      const { getByText, getByTestId } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByTestId('nft-badge')).toBeTruthy();
      expect(getByText('NFT')).toBeTruthy();
    });

    it('should not display badges when not applicable', () => {
      const unverifiedCardData = {
        ...mockCardData,
        isVerified: false,
        nftTokenId: undefined
      };

      const { queryByTestId } = render(
        <ARBusinessCardViewer {...defaultProps} cardData={unverifiedCardData} />
      );

      expect(queryByTestId('verification-badge')).toBeFalsy();
      expect(queryByTestId('nft-badge')).toBeFalsy();
    });

    it('should display user initials in avatar when no image provided', () => {
      const cardDataNoAvatar = {
        ...mockCardData,
        avatar: undefined
      };

      const { getByText } = render(
        <ARBusinessCardViewer {...defaultProps} cardData={cardDataNoAvatar} />
      );

      expect(getByText('JD')).toBeTruthy(); // John Doe initials
    });
  });

  describe('Card Flipping Functionality', () => {
    it('should flip card when flip button is pressed', () => {
      const { getByTestId, getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      const flipButton = getByTestId('flip-card-button');
      
      act(() => {
        fireEvent.press(flipButton);
      });

      // Should show back of card content
      expect(getByText('About')).toBeTruthy();
      expect(getByText('Passionate software engineer with 10 years of experience')).toBeTruthy();
    });

    it('should flip back to front when pressed twice', () => {
      const { getByTestId, getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      const flipButton = getByTestId('flip-card-button');
      
      // Flip to back
      act(() => {
        fireEvent.press(flipButton);
      });

      // Flip back to front
      act(() => {
        fireEvent.press(flipButton);
      });

      // Should show front content again
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Senior Software Engineer')).toBeTruthy();
    });

    it('should show bio on card back', () => {
      const { getByTestId, getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      act(() => {
        fireEvent.press(getByTestId('flip-card-button'));
      });

      expect(getByText('About')).toBeTruthy();
      expect(getByText('Passionate software engineer with 10 years of experience')).toBeTruthy();
    });

    it('should show default bio when bio is not provided', () => {
      const cardDataNoBio = {
        ...mockCardData,
        bio: undefined
      };

      const { getByTestId, getByText } = render(
        <ARBusinessCardViewer {...defaultProps} cardData={cardDataNoBio} />
      );

      act(() => {
        fireEvent.press(getByTestId('flip-card-button'));
      });

      expect(getByText('Professional in technology')).toBeTruthy();
    });
  });

  describe('Card Expansion', () => {
    it('should expand card when tapped', () => {
      const { getByTestId } = render(<ARBusinessCardViewer {...defaultProps} />);

      const card = getByTestId('ar-business-card');
      
      act(() => {
        fireEvent.press(card);
      });

      // Animation should be triggered (mocked)
      expect(Animated.spring).toHaveBeenCalled();
    });
  });

  describe('Holographic Effects', () => {
    it('should display holographic grid when isHolographic is true', () => {
      const { getByTestId } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByTestId('holographic-grid')).toBeTruthy();
    });

    it('should display holographic base', () => {
      const { getByTestId } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByTestId('holographic-base')).toBeTruthy();
    });

    it('should not display holographic effects when disabled', () => {
      const { queryByTestId } = render(
        <ARBusinessCardViewer {...defaultProps} isHolographic={false} />
      );

      expect(queryByTestId('holographic-grid')).toBeFalsy();
      expect(queryByTestId('holographic-base')).toBeFalsy();
    });

    it('should start holographic animations on mount', () => {
      render(<ARBusinessCardViewer {...defaultProps} />);

      expect(Animated.loop).toHaveBeenCalledTimes(3); // Floating, glow, opacity animations
    });
  });

  describe('Social Links on Card Back', () => {
    it('should display website link when available', () => {
      const { getByTestId, getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      act(() => {
        fireEvent.press(getByTestId('flip-card-button'));
      });

      expect(getByText('🌐')).toBeTruthy();
      expect(getByText('Website')).toBeTruthy();
    });

    it('should display LinkedIn link when available', () => {
      const { getByTestId, getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      act(() => {
        fireEvent.press(getByTestId('flip-card-button'));
      });

      expect(getByText('💼')).toBeTruthy();
      expect(getByText('LinkedIn')).toBeTruthy();
    });

    it('should not display social links when not provided', () => {
      const cardDataNoSocial = {
        ...mockCardData,
        website: undefined,
        linkedin: undefined
      };

      const { getByTestId, queryByText } = render(
        <ARBusinessCardViewer {...defaultProps} cardData={cardDataNoSocial} />
      );

      act(() => {
        fireEvent.press(getByTestId('flip-card-button'));
      });

      expect(queryByText('Website')).toBeFalsy();
      expect(queryByText('LinkedIn')).toBeFalsy();
    });
  });

  describe('QR Code Display', () => {
    it('should display QR code on card back', () => {
      const { getByTestId, getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      act(() => {
        fireEvent.press(getByTestId('flip-card-button'));
      });

      expect(getByTestId('qr-code')).toBeTruthy();
      expect(getByText('Scan to connect')).toBeTruthy();
    });

    it('should display QR placeholder', () => {
      const { getByTestId, getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      act(() => {
        fireEvent.press(getByTestId('flip-card-button'));
      });

      expect(getByText('QR')).toBeTruthy();
    });
  });

  describe('AR Controls', () => {
    it('should render all control buttons', () => {
      const { getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByText('🔄')).toBeTruthy(); // Flip
      expect(getByText('💾')).toBeTruthy(); // Save
      expect(getByText('🤝')).toBeTruthy(); // Connect
      expect(getByText('✕')).toBeTruthy(); // Close
    });

    it('should call onSaveContact when save button is pressed', () => {
      const onSaveContact = jest.fn();
      const { getByText } = render(
        <ARBusinessCardViewer {...defaultProps} onSaveContact={onSaveContact} />
      );

      fireEvent.press(getByText('💾'));
      expect(onSaveContact).toHaveBeenCalledTimes(1);
    });

    it('should call onConnect when connect button is pressed', () => {
      const onConnect = jest.fn();
      const { getByText } = render(
        <ARBusinessCardViewer {...defaultProps} onConnect={onConnect} />
      );

      fireEvent.press(getByText('🤝'));
      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button is pressed', () => {
      const onClose = jest.fn();
      const { getByText } = render(
        <ARBusinessCardViewer {...defaultProps} onClose={onClose} />
      );

      fireEvent.press(getByText('✕'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Industry-Based Styling', () => {
    it('should apply technology gradient colors', () => {
      const techCardData = { ...mockCardData, industry: 'technology' };
      const { getByTestId } = render(
        <ARBusinessCardViewer {...defaultProps} cardData={techCardData} />
      );

      const gradient = getByTestId('card-gradient');
      expect(gradient.props.colors).toContain('#007AFF'); // Primary color
    });

    it('should apply finance gradient colors', () => {
      const financeCardData = { ...mockCardData, industry: 'finance' };
      const { getByTestId } = render(
        <ARBusinessCardViewer {...defaultProps} cardData={financeCardData} />
      );

      const gradient = getByTestId('card-gradient');
      expect(gradient.props.colors).toContain('#34C759'); // Success color
    });

    it('should apply default gradient for unknown industry', () => {
      const unknownCardData = { ...mockCardData, industry: 'unknown' };
      const { getByTestId } = render(
        <ARBusinessCardViewer {...defaultProps} cardData={unknownCardData} />
      );

      const gradient = getByTestId('card-gradient');
      expect(gradient.props.colors).toContain('#007AFF'); // Default primary color
    });
  });

  describe('AR Info Panel', () => {
    it('should display AR info panel with holographic mode', () => {
      const { getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByText('AR Business Card')).toBeTruthy();
      expect(getByText('🌟 Holographic Mode')).toBeTruthy();
    });

    it('should display standard view when holographic is disabled', () => {
      const { getByText } = render(
        <ARBusinessCardViewer {...defaultProps} isHolographic={false} />
      );

      expect(getByText('📱 Standard View')).toBeTruthy();
    });

    it('should show NFT token ID when available', () => {
      const { getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByText('🎨 NFT Token: nft_456...')).toBeTruthy();
    });

    it('should display interaction instructions', () => {
      const { getByText } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByText('• Drag to rotate • Tap to expand • Swipe to interact')).toBeTruthy();
    });
  });

  describe('Pan Gesture Handling', () => {
    it('should create pan responder for card rotation', () => {
      const { PanResponder } = require('react-native');
      
      render(<ARBusinessCardViewer {...defaultProps} />);

      expect(PanResponder.create).toHaveBeenCalled();
    });

    it('should handle pan responder configuration', () => {
      const { PanResponder } = require('react-native');
      
      render(<ARBusinessCardViewer {...defaultProps} />);

      const panConfig = PanResponder.create.mock.calls[0][0];
      expect(panConfig.onMoveShouldSetPanResponder).toBeDefined();
      expect(panConfig.onPanResponderMove).toBeDefined();
      expect(panConfig.onPanResponderRelease).toBeDefined();
    });
  });

  describe('Animation Lifecycle', () => {
    it('should start animations when component mounts with holographic mode', () => {
      render(<ARBusinessCardViewer {...defaultProps} isHolographic={true} />);

      expect(Animated.loop).toHaveBeenCalled();
      expect(Animated.sequence).toHaveBeenCalled();
    });

    it('should not start holographic animations when disabled', () => {
      jest.clearAllMocks();
      
      render(<ARBusinessCardViewer {...defaultProps} isHolographic={false} />);

      expect(Animated.loop).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for control buttons', () => {
      const { getByLabelText } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByLabelText('Flip business card')).toBeTruthy();
      expect(getByLabelText('Save contact')).toBeTruthy();
      expect(getByLabelText('Connect with user')).toBeTruthy();
      expect(getByLabelText('Close AR viewer')).toBeTruthy();
    });

    it('should have accessible card content', () => {
      const { getByLabelText } = render(<ARBusinessCardViewer {...defaultProps} />);

      expect(getByLabelText('Business card for John Doe')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing card data gracefully', () => {
      const incompleteCardData = {
        id: 'card_123',
        name: 'John Doe'
        // Missing other required fields
      };

      const { getByText } = render(
        <ARBusinessCardViewer {...defaultProps} cardData={incompleteCardData} />
      );

      expect(getByText('John Doe')).toBeTruthy();
      // Should not crash when other fields are missing
    });

    it('should handle undefined callback functions', () => {
      const { getByText } = render(
        <ARBusinessCardViewer 
          cardData={mockCardData}
          onConnect={undefined}
          onSaveContact={undefined}
          onClose={undefined}
        />
      );

      // Should not crash when buttons are pressed
      fireEvent.press(getByText('🤝'));
      fireEvent.press(getByText('💾'));
      fireEvent.press(getByText('✕'));
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = Date.now();
      
      render(<ARBusinessCardViewer {...defaultProps} />);
      
      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle rapid button presses without issues', () => {
      const onConnect = jest.fn();
      const { getByText } = render(
        <ARBusinessCardViewer {...defaultProps} onConnect={onConnect} />
      );

      const connectButton = getByText('🤝');
      
      // Rapid fire button presses
      for (let i = 0; i < 10; i++) {
        fireEvent.press(connectButton);
      }

      expect(onConnect).toHaveBeenCalledTimes(10);
    });
  });
});
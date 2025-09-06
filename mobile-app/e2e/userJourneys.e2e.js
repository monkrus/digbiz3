const { device, element, by, expect, waitFor } = require('detox');

/**
 * End-to-End User Journey Tests for DigBiz3 Mobile App
 * 
 * This test suite covers complete user workflows:
 * - New user onboarding journey
 * - Business networking workflows
 * - Deal creation and management
 * - Premium feature discovery and usage
 * - AR business card scanning and interaction
 * - Cross-platform data synchronization
 * - Offline functionality
 * - Push notification handling
 * - Performance under real-world conditions
 */

describe('DigBiz3 Mobile App - User Journey Tests', () => {
  let testUser;
  let premiumUser;
  let businessContact;

  beforeAll(async () => {
    // Reset app state
    await device.launchApp({ newInstance: true });
    await device.reloadReactNative();
    
    // Create test users with different scenarios
    testUser = {
      email: `testuser_${Date.now()}@digbiz3test.com`,
      password: 'TestPassword123!',
      name: 'John Test User',
      title: 'Software Engineer',
      company: 'E2E Test Corp',
      industry: 'technology'
    };

    premiumUser = {
      email: `premium_${Date.now()}@digbiz3test.com`,
      password: 'PremiumPassword123!',
      name: 'Premium User',
      title: 'Business Development Manager',
      company: 'Premium Solutions Inc',
      industry: 'consulting',
      subscriptionTier: 'PROFESSIONAL'
    };

    businessContact = {
      email: `contact_${Date.now()}@digbiz3test.com`,
      password: 'ContactPassword123!',
      name: 'Business Contact',
      title: 'VP of Sales',
      company: 'Sales Corp',
      industry: 'retail'
    };
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanup();
  });

  describe('New User Onboarding Journey', () => {
    it('should complete the full onboarding flow for a new user', async () => {
      // Step 1: App Launch and Welcome Screen
      await expect(element(by.id('welcome-screen'))).toBeVisible();
      await expect(element(by.text('Welcome to DigBiz3'))).toBeVisible();
      await expect(element(by.text('Smart Business Networking Platform'))).toBeVisible();
      
      // Verify onboarding slides are present
      await expect(element(by.id('onboarding-carousel'))).toBeVisible();
      await element(by.id('get-started-button')).tap();

      // Step 2: Registration Flow
      await expect(element(by.id('auth-screen'))).toBeVisible();
      await element(by.id('register-tab')).tap();

      // Fill registration form
      await element(by.id('name-input')).typeText(testUser.name);
      await element(by.id('email-input')).typeText(testUser.email);
      await element(by.id('password-input')).typeText(testUser.password);
      await element(by.id('confirm-password-input')).typeText(testUser.password);
      
      // Accept terms and privacy policy
      await element(by.id('terms-checkbox')).tap();
      await element(by.id('privacy-checkbox')).tap();
      
      await element(by.id('register-button')).tap();

      // Step 3: Email Verification (skip in test environment)
      await waitFor(element(by.id('verification-screen'))).toBeVisible().withTimeout(5000);
      await element(by.id('skip-verification-button')).tap(); // Test environment only

      // Step 4: Profile Setup
      await expect(element(by.id('profile-setup-screen'))).toBeVisible();
      await expect(element(by.text('Complete Your Profile'))).toBeVisible();

      // Upload profile photo
      await element(by.id('upload-photo-button')).tap();
      await element(by.text('Choose from Gallery')).tap();
      // Simulate photo selection
      await device.takeScreenshot('profile-photo-selection');

      // Fill professional details
      await element(by.id('title-input')).typeText(testUser.title);
      await element(by.id('company-input')).typeText(testUser.company);
      await element(by.id('industry-picker')).tap();
      await element(by.text('Technology')).tap();
      
      await element(by.id('location-input')).typeText('San Francisco, CA');
      await element(by.id('bio-input')).typeText('Experienced software engineer passionate about networking and technology');

      await element(by.id('continue-button')).tap();

      // Step 5: Subscription Tier Selection
      await expect(element(by.id('subscription-screen'))).toBeVisible();
      await expect(element(by.text('Choose Your Plan'))).toBeVisible();

      // View plan details
      await element(by.id('view-free-details')).tap();
      await expect(element(by.text('5 connections per month'))).toBeVisible();
      await element(by.id('close-plan-details')).tap();

      await element(by.id('view-professional-details')).tap();
      await expect(element(by.text('Unlimited connections'))).toBeVisible();
      await expect(element(by.text('AI-powered matching'))).toBeVisible();
      await element(by.id('close-plan-details')).tap();

      // Select free plan for now
      await element(by.id('select-free-plan')).tap();

      // Step 6: Permissions and Notifications
      await expect(element(by.id('permissions-screen'))).toBeVisible();
      
      // Grant location permission
      await element(by.id('enable-location-button')).tap();
      await element(by.text('Allow')).tap();
      
      // Grant notification permission
      await element(by.id('enable-notifications-button')).tap();
      await element(by.text('Allow')).tap();
      
      // Grant camera permission for AR features
      await element(by.id('enable-camera-button')).tap();
      await element(by.text('Allow')).tap();

      await element(by.id('finish-setup-button')).tap();

      // Step 7: Tutorial/Feature Introduction
      await expect(element(by.id('tutorial-screen'))).toBeVisible();
      
      // Go through tutorial steps
      await element(by.id('tutorial-next')).tap(); // Connections
      await expect(element(by.text('Build Your Network'))).toBeVisible();
      
      await element(by.id('tutorial-next')).tap(); // Deals
      await expect(element(by.text('Manage Business Deals'))).toBeVisible();
      
      await element(by.id('tutorial-next')).tap(); // AR Features
      await expect(element(by.text('Scan Business Cards'))).toBeVisible();
      
      await element(by.id('tutorial-skip')).tap(); // Skip remaining steps

      // Step 8: Home Screen - Onboarding Complete
      await expect(element(by.id('home-screen'))).toBeVisible();
      await expect(element(by.text(`Welcome, ${testUser.name}!`))).toBeVisible();
      await expect(element(by.id('bottom-navigation'))).toBeVisible();

      // Verify all tabs are accessible
      await element(by.id('connections-tab')).tap();
      await expect(element(by.id('connections-screen'))).toBeVisible();
      
      await element(by.id('deals-tab')).tap();
      await expect(element(by.id('deals-screen'))).toBeVisible();
      
      await element(by.id('ar-tab')).tap();
      await expect(element(by.id('ar-screen'))).toBeVisible();
      
      await element(by.id('profile-tab')).tap();
      await expect(element(by.id('profile-screen'))).toBeVisible();

      // Take screenshot of completed onboarding
      await device.takeScreenshot('onboarding-complete');
    });

    it('should handle onboarding interruption and resume', async () => {
      // Start onboarding process
      await device.launchApp({ newInstance: true });
      await element(by.id('get-started-button')).tap();
      await element(by.id('register-tab')).tap();

      // Fill partial registration
      await element(by.id('name-input')).typeText('Interrupted User');
      await element(by.id('email-input')).typeText(`interrupted_${Date.now()}@test.com`);

      // Simulate app interruption (background/foreground)
      await device.sendToHome();
      await device.launchApp();

      // Should resume from where left off
      await expect(element(by.id('auth-screen'))).toBeVisible();
      await expect(element(by.id('name-input'))).toHaveValue('Interrupted User');

      // Complete registration
      await element(by.id('password-input')).typeText('InterruptedPassword123!');
      await element(by.id('confirm-password-input')).typeText('InterruptedPassword123!');
      await element(by.id('terms-checkbox')).tap();
      await element(by.id('privacy-checkbox')).tap();
      await element(by.id('register-button')).tap();

      // Should continue to next step
      await waitFor(element(by.id('verification-screen'))).toBeVisible().withTimeout(5000);
    });
  });

  describe('Business Networking Journey', () => {
    beforeAll(async () => {
      // Login as test user
      await loginUser(testUser.email, testUser.password);
    });

    it('should discover and connect with potential business contacts', async () => {
      // Step 1: Navigate to Discover/Search
      await element(by.id('connections-tab')).tap();
      await element(by.id('discover-button')).tap();

      await expect(element(by.id('discover-screen'))).toBeVisible();
      await expect(element(by.text('Discover Professionals'))).toBeVisible();

      // Step 2: Use Search and Filters
      await element(by.id('search-input')).typeText('software engineer');
      await element(by.id('search-button')).tap();

      await waitFor(element(by.id('search-results'))).toBeVisible().withTimeout(3000);
      
      // Apply industry filter
      await element(by.id('filter-button')).tap();
      await element(by.id('industry-filter')).tap();
      await element(by.text('Technology')).tap();
      await element(by.id('apply-filters-button')).tap();

      // Step 3: View Profile and Connect
      const firstResult = element(by.id('user-result-0'));
      await expect(firstResult).toBeVisible();
      await firstResult.tap();

      await expect(element(by.id('user-profile-screen'))).toBeVisible();
      
      // Verify profile information is displayed
      await expect(element(by.id('user-name'))).toBeVisible();
      await expect(element(by.id('user-title'))).toBeVisible();
      await expect(element(by.id('user-company'))).toBeVisible();
      await expect(element(by.id('user-bio'))).toBeVisible();

      // Send connection request
      await element(by.id('connect-button')).tap();

      // Fill connection message
      await expect(element(by.id('connection-message-modal'))).toBeVisible();
      await element(by.id('connection-message-input')).typeText(
        'Hi! I saw your profile and would love to connect. I\'m also in the technology industry and think we could have great synergy.'
      );
      await element(by.id('connection-context-picker')).tap();
      await element(by.text('Business Opportunity')).tap();
      await element(by.id('send-connection-button')).tap();

      // Verify success
      await expect(element(by.text('Connection request sent!'))).toBeVisible();
      await expect(element(by.id('connection-status'))).toHaveText('Pending');

      // Step 4: Check My Connections
      await element(by.id('back-button')).tap();
      await element(by.id('my-connections-tab')).tap();

      await expect(element(by.id('connections-list'))).toBeVisible();
      await expect(element(by.id('pending-connections'))).toBeVisible();
      
      // Verify the connection request appears in pending
      await expect(element(by.text('Pending (1)'))).toBeVisible();
    });

    it('should use smart matching recommendations (premium feature)', async () => {
      // Navigate to smart matching
      await element(by.id('connections-tab')).tap();
      await element(by.id('smart-matching-button')).tap();

      // Should show upgrade prompt for free users
      await expect(element(by.id('premium-feature-modal'))).toBeVisible();
      await expect(element(by.text('Smart Matching is a Premium Feature'))).toBeVisible();
      
      // View feature details
      await element(by.id('learn-more-button')).tap();
      await expect(element(by.text('AI-powered compatibility matching'))).toBeVisible();
      await expect(element(by.text('Success prediction algorithms'))).toBeVisible();

      // Try upgrade flow
      await element(by.id('upgrade-now-button')).tap();
      await expect(element(by.id('subscription-upgrade-screen'))).toBeVisible();
      
      // Cancel upgrade for now
      await element(by.id('cancel-upgrade-button')).tap();
      await element(by.id('close-modal-button')).tap();
    });

    it('should manage connection requests and relationships', async () => {
      // Create an incoming connection request (simulate)
      await simulateIncomingConnectionRequest(businessContact);

      // Navigate to connections
      await element(by.id('connections-tab')).tap();
      
      // Should see notification badge
      await expect(element(by.id('notification-badge'))).toBeVisible();
      
      // Check incoming requests
      await element(by.id('incoming-requests-tab')).tap();
      await expect(element(by.text('Incoming (1)'))).toBeVisible();

      const requestItem = element(by.id('incoming-request-0'));
      await expect(requestItem).toBeVisible();
      await expect(element(by.id('requester-name'))).toHaveText(businessContact.name);

      // View request details
      await requestItem.tap();
      await expect(element(by.id('connection-request-details'))).toBeVisible();
      
      // Accept connection
      await element(by.id('accept-connection-button')).tap();
      
      // Add to favorites during acceptance
      await element(by.id('add-to-favorites-checkbox')).tap();
      await element(by.id('confirm-accept-button')).tap();

      // Verify success
      await expect(element(by.text('Connection accepted!'))).toBeVisible();
      
      // Should now appear in active connections
      await element(by.id('active-connections-tab')).tap();
      await expect(element(by.text('Active (1)'))).toBeVisible();
      
      // Verify favorited connection has star indicator
      const activeConnection = element(by.id('active-connection-0'));
      await expect(element(by.id('favorite-star')).atIndex(0)).toBeVisible();
    });

    it('should organize connections with tags and categories', async () => {
      // Navigate to active connections
      await element(by.id('connections-tab')).tap();
      await element(by.id('active-connections-tab')).tap();

      const connection = element(by.id('active-connection-0'));
      await connection.longPress();

      // Context menu should appear
      await expect(element(by.id('connection-context-menu'))).toBeVisible();
      await element(by.text('Manage Tags')).tap();

      // Add tags
      await expect(element(by.id('manage-tags-modal'))).toBeVisible();
      await element(by.id('add-tag-input')).typeText('Key Client');
      await element(by.id('add-tag-button')).tap();
      
      await element(by.id('add-tag-input')).clearText();
      await element(by.id('add-tag-input')).typeText('High Priority');
      await element(by.id('add-tag-button')).tap();

      await element(by.id('save-tags-button')).tap();

      // Verify tags appear on connection
      await expect(element(by.text('Key Client'))).toBeVisible();
      await expect(element(by.text('High Priority'))).toBeVisible();

      // Test tag filtering
      await element(by.id('filter-button')).tap();
      await element(by.id('tag-filter')).tap();
      await element(by.text('High Priority')).tap();
      await element(by.id('apply-filter-button')).tap();

      // Should show only filtered connections
      await expect(element(by.id('filtered-results-count'))).toHaveText('1 connection');
    });
  });

  describe('Deal Creation and Management Journey', () => {
    beforeAll(async () => {
      await loginUser(testUser.email, testUser.password);
    });

    it('should create and manage a business deal end-to-end', async () => {
      // Step 1: Navigate to Deals
      await element(by.id('deals-tab')).tap();
      await expect(element(by.id('deals-screen'))).toBeVisible();
      await expect(element(by.text('My Deals'))).toBeVisible();

      // Step 2: Create New Deal
      await element(by.id('create-deal-button')).tap();
      await expect(element(by.id('create-deal-screen'))).toBeVisible();

      // Fill basic deal information
      await element(by.id('deal-title-input')).typeText('Software Development Partnership');
      await element(by.id('deal-description-input')).typeText(
        'Looking for a development partner to build a mobile application. ' +
        'Project includes iOS and Android apps with backend API integration.'
      );

      // Set deal value and terms
      await element(by.id('deal-value-input')).typeText('50000');
      await element(by.id('currency-picker')).tap();
      await element(by.text('USD')).tap();
      
      await element(by.id('commission-rate-input')).typeText('5');
      
      // Set deadline
      await element(by.id('deadline-picker')).tap();
      await selectDateInPicker(30); // 30 days from now
      await element(by.text('Confirm')).tap();

      // Add deal categories/tags
      await element(by.id('add-category-button')).tap();
      await element(by.text('Technology')).tap();
      await element(by.text('Partnership')).tap();
      await element(by.id('done-categories-button')).tap();

      // Step 3: Add Participants
      await element(by.id('add-participants-button')).tap();
      await expect(element(by.id('add-participants-screen'))).toBeVisible();

      // Search and add participants from connections
      await element(by.id('search-connections-input')).typeText(businessContact.name);
      await element(by.id('search-button')).tap();

      const participantResult = element(by.id('participant-result-0'));
      await expect(participantResult).toBeVisible();
      await participantResult.tap();

      // Set participant role
      await element(by.id('participant-role-picker')).tap();
      await element(by.text('Service Provider')).tap();
      await element(by.id('add-participant-button')).tap();

      await element(by.id('done-participants-button')).tap();

      // Step 4: Review and Create Deal
      await element(by.id('review-deal-button')).tap();
      await expect(element(by.id('deal-review-screen'))).toBeVisible();

      // Verify all information is correct
      await expect(element(by.text('Software Development Partnership'))).toBeVisible();
      await expect(element(by.text('$50,000'))).toBeVisible();
      await expect(element(by.text('5% commission'))).toBeVisible();
      await expect(element(by.text(businessContact.name))).toBeVisible();

      await element(by.id('create-deal-final-button')).tap();

      // Step 5: Deal Created Successfully
      await expect(element(by.text('Deal created successfully!'))).toBeVisible();
      await expect(element(by.id('deal-details-screen'))).toBeVisible();

      // Verify deal status is "Draft"
      await expect(element(by.text('Draft'))).toBeVisible();
      await expect(element(by.id('deal-status-badge'))).toBeVisible();

      // Step 6: Publish Deal
      await element(by.id('deal-actions-button')).tap();
      await element(by.text('Publish Deal')).tap();

      await expect(element(by.id('publish-deal-modal'))).toBeVisible();
      await element(by.text('Make this deal visible to participants')).tap();
      await element(by.id('publish-confirm-button')).tap();

      // Verify status changed to "Active"
      await waitFor(element(by.text('Active'))).toBeVisible().withTimeout(3000);

      // Step 7: Deal Communication
      await element(by.id('deal-messages-tab')).tap();
      await element(by.id('send-message-input')).typeText(
        'Hi team! I\'ve published this deal. Please review the requirements and let me know if you have any questions.'
      );
      await element(by.id('send-message-button')).tap();

      await expect(element(by.id('message-sent'))).toBeVisible();

      // Step 8: Deal Updates and Progress Tracking
      await element(by.id('deal-progress-tab')).tap();
      
      // Add milestone
      await element(by.id('add-milestone-button')).tap();
      await element(by.id('milestone-title-input')).typeText('Initial Requirements Review');
      await element(by.id('milestone-description-input')).typeText('Review and finalize project requirements');
      await element(by.id('milestone-deadline-picker')).tap();
      await selectDateInPicker(7); // 1 week from now
      await element(by.text('Confirm')).tap();
      await element(by.id('save-milestone-button')).tap();

      await expect(element(by.text('Initial Requirements Review'))).toBeVisible();
      await expect(element(by.text('0% Complete'))).toBeVisible();
    });

    it('should handle deal status transitions and workflow', async () => {
      // Navigate to the deal created in previous test
      await element(by.id('deals-tab')).tap();
      const deal = element(by.id('deal-item-0'));
      await deal.tap();

      // Test status transitions
      await element(by.id('deal-actions-button')).tap();
      await element(by.text('Update Status')).tap();

      await expect(element(by.id('status-update-modal'))).toBeVisible();
      
      // Change to "In Progress"
      await element(by.text('In Progress')).tap();
      await element(by.id('status-comment-input')).typeText('Starting development phase');
      await element(by.id('update-status-button')).tap();

      await waitFor(element(by.text('In Progress'))).toBeVisible().withTimeout(3000);

      // Update milestone progress
      await element(by.id('deal-progress-tab')).tap();
      const milestone = element(by.id('milestone-0'));
      await milestone.tap();

      await element(by.id('update-progress-button')).tap();
      await element(by.id('progress-slider')).swipe('right', 'slow'); // Set to ~50%
      await element(by.id('progress-comment-input')).typeText('Requirements gathering in progress');
      await element(by.id('save-progress-button')).tap();

      await expect(element(by.text('50% Complete'))).toBeVisible();

      // Test deal completion workflow
      await element(by.id('deal-overview-tab')).tap();
      await element(by.id('deal-actions-button')).tap();
      await element(by.text('Mark as Completed')).tap();

      // Should require all milestones to be complete
      await expect(element(by.id('completion-requirements-modal'))).toBeVisible();
      await expect(element(by.text('Please complete all milestones first'))).toBeVisible();
      await element(by.id('ok-button')).tap();

      // Complete milestone first
      await element(by.id('deal-progress-tab')).tap();
      await milestone.tap();
      await element(by.id('mark-complete-button')).tap();
      await element(by.id('completion-notes-input')).typeText('Requirements finalized and approved');
      await element(by.id('confirm-complete-button')).tap();

      await expect(element(by.text('100% Complete'))).toBeVisible();

      // Now try to complete deal
      await element(by.id('deal-overview-tab')).tap();
      await element(by.id('deal-actions-button')).tap();
      await element(by.text('Mark as Completed')).tap();

      await expect(element(by.id('deal-completion-modal'))).toBeVisible();
      await element(by.id('completion-summary-input')).typeText('Deal successfully completed. All requirements delivered on time.');
      await element(by.id('confirm-completion-button')).tap();

      await waitFor(element(by.text('Completed'))).toBeVisible().withTimeout(3000);
      await expect(element(by.id('completion-badge'))).toBeVisible();
    });

    it('should handle deal collaboration and approvals', async () => {
      // Create another deal for collaboration testing
      await element(by.id('deals-tab')).tap();
      await element(by.id('create-deal-button')).tap();

      // Quick deal creation
      await element(by.id('deal-title-input')).typeText('Marketing Collaboration');
      await element(by.id('deal-value-input')).typeText('25000');
      await element(by.id('review-deal-button')).tap();
      await element(by.id('create-deal-final-button')).tap();

      // Add approval workflow
      await element(by.id('deal-actions-button')).tap();
      await element(by.text('Set Approval Required')).tap();

      await expect(element(by.id('approval-settings-modal'))).toBeVisible();
      await element(by.id('require-approval-toggle')).tap();
      await element(by.id('approval-threshold-input')).typeText('20000');
      await element(by.id('save-approval-settings-button')).tap();

      // Publish deal
      await element(by.id('deal-actions-button')).tap();
      await element(by.text('Publish Deal')).tap();
      await element(by.id('publish-confirm-button')).tap();

      // Should show "Pending Approval" status
      await waitFor(element(by.text('Pending Approval'))).toBeVisible().withTimeout(3000);

      // Simulate approval notification
      await simulateApprovalRequest();
      
      // Check notifications
      await element(by.id('notifications-button')).tap();
      await expect(element(by.text('Deal pending your approval'))).toBeVisible();
      
      const notification = element(by.id('approval-notification-0'));
      await notification.tap();

      // Should navigate to approval screen
      await expect(element(by.id('deal-approval-screen'))).toBeVisible();
      await element(by.id('approve-deal-button')).tap();
      await element(by.id('approval-comment-input')).typeText('Approved - looks good to proceed');
      await element(by.id('confirm-approval-button')).tap();

      await expect(element(by.text('Deal approved successfully'))).toBeVisible();
    });
  });

  describe('AR Business Card Experience', () => {
    beforeAll(async () => {
      await loginUser(testUser.email, testUser.password);
      // Grant camera permissions if not already granted
      await device.launchApp({ permissions: { camera: 'YES' } });
    });

    it('should scan and process business cards using AR', async () => {
      // Navigate to AR tab
      await element(by.id('ar-tab')).tap();
      await expect(element(by.id('ar-screen'))).toBeVisible();
      await expect(element(by.text('AR Business Cards'))).toBeVisible();

      // Step 1: Access AR Scanner
      await element(by.id('scan-card-button')).tap();
      
      // Camera permission check
      await waitFor(element(by.id('camera-view'))).toBeVisible().withTimeout(5000);
      
      // AR interface elements should be visible
      await expect(element(by.id('scanning-overlay'))).toBeVisible();
      await expect(element(by.text('Point camera at business card'))).toBeVisible();
      await expect(element(by.id('capture-button'))).toBeVisible();

      // Step 2: Simulate Card Scanning
      await device.takeScreenshot('ar-scanning-interface');
      
      // Simulate card detection
      await simulateBusinessCardDetection();
      
      // Should show card detection success
      await waitFor(element(by.text('Business card detected!'))).toBeVisible().withTimeout(3000);
      await expect(element(by.id('card-preview'))).toBeVisible();

      // Step 3: Review Extracted Information
      await element(by.id('review-card-button')).tap();
      await expect(element(by.id('card-review-screen'))).toBeVisible();

      // Extracted information should be displayed
      await expect(element(by.id('extracted-name'))).toBeVisible();
      await expect(element(by.id('extracted-title'))).toBeVisible();
      await expect(element(by.id('extracted-company'))).toBeVisible();
      await expect(element(by.id('extracted-email'))).toBeVisible();
      await expect(element(by.id('extracted-phone'))).toBeVisible();

      // Step 4: Edit and Correct Information
      await element(by.id('edit-card-button')).tap();
      
      // Simulate editing extracted text
      await element(by.id('name-input')).clearText();
      await element(by.id('name-input')).typeText('Jane Business Owner');
      
      await element(by.id('title-input')).clearText();
      await element(by.id('title-input')).typeText('CEO & Founder');
      
      await element(by.id('company-input')).clearText();
      await element(by.id('company-input')).typeText('Innovation Enterprises');

      // Step 5: Save to Contacts
      await element(by.id('save-contact-button')).tap();
      
      // Contact save options
      await expect(element(by.id('save-contact-modal'))).toBeVisible();
      await element(by.id('add-to-phone-contacts')).tap();
      await element(by.id('add-to-digbiz-network')).tap();
      await element(by.id('set-follow-up-reminder')).tap();
      
      // Set follow-up reminder
      await element(by.id('reminder-date-picker')).tap();
      await selectDateInPicker(3); // 3 days from now
      await element(by.text('Confirm')).tap();
      
      await element(by.id('reminder-note-input')).typeText('Follow up about potential partnership opportunity');
      
      await element(by.id('save-all-button')).tap();

      // Step 6: Verify Contact Saved
      await expect(element(by.text('Contact saved successfully!'))).toBeVisible();
      await expect(element(by.text('Follow-up reminder set'))).toBeVisible();

      // Navigate to contacts to verify
      await element(by.id('connections-tab')).tap();
      await element(by.id('recent-contacts-section')).tap();
      
      await expect(element(by.text('Jane Business Owner'))).toBeVisible();
      await expect(element(by.text('Innovation Enterprises'))).toBeVisible();
    });

    it('should display AR business cards in 3D holographic mode', async () => {
      // Navigate to AR tab
      await element(by.id('ar-tab')).tap();
      
      // Access my AR business card
      await element(by.id('my-ar-card-button')).tap();
      
      await expect(element(by.id('ar-card-viewer'))).toBeVisible();
      
      // Enable holographic mode
      await element(by.id('holographic-toggle')).tap();
      
      // AR card should display in 3D
      await waitFor(element(by.id('holographic-card'))).toBeVisible().withTimeout(3000);
      await expect(element(by.text('Holographic Mode Active'))).toBeVisible();

      // Test card interactions
      await element(by.id('ar-card')).swipe('left', 'fast'); // Rotate card
      await element(by.id('ar-card')).tap(); // Flip card
      
      // Card should flip to show back side
      await waitFor(element(by.id('card-back'))).toBeVisible().withTimeout(2000);
      await expect(element(by.text('About'))).toBeVisible();
      await expect(element(by.id('qr-code'))).toBeVisible();

      // Test card controls
      await element(by.id('card-controls')).tap();
      await expect(element(by.id('share-button'))).toBeVisible();
      await expect(element(by.id('edit-button'))).toBeVisible();
      await expect(element(by.id('analytics-button'))).toBeVisible();

      // Share card
      await element(by.id('share-button')).tap();
      await expect(element(by.id('share-modal'))).toBeVisible();
      
      await element(by.id('share-via-qr')).tap();
      await expect(element(by.id('qr-share-screen'))).toBeVisible();
      await expect(element(by.text('Scan to connect'))).toBeVisible();
      
      await element(by.id('close-share')).tap();
      
      // View analytics
      await element(by.id('card-controls')).tap();
      await element(by.id('analytics-button')).tap();
      
      await expect(element(by.id('card-analytics'))).toBeVisible();
      await expect(element(by.text('Card Views'))).toBeVisible();
      await expect(element(by.text('Connections Made'))).toBeVisible();
      await expect(element(by.text('QR Scans'))).toBeVisible();
    });

    it('should handle AR meeting room functionality', async () => {
      // Navigate to AR meeting room feature
      await element(by.id('ar-tab')).tap();
      await element(by.id('ar-meeting-button')).tap();
      
      await expect(element(by.id('ar-meeting-screen'))).toBeVisible();
      await expect(element(by.text('Virtual Meeting Room'))).toBeVisible();

      // Create new meeting room
      await element(by.id('create-meeting-room')).tap();
      
      await element(by.id('meeting-room-name')).typeText('Tech Partnership Discussion');
      await element(by.id('meeting-description')).typeText('Discussing potential technology partnership opportunities');
      
      // Set room as public/private
      await element(by.id('room-privacy-toggle')).tap(); // Set to private
      
      // Add participants
      await element(by.id('add-participants-button')).tap();
      await element(by.text(businessContact.name)).tap();
      await element(by.id('done-adding-participants')).tap();

      await element(by.id('create-room-button')).tap();

      // Room created successfully
      await expect(element(by.text('Meeting room created!'))).toBeVisible();
      await expect(element(by.id('room-code'))).toBeVisible();

      // Enter AR meeting space
      await element(by.id('enter-ar-space')).tap();
      
      await waitFor(element(by.id('ar-meeting-space'))).toBeVisible().withTimeout(5000);
      
      // AR meeting interface
      await expect(element(by.id('ar-avatar'))).toBeVisible(); // User's AR avatar
      await expect(element(by.id('meeting-controls'))).toBeVisible();
      await expect(element(by.id('participant-list'))).toBeVisible();

      // Test AR interactions
      await element(by.id('ar-space')).tap(); // Place virtual business card in space
      await expect(element(by.id('placed-card'))).toBeVisible();

      // Use meeting controls
      await element(by.id('mute-button')).tap();
      await expect(element(by.text('Muted'))).toBeVisible();
      
      await element(by.id('share-screen-button')).tap();
      await expect(element(by.id('screen-share-modal'))).toBeVisible();
      await element(by.text('Cancel')).tap();

      // Leave meeting
      await element(by.id('leave-meeting')).tap();
      await element(by.text('Leave')).tap();
      
      await expect(element(by.id('ar-meeting-screen'))).toBeVisible();
    });
  });

  describe('Premium Features Journey', () => {
    it('should demonstrate premium upgrade flow and feature access', async () => {
      // Logout current user and login as premium user
      await logoutUser();
      await loginUser(premiumUser.email, premiumUser.password);

      // Navigate to premium features
      await element(by.id('profile-tab')).tap();
      await element(by.id('premium-features-section')).tap();

      await expect(element(by.id('premium-dashboard'))).toBeVisible();
      await expect(element(by.text('Professional Plan'))).toBeVisible();
      await expect(element(by.id('premium-badge'))).toBeVisible();

      // Test AI-powered smart matching
      await element(by.id('smart-matching-card')).tap();
      await expect(element(by.id('smart-matching-screen'))).toBeVisible();

      // Should show AI recommendations
      await waitFor(element(by.id('ai-recommendations'))).toBeVisible().withTimeout(5000);
      await expect(element(by.text('Based on your profile and network'))).toBeVisible();

      const recommendation = element(by.id('recommendation-0'));
      await expect(recommendation).toBeVisible();
      
      // View recommendation details
      await recommendation.tap();
      await expect(element(by.id('match-score'))).toBeVisible();
      await expect(element(by.id('compatibility-factors'))).toBeVisible();
      await expect(element(by.text('Success Probability:'))).toBeVisible();

      await element(by.id('connect-with-match')).tap();
      await element(by.id('ai-message-suggestion')).tap(); // Use AI-suggested message
      await element(by.id('send-connection')).tap();

      await expect(element(by.text('Smart connection request sent!'))).toBeVisible();

      // Test network analytics
      await element(by.id('back-button')).tap();
      await element(by.id('network-analytics-card')).tap();

      await expect(element(by.id('analytics-dashboard'))).toBeVisible();
      await expect(element(by.text('Network Value'))).toBeVisible();
      await expect(element(by.id('network-worth-chart'))).toBeVisible();
      await expect(element(by.id('growth-metrics'))).toBeVisible();
      await expect(element(by.id('roi-tracking'))).toBeVisible();

      // Test market intelligence
      await element(by.id('market-intelligence-tab')).tap();
      await expect(element(by.text('Industry Trends'))).toBeVisible();
      await expect(element(by.id('trend-analysis'))).toBeVisible();
      await expect(element(by.id('opportunity-alerts'))).toBeVisible();

      // Test advanced deal features
      await element(by.id('deals-tab')).tap();
      await element(by.id('create-deal-button')).tap();

      // Premium users should see advanced options
      await expect(element(by.id('ai-deal-assistant'))).toBeVisible();
      await expect(element(by.id('success-prediction'))).toBeVisible();
      await expect(element(by.id('risk-assessment'))).toBeVisible();

      await element(by.id('ai-deal-assistant')).tap();
      await element(by.id('deal-title-input')).typeText('AI-Optimized Partnership Deal');
      
      // AI should provide suggestions
      await waitFor(element(by.id('ai-suggestions'))).toBeVisible().withTimeout(3000);
      await expect(element(by.text('AI Recommendations:'))).toBeVisible();
      
      const suggestion = element(by.id('ai-suggestion-0'));
      await suggestion.tap(); // Apply AI suggestion

      await element(by.id('predict-success-button')).tap();
      await waitFor(element(by.id('success-prediction'))).toBeVisible().withTimeout(5000);
      await expect(element(by.text('Success Probability:'))).toBeVisible();
      await expect(element(by.id('prediction-factors'))).toBeVisible();
    });

    it('should handle subscription management', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('subscription-settings')).tap();

      await expect(element(by.id('subscription-screen'))).toBeVisible();
      await expect(element(by.text('Current Plan: Professional'))).toBeVisible();
      await expect(element(by.text('$29/month'))).toBeVisible();

      // View usage statistics
      await element(by.id('usage-stats-tab')).tap();
      await expect(element(by.text('Current Billing Period'))).toBeVisible();
      await expect(element(by.id('connections-used'))).toBeVisible();
      await expect(element(by.id('ai-queries-used'))).toBeVisible();
      await expect(element(by.id('storage-used'))).toBeVisible();

      // Test plan upgrade
      await element(by.id('change-plan-tab')).tap();
      await expect(element(by.text('Enterprise Plan'))).toBeVisible();
      await element(by.id('view-enterprise-details')).tap();

      await expect(element(by.id('enterprise-features-list'))).toBeVisible();
      await expect(element(by.text('Advanced analytics'))).toBeVisible();
      await expect(element(by.text('Custom integrations'))).toBeVisible();
      await expect(element(by.text('Priority support'))).toBeVisible();

      // Cancel upgrade (don't actually upgrade in test)
      await element(by.id('cancel-upgrade')).tap();

      // Test payment method management
      await element(by.id('payment-methods-tab')).tap();
      await expect(element(by.id('payment-methods-list'))).toBeVisible();
      
      await element(by.id('add-payment-method')).tap();
      await expect(element(by.id('payment-form'))).toBeVisible();
      // Cancel payment form
      await element(by.id('cancel-payment-form')).tap();
    });
  });

  describe('Cross-Platform Data Synchronization', () => {
    it('should sync data across devices and sessions', async () => {
      // Login and create some data
      await loginUser(testUser.email, testUser.password);
      
      // Create a deal
      await element(by.id('deals-tab')).tap();
      await element(by.id('create-deal-button')).tap();
      await element(by.id('deal-title-input')).typeText('Sync Test Deal');
      await element(by.id('review-deal-button')).tap();
      await element(by.id('create-deal-final-button')).tap();

      // Update profile
      await element(by.id('profile-tab')).tap();
      await element(by.id('edit-profile-button')).tap();
      await element(by.id('bio-input')).clearText();
      await element(by.id('bio-input')).typeText('Updated bio for sync test');
      await element(by.id('save-profile-button')).tap();

      // Force app refresh (simulate switching devices)
      await device.reloadReactNative();
      
      // Login again (simulate different device)
      await loginUser(testUser.email, testUser.password);

      // Verify data synced
      await element(by.id('deals-tab')).tap();
      await expect(element(by.text('Sync Test Deal'))).toBeVisible();

      await element(by.id('profile-tab')).tap();
      await expect(element(by.text('Updated bio for sync test'))).toBeVisible();

      // Test offline/online sync
      await device.setURLBlacklist(['*']); // Simulate offline mode
      
      // Make changes while offline
      await element(by.id('edit-profile-button')).tap();
      await element(by.id('bio-input')).clearText();
      await element(by.id('bio-input')).typeText('Offline changes made');
      await element(by.id('save-profile-button')).tap();

      // Should show offline indicator
      await expect(element(by.id('offline-indicator'))).toBeVisible();
      await expect(element(by.text('Changes will sync when online'))).toBeVisible();

      // Go back online
      await device.setURLBlacklist([]); // Remove blacklist
      
      // Should sync automatically
      await waitFor(element(by.text('Synced'))).toBeVisible().withTimeout(10000);
      
      // Refresh to verify sync
      await element(by.id('refresh-profile')).tap();
      await expect(element(by.text('Offline changes made'))).toBeVisible();
    });
  });

  describe('Push Notifications and Real-time Features', () => {
    it('should handle various notification types and interactions', async () => {
      await loginUser(testUser.email, testUser.password);

      // Simulate incoming connection request notification
      await sendPushNotification({
        type: 'connection_request',
        title: 'New Connection Request',
        body: `${businessContact.name} wants to connect`,
        data: { userId: businessContact.id }
      });

      // Notification should appear
      await waitFor(element(by.text('New Connection Request'))).toBeVisible().withTimeout(5000);
      await element(by.text('New Connection Request')).tap();

      // Should navigate to connection request screen
      await expect(element(by.id('connection-request-details'))).toBeVisible();

      // Simulate deal update notification
      await sendPushNotification({
        type: 'deal_update',
        title: 'Deal Update',
        body: 'Your deal status has changed to Active',
        data: { dealId: 'test-deal-id' }
      });

      await waitFor(element(by.text('Deal Update'))).toBeVisible().withTimeout(5000);
      await element(by.text('Deal Update')).tap();

      // Should navigate to deal details
      await expect(element(by.id('deal-details-screen'))).toBeVisible();

      // Test notification settings
      await element(by.id('profile-tab')).tap();
      await element(by.id('notification-settings')).tap();

      await expect(element(by.id('notification-preferences'))).toBeVisible();
      
      // Toggle various notification types
      await element(by.id('connection-requests-toggle')).tap();
      await element(by.id('deal-updates-toggle')).tap();
      await element(by.id('marketing-notifications-toggle')).tap();

      await element(by.id('save-notification-settings')).tap();
      await expect(element(by.text('Settings saved'))).toBeVisible();
    });

    it('should handle real-time messaging and updates', async () => {
      await loginUser(testUser.email, testUser.password);

      // Navigate to a deal with messaging
      await element(by.id('deals-tab')).tap();
      const deal = element(by.id('deal-item-0'));
      await deal.tap();
      
      await element(by.id('deal-messages-tab')).tap();

      // Send a message
      await element(by.id('message-input')).typeText('Testing real-time messaging');
      await element(by.id('send-message-button')).tap();

      // Message should appear immediately
      await expect(element(by.text('Testing real-time messaging'))).toBeVisible();
      await expect(element(by.text('Sent'))).toBeVisible();

      // Simulate incoming message from another user
      await simulateIncomingMessage({
        from: businessContact.id,
        message: 'I received your message!',
        dealId: 'current-deal-id'
      });

      // Should appear in real-time
      await waitFor(element(by.text('I received your message!'))).toBeVisible().withTimeout(3000);
      await expect(element(by.text(businessContact.name))).toBeVisible();

      // Test typing indicators
      await simulateTypingIndicator(businessContact.id, true);
      await expect(element(by.text(`${businessContact.name} is typing...`))).toBeVisible();

      await simulateTypingIndicator(businessContact.id, false);
      await expect(element(by.text(`${businessContact.name} is typing...`))).not.toBeVisible();

      // Test message read receipts
      await simulateMessageRead('test-message-id');
      await expect(element(by.text('Read'))).toBeVisible();
    });
  });

  // Helper functions
  async function loginUser(email, password) {
    await element(by.id('profile-tab')).tap();
    
    // Check if already logged in
    if (await element(by.id('logout-button')).isVisible()) {
      return; // Already logged in
    }

    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText(email);
    await element(by.id('password-input')).typeText(password);
    await element(by.id('login-submit-button')).tap();
    
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(5000);
  }

  async function logoutUser() {
    await element(by.id('profile-tab')).tap();
    await element(by.id('logout-button')).tap();
    await element(by.text('Logout')).tap();
    await waitFor(element(by.id('welcome-screen'))).toBeVisible().withTimeout(3000);
  }

  async function selectDateInPicker(daysFromNow) {
    // Helper to select a date in date picker
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysFromNow);
    
    // This is a simplified implementation - actual implementation would depend on the date picker component used
    await element(by.id(`date-${targetDate.getDate()}`)).tap();
  }

  async function simulateIncomingConnectionRequest(fromUser) {
    // Simulate receiving a connection request
    // This would typically be done through your app's test API
    console.log(`Simulating connection request from ${fromUser.name}`);
  }

  async function simulateBusinessCardDetection() {
    // Simulate AR business card detection
    // This would integrate with your AR testing framework
    console.log('Simulating business card detection');
  }

  async function simulateApprovalRequest() {
    // Simulate an approval notification
    console.log('Simulating approval request notification');
  }

  async function sendPushNotification(notification) {
    // Send push notification for testing
    console.log('Sending push notification:', notification);
  }

  async function simulateIncomingMessage(messageData) {
    // Simulate real-time message
    console.log('Simulating incoming message:', messageData);
  }

  async function simulateTypingIndicator(userId, isTyping) {
    // Simulate typing indicator
    console.log(`User ${userId} typing: ${isTyping}`);
  }

  async function simulateMessageRead(messageId) {
    // Simulate message read receipt
    console.log(`Message ${messageId} read`);
  }

  async function cleanup() {
    // Cleanup test data
    console.log('Cleaning up test data');
  }
});
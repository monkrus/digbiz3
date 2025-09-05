# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DigBiz3** is a smart business networking app consisting of:
- **Backend API**: Express.js REST API (Node.js)
- **Mobile App**: React Native application built with Expo

## Architecture

### Backend API (`backend-api/`)
- **Framework**: Express.js with TypeScript support
- **Structure**: Single-file application in `src/app.js`
- **Dependencies**: CORS, Helmet, Morgan, dotenv for security and logging
- **Configuration**: Environment variables in `.env` file

### Mobile App (`mobile-app/`)
- **Framework**: React Native with Expo
- **Navigation**: React Navigation with bottom tabs
- **Structure**: Organized in `src/` with screens, services, constants, components
- **API Integration**: Axios-based service for backend communication
- **Styling**: Custom theme system with consistent colors and spacing

## Development Commands

### Backend API
```bash
# Navigate to backend directory
cd backend-api

# Install dependencies
npm install

# Development with hot reload
npm run dev

# Production start
npm start

# Run tests
npm test

# Run tests in watch mode
npm test:watch
```

### Mobile App
```bash
# Navigate to mobile app directory
cd mobile-app

# Install dependencies
npm install

# Start Expo development server
npm start

# Run on Android (requires Android Studio/emulator)
npm run android

# Run on iOS (requires Xcode - macOS only)
npm run ios

# Run in web browser
npm run web
```

## Key Configuration

### Environment Variables (`.env`)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode
- `JWT_SECRET`: JWT signing key
- `CORS_ORIGIN`: Allowed CORS origins
- Database configuration for future implementation

### API Endpoints
- `GET /`: Root endpoint with API info
- `GET /api/health`: Health check endpoint

## Project Structure

```
digbiz3/
├── backend-api/           # Express.js API server
│   ├── src/
│   │   └── app.js        # Main application file
│   ├── package.json      # Backend dependencies and scripts
│   └── .env             # Environment configuration
├── mobile-app/           # React Native Expo app
│   ├── src/
│   │   ├── screens/      # App screens (Home, Network, Profile)
│   │   ├── services/     # API service layer
│   │   ├── constants/    # Theme and API constants
│   │   └── components/   # Reusable components
│   ├── App.js           # Main app with navigation
│   └── package.json     # Mobile app dependencies
└── README.md           # Project documentation
```

## Testing

- **Framework**: Jest
- **Configuration**: Detects open handles automatically
- Tests should be placed in `__tests__/` directories or files ending with `.test.js`

## Mobile App Features

### Current Screens
- **HomeScreen**: Dashboard with API status, statistics, and quick actions
- **NetworkScreen**: Connection management with search and filtering
- **ProfileScreen**: User profile display with contact information and stats

### Key Components
- **API Service**: Centralized HTTP client with interceptors for backend communication
- **Theme System**: Consistent styling with colors, spacing, and typography
- **Navigation**: Bottom tab navigation between main screens

## Notes

- Backend uses CommonJS modules (require/module.exports)
- TypeScript definitions included for development
- Security headers enabled via Helmet middleware
- CORS configured for cross-origin requests
- Mobile app connects to backend API at `http://localhost:3000/api` in development
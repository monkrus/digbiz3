// API Configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://your-production-api.com/api';

export const API_ENDPOINTS = {
  HEALTH: '/health',
  USERS: '/users',
  BUSINESS_CARDS: '/business-cards',
  NETWORKING: '/networking'
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};
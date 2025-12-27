/**
 * API types and request/response interfaces
 * Base API types and common patterns
 */

// Base API response wrapper
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  success: boolean;
}

// Paginated response
export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Error response
export interface ApiError {
  message: string;
  code?: string | number;
  details?: Record<string, any>;
}

// GetStream token response
export interface GetStreamTokenResponse {
  token: string;
  user_id: string;
  api_key: string;
  app_id: string;
}

// Messaging-related exports
export * from './messaging';
/**
 * Hook types and custom hook interfaces
 * Return types and prop types for custom hooks
 */

// Base hook props with common patterns
export interface BaseHookProps {
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data?: any) => void;
}
/**
 * Central type definitions export
 * Organized modular type system for maintainable codebase
 */

// Stream types
export * from './stream';
export * from './stream/state';
export {
  type StreamActions,
  type InitializeStreamFn,
  type LeaveStreamFn,
  type SendMessageFn,
  type SetVideoLoadErrorFn,
  type RefetchMessagesFn,
  type ResetConnectionStateFn,
  type RefetchStreamDetailsFn,
} from './stream/actions';
export * from './stream/participants';
export { type ChatMessage, type GiftAnimation } from './stream/messages';

// API types
export * from './api';
export * from './api/streams';
export * from './api/auth';
export * from './api/wallet';
export * from './api/search';

// Component types
export * from './components';
export * from './components/ui';
export {
  type ChatInputProps,
  type MessageItemProps,
  type ChatBubbleProps,
} from './components/chat';
export * from './components/modals';

// Hook types
export * from './hooks';
export * from './hooks/stream';
export * from './hooks/chat';
export * from './hooks/animations';

// Service types
export * from './services';

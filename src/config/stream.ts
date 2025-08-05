// GetStream Video SDK configuration
export const STREAM_CONFIG = {
  // You can get these from https://getstream.io/dashboard/
  API_KEY: process.env.STREAM_API_KEY || 'your-getstream-api-key-here',
  APP_ID: process.env.STREAM_APP_ID || 'your-app-id-here',
  
  // Token will be generated on your backend for each user
  // This is just a placeholder - DO NOT put real tokens here
  USER_TOKEN: 'user-token-will-be-generated-by-backend',
};

// Stream call settings
export const CALL_SETTINGS = {
  // Video settings
  video: {
    enabled: true,
    camera_default_on: true,
    camera_facing: 'front' as const,
    target_resolution: {
      width: 720,
      height: 1280,
    },
    max_bitrate: 1200000, // 1.2 Mbps for good quality
    max_framerate: 30,
  },
  
  // Audio settings
  audio: {
    enabled: true,
    noiseSuppressionEnabled: true,
    echoCancellationEnabled: true,
    default_device: 'speaker' as const, // Cast to specific type
  },
  
  // Call settings
  join: {
    create: true,
    ring: false,
  },
};

// Separate recording settings for manual recording start
export const RECORDING_SETTINGS = {
  quality: 'portrait-720x1280' as const, // Portrait mode for mobile streaming
  layout: 'spotlight' as const, // Focus on the main speaker
};

// Environment validation
export const validateStreamConfig = () => {
  if (!STREAM_CONFIG.API_KEY || STREAM_CONFIG.API_KEY === 'your-getstream-api-key-here') {
    console.warn('⚠️ GetStream API key not configured. Please set STREAM_API_KEY in your .env file');
    return false;
  }
  
  if (!STREAM_CONFIG.APP_ID || STREAM_CONFIG.APP_ID === 'your-app-id-here') {
    console.warn('⚠️ GetStream App ID not configured. Please set STREAM_APP_ID in your .env file');
    return false;
  }
  
  return true;
};

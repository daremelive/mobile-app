import { StreamVideoClient, User } from '@stream-io/video-react-native-sdk';
import { store } from '../store';
import { streamsApi } from '../store/streamsApi';

// Simple debug logging functions to replace the removed debug utilities
const debugLog = (step: string, message: string, data?: any) => {
  // Debug logging removed per user request
};

const debugError = (category: string, message: string, error: any) => {
  // Debug logging removed per user request
};

const logGetStreamStep = (step: string, success: boolean, data?: any) => {
  // Debug logging removed per user request
};

// Global connection state to prevent multiple simultaneous connections
interface ConnectionState {
  isConnecting: boolean;
  lastConnectionAttempt: number;
  consecutiveFailures: number;
  isRateLimited: boolean;
  rateLimitedUntil: number;
}

const connectionState: ConnectionState = {
  isConnecting: false,
  lastConnectionAttempt: 0,
  consecutiveFailures: 0,
  isRateLimited: false,
  rateLimitedUntil: 0,
};

const MIN_CONNECTION_INTERVAL = 2000; // Minimum 2 seconds between connection attempts
const RATE_LIMIT_COOLDOWN = 30000; // 30 seconds cooldown after rate limit detection

let client: StreamVideoClient | null = null;

// Check if we should allow a connection attempt
const shouldAllowConnection = (): { allowed: boolean; reason?: string; waitTime?: number } => {
  const now = Date.now();
  
  // Check if already connecting
  if (connectionState.isConnecting) {
    return { allowed: false, reason: 'Connection already in progress' };
  }
  
  // Check if we're in rate limit cooldown
  if (connectionState.isRateLimited && now < connectionState.rateLimitedUntil) {
    const waitTime = connectionState.rateLimitedUntil - now;
    return { allowed: false, reason: 'Rate limited', waitTime };
  }
  
  // Check minimum interval between attempts
  const timeSinceLastAttempt = now - connectionState.lastConnectionAttempt;
  if (timeSinceLastAttempt < MIN_CONNECTION_INTERVAL) {
    const waitTime = MIN_CONNECTION_INTERVAL - timeSinceLastAttempt;
    return { allowed: false, reason: 'Too soon after last attempt', waitTime };
  }
  
  return { allowed: true };
};

// Mark connection as rate limited
const markRateLimited = () => {
  connectionState.isRateLimited = true;
  connectionState.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN;
  connectionState.consecutiveFailures++;
};

// Reset connection state on success
const resetConnectionState = () => {
  connectionState.isConnecting = false;
  connectionState.consecutiveFailures = 0;
  connectionState.isRateLimited = false;
  connectionState.rateLimitedUntil = 0;
};

// Export connection state for components to check
export const getConnectionState = () => ({
  isConnecting: connectionState.isConnecting,
  isRateLimited: connectionState.isRateLimited,
  rateLimitedUntil: connectionState.rateLimitedUntil,
  consecutiveFailures: connectionState.consecutiveFailures,
  canConnect: shouldAllowConnection().allowed,
  nextAllowedConnection: connectionState.isRateLimited 
    ? connectionState.rateLimitedUntil 
    : Math.max(connectionState.lastConnectionAttempt + MIN_CONNECTION_INTERVAL, Date.now())
});

// Fetch GetStream token from backend
export const fetchStreamToken = async (): Promise<{token: string, apiKey: string, appId: string}> => {
  try {
    logGetStreamStep('TOKEN_FETCH_START', true, { environment: __DEV__ ? 'dev' : 'prod' });
    console.log('Fetching GetStream token from backend...');
    console.log('Environment check:', { isDev: __DEV__, env: __DEV__ ? 'development' : 'production' });
    
    const result = await store.dispatch(streamsApi.endpoints.getStreamToken.initiate()).unwrap();
    
    logGetStreamStep('TOKEN_FETCH_SUCCESS', true, {
      hasToken: !!result.token,
      tokenLength: result.token?.length || 0,
      hasApiKey: !!result.api_key,
      hasAppId: !!result.app_id
    });
    
    console.log('GetStream token received from backend:', {
      hasToken: !!result.token,
      tokenLength: result.token?.length || 0,
      apiKey: result.api_key?.substring(0, 8) + '***',
      appId: result.app_id?.substring(0, 12) + '***',
    });
    return {
      token: result.token,
      apiKey: result.api_key,
      appId: result.app_id,
    };
  } catch (error: any) {
    logGetStreamStep('TOKEN_FETCH_FAILED', false, error);
    debugError('GETSTREAM_TOKEN', 'Token fetch failed', error);
   
    throw new Error(`Failed to authenticate with GetStream. Please check your network connection and try again.`);
  }
};

export const createStreamClient = async (appUser: any): Promise<StreamVideoClient> => {
  // Check if we should allow this connection attempt
  const connectionCheck = shouldAllowConnection();
  if (!connectionCheck.allowed) {
    // Silently prevent connection spam without throwing error
    if (connectionCheck.reason === 'Connection already in progress') {
      // Return a promise that resolves when current connection finishes
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!connectionState.isConnecting) {
            clearInterval(checkInterval);
            if (client) {
              resolve(client);
            } else {
              reject(new Error('Previous connection failed'));
            }
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Connection timeout'));
        }, 10000);
      });
    }
    
    const errorMsg = `Connection blocked: ${connectionCheck.reason}`;
    if (connectionCheck.waitTime) {
      throw new Error(`${errorMsg}. Wait ${Math.ceil(connectionCheck.waitTime / 1000)} seconds`);
    }
    throw new Error(errorMsg);
  }

  // Mark connection as starting
  connectionState.isConnecting = true;
  connectionState.lastConnectionAttempt = Date.now();

  if (client) {
    try {
      await client.disconnectUser();
    } catch (e) {
      console.log('Previous client disconnect error (non-critical):', e);
    }
    client = null;
  }

  try {
    console.log('Starting GetStream client creation for user:', appUser.username);
    console.log('Environment:', __DEV__ ? 'Development' : 'Production');
    
    // Fetch token and credentials from backend instead of using environment variables
    const { token, apiKey, appId } = await fetchStreamToken();
    console.log('Retrieved GetStream credentials from backend:', { 
      apiKey: apiKey?.substring(0, 8) + '***', 
      appId: appId?.substring(0, 12) + '***',
      tokenLength: token?.length || 0 
    });
    
    // Validate credentials before proceeding
    if (!token || !apiKey) {
      throw new Error('Invalid GetStream credentials received from backend');
    }
    
    // Create GetStream user object from app user
    const streamUser: User = createStreamUser(appUser);
    console.log('Created GetStream user:', { 
      id: streamUser.id, 
      name: streamUser.name, 
      hasImage: !!streamUser.image 
    });
    
    // Initialize client with API key and enhanced options
    client = new StreamVideoClient({
      apiKey,
      options: {
        timeout: __DEV__ ? 15000 : 30000, // Extended timeout for production
        logger: (logLevel, message, extraData) => {
          if (logLevel === 'error' || logLevel === 'warn') {
            console.log(`GetStream ${logLevel}:`, message, extraData ? JSON.stringify(extraData) : '');
          }
        },
        // Production-specific optimizations
        ...(!__DEV__ && {
          rtcConfiguration: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        })
      },
    });
    console.log('StreamVideoClient initialized with apiKey');

    // Connect user with token - add extended timeout for production and retry logic
    console.log('Connecting to GetStream servers...');
    
    const maxRetries = 2; // Reduced retries to prevent rate limiting
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const connectionPromise = client.connectUser(streamUser, token);
        const productionTimeout = __DEV__ ? 30000 : 45000; // Increased timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`GetStream connection timeout after ${productionTimeout/1000} seconds`)), productionTimeout)
        );
        
        await Promise.race([connectionPromise, timeoutPromise]);
        console.log('GetStream client created and user connected successfully');
        
        // Reset connection state on success
        resetConnectionState();
        return client;
      } catch (error: any) {
        retryCount++;
        console.log(`Connection attempt ${retryCount}/${maxRetries} failed:`, error?.message);
        
        // Check if this is a rate limiting error
        const isRateLimit = error?.message?.includes('rate') || 
                           error?.message?.includes('429') || 
                           error?.code === 9 ||
                           error?.message?.includes('Too many requests');
        
        if (isRateLimit) {
          markRateLimited();
          connectionState.isConnecting = false; // Allow other components to see we're rate limited
          throw new Error(`Stream.io rate limited. Please wait ${RATE_LIMIT_COOLDOWN/1000} seconds before trying again.`);
        }
        
        if (retryCount < maxRetries) {
          // For non-rate-limit errors, shorter wait with exponential backoff
          const waitTime = Math.min(1000 * Math.pow(2, retryCount), 5000); // 2s, 4s max
          console.log(`Retrying in ${waitTime/1000}s...`);
          debugLog('GETSTREAM_RETRY', `Connection failed - retrying in ${waitTime/1000}s`, { 
            attempt: retryCount, 
            errorMessage: error?.message 
          });
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        if (retryCount >= maxRetries) {
          connectionState.isConnecting = false;
          throw error;
        }
      }
    }
    
    // This should never be reached due to the throw above, but TypeScript needs it
    connectionState.isConnecting = false;
    throw new Error('Failed to connect after all retries');
  } catch (error: any) {
    console.error('❌ Failed to create GetStream client:', {
      error: error?.message || error,
      stack: error?.stack,
      appUserId: appUser?.id,
      appUsername: appUser?.username
    });
    
    // Clean up failed client
    if (client) {
      try {
        await client.disconnectUser();
      } catch (e) {
        // Ignore cleanup errors
      }
      client = null;
    }
    
    // Provide more specific error messages
    if (error?.message?.includes('timeout')) {
      throw new Error(`GetStream connection failed: Connection timeout. Please check your network connection and try again.`);
    } else if (error?.message?.includes('rate') || error?.message?.includes('429') || error?.code === 9) {
      throw new Error(`GetStream connection failed: Service temporarily unavailable due to high usage. Please wait a few minutes and try again.`);
    } else if (error?.message?.includes('credentials')) {
      throw new Error(`GetStream connection failed: Invalid credentials. Please contact support.`);
    } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      throw new Error(`GetStream connection failed: Network error. Please check your internet connection and try again.`);
    } else {
      throw new Error(`GetStream connection failed: ${error?.message || 'Unknown error'}. Please check your network connection and try again.`);
    }
  }
};

export const getStreamClient = (): StreamVideoClient | null => {
  return client;
};

export const disconnectStreamClient = async (): Promise<void> => {
  if (client) {
    try {
      await client.disconnectUser();
      client = null;
      console.log('GetStream client disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting GetStream client:', error);
    }
  }
};

// Generate a call ID for a stream
export const generateCallId = (streamId: string): string => {
  return `stream_${streamId}`;
};

// Generate a user object for GetStream from your app user
export const createStreamUser = (appUser: any): User => {
  return {
    id: appUser.id.toString(),
    name: appUser.first_name && appUser.last_name 
      ? `${appUser.first_name} ${appUser.last_name}`.trim()
      : appUser.username || `User ${appUser.id}`,
    image: appUser.profile_picture_url || appUser.profile_picture,
  };
};

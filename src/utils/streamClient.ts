import { StreamVideoClient, User } from '@stream-io/video-react-native-sdk';
import { store } from '../store';
import { streamsApi } from '../store/streamsApi';

let client: StreamVideoClient | null = null;

// Fetch GetStream token from backend
export const fetchStreamToken = async (): Promise<{token: string, apiKey: string, appId: string}> => {
  try {
    console.log('🔑 Fetching GetStream token from backend...');
    const result = await store.dispatch(streamsApi.endpoints.getStreamToken.initiate()).unwrap();
    console.log('✅ GetStream token received from backend:', {
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
  } catch (error) {
    console.error('❌ Failed to fetch GetStream token:', {
      error: error.message || error,
      status: error.status,
      data: error.data,
    });
    throw new Error(`Failed to authenticate with GetStream. Please check your network connection and try again.`);
  }
};

export const createStreamClient = async (appUser: any): Promise<StreamVideoClient> => {
  if (client) {
    try {
      await client.disconnectUser();
    } catch (e) {
      console.log('🔄 Previous client disconnect error (non-critical):', e);
    }
    client = null;
  }

  try {
    console.log('🚀 Starting GetStream client creation for user:', appUser.username);
    
    // Fetch token and credentials from backend instead of using environment variables
    const { token, apiKey, appId } = await fetchStreamToken();
    console.log('✅ Retrieved GetStream credentials from backend:', { 
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
    console.log('👤 Created GetStream user:', { 
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
    console.log('🔧 StreamVideoClient initialized with apiKey');

    // Connect user with token - add extended timeout for production
    console.log('🔗 Connecting to GetStream servers...');
    const connectionPromise = client.connectUser(streamUser, token);
    const productionTimeout = __DEV__ ? 15000 : 30000; // 30s for production
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`GetStream connection timeout after ${productionTimeout/1000} seconds`)), productionTimeout)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);

    console.log('✅ GetStream client created and user connected successfully');
    return client;
  } catch (error) {
    console.error('❌ Failed to create GetStream client:', {
      error: error.message,
      stack: error.stack,
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
    if (error.message?.includes('timeout')) {
      throw new Error(`GetStream connection failed: Connection timeout. Please check your network connection and try again.`);
    } else if (error.message?.includes('credentials')) {
      throw new Error(`GetStream connection failed: Invalid credentials. Please contact support.`);
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error(`GetStream connection failed: Network error. Please check your internet connection and try again.`);
    } else {
      throw new Error(`GetStream connection failed: ${error.message}. Please check your network connection and try again.`);
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
      console.log('✅ GetStream client disconnected');
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

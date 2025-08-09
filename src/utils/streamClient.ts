import { StreamVideoClient, User } from '@stream-io/video-react-native-sdk';
import { store } from '../store';
import { streamsApi } from '../store/streamsApi';

let client: StreamVideoClient | null = null;

// Fetch GetStream token from backend
export const fetchStreamToken = async (): Promise<{token: string, apiKey: string, appId: string}> => {
  try {
    const result = await store.dispatch(streamsApi.endpoints.getStreamToken.initiate()).unwrap();
    return {
      token: result.token,
      apiKey: result.api_key,
      appId: result.app_id,
    };
  } catch (error) {
    console.error('❌ Failed to fetch GetStream token:', error);
    throw new Error('Failed to authenticate with GetStream. Please try again.');
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
        timeout: 12000, // Increased timeout for better reliability
        logger: (logLevel, message, extraData) => {
          console.log(`GetStream ${logLevel}:`, message, extraData ? JSON.stringify(extraData) : '');
        },
      },
    });
    console.log('🔧 StreamVideoClient initialized with apiKey');

    // Connect user with token - add extended timeout for network issues
    console.log('🔗 Connecting to GetStream servers...');
    const connectionPromise = client.connectUser(streamUser, token);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('GetStream connection timeout after 12 seconds')), 12000)
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
    
    throw new Error(`GetStream connection failed: ${error.message}. Please check your network connection and try again.`);
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

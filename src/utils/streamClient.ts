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
    await client.disconnectUser();
  }

  try {
    // Fetch token and credentials from backend instead of using environment variables
    const { token, apiKey } = await fetchStreamToken();
    
    // Create GetStream user object from app user
    const streamUser: User = createStreamUser(appUser);
    
    // Initialize client with API key only
    client = new StreamVideoClient({
      apiKey,
    });

    // Connect user with token
    await client.connectUser(streamUser, token);

    console.log('✅ GetStream client created and user connected successfully');
    return client;
  } catch (error) {
    console.error('❌ Failed to create GetStream client:', error);
    throw error;
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

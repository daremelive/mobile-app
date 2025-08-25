import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../../src/store/authSlice';
import { 
  useAcceptInviteMutation,
  useJoinStreamMutation,
  useLeaveStreamMutation,
  useStreamActionMutation,
  streamsApi,
} from '../../../src/store/streamsApi';
import { StreamVideoClient, StreamCall, StreamVideo, VideoRenderer, useCallStateHooks } from '@stream-io/video-react-native-sdk';
import { Camera } from 'expo-camera';
import { createStreamClient, createStreamUser } from '../../../src/utils/streamClient';
import CancelIcon from '../../../assets/icons/cancel.svg';
import DareMeLiveIcon from '../../../assets/icons/daremelive.svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useStreamHeartbeat } from '../../../src/hooks/useStreamHeartbeat';

export default function MultiParticipantJoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  const streamId = (params.id as string) || '';
  const isHost = params.isHost === 'true';
  const mode = params.mode as string;

  const [acceptInvite] = useAcceptInviteMutation();
  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [streamAction] = useStreamActionMutation();

  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [leaveConfirmationVisible, setLeaveConfirmationVisible] = useState(false);
  const initTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add heartbeat for hosts to keep stream alive
  const { sendHeartbeat } = useStreamHeartbeat(streamId, isHost && hasJoined);

  useEffect(() => {
    if (currentUser?.id && streamId) {
      initializeParticipant();
    }
    return () => {
      if (initTimeout.current) clearTimeout(initTimeout.current);
      if (hasJoined) {
        // Best-effort leave on unmount
        handleLeave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, streamId]);

  // Immediate stream cleanup for multi-participant screen
  useEffect(() => {
    if (!streamId || !hasJoined) return;

    let backgroundTime: number | null = null;

    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'background') {
        backgroundTime = Date.now();
        
        if (isHost && hasJoined) {
          streamAction({ 
            streamId, 
            action: { action: 'end' } 
          }).unwrap().catch((error) => {
            console.error('[MultiScreen] Failed to end stream on immediate background:', error);
          });
          
          setTimeout(() => {
            if (isHost && hasJoined) {
              streamAction({ 
                streamId, 
                action: { action: 'end' } 
              }).unwrap().catch((error) => {
              });
            }
          }, 2000);
        }
      } else if (nextAppState === 'active') {
        backgroundTime = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      
      // End stream if host component is destroyed
      if (hasJoined && streamId && isHost) {
        console.log('[MultiScreen] Host component unmounting, ending stream...');
        streamAction({ 
          streamId, 
          action: { action: 'end' } 
        }).unwrap().catch((error) => {
          console.error('[MultiScreen] Failed to end stream on unmount:', error);
        });
      }
    };
  }, [streamId, hasJoined, isHost, streamAction]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (hasJoined && !isBusy) {
          handleLeave();
        }
      };
    }, [hasJoined, isBusy])
  );

  const initializeParticipant = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setIsConnecting(true);

    try {
      console.log('🚀 Initializing participant for stream:', streamId);
      
      const streamUser = createStreamUser(currentUser!);
      
      const client = await createStreamClient(streamUser);
      if (!client) throw new Error('Failed to initialize streaming client');
      setStreamClient(client);

      if (!isHost) {
        try {
          await acceptInvite(streamId).unwrap();
        } catch (e) {
          // Non-blocking
        }
      }

      // 3) Join backend as host or guest based on role
      const participantType = isHost ? 'host' : 'guest';
      try {
        await joinStream({ streamId, data: { participant_type: participantType } }).unwrap();
      } catch (err: any) {
        if (err?.data?.error && !String(err.data.error).includes('already in')) {
          throw err;
        }
      }

      // 4) Join GetStream call and enable media
      const callId = `stream_${streamId}`;
      const gCall = client.call('default', callId);
      try {
        await gCall.join({ create: false });
      } catch {
        await gCall.join({ create: true });
      }
      // Request permissions and publish camera and microphone
      try {
        console.log('📱 Requesting camera and microphone permissions...');
        const cam = await Camera.requestCameraPermissionsAsync();
        const mic = await Camera.requestMicrophonePermissionsAsync();
        console.log('📱 Permissions status:', { camera: cam.status, microphone: mic.status });
        
        if (cam.status !== 'granted' || mic.status !== 'granted') {
          Alert.alert('Permissions Required', 'Please allow camera and microphone to join as a participant.');
          throw new Error('Permissions not granted');
        }
      } catch (permErr) {
        console.error('❌ Permission error:', permErr);
      }
      
      // Enable camera and microphone with explicit logging
      try {
        console.log('🎥 Enabling camera...');
        await gCall.camera.enable();
        console.log('✅ Camera enabled successfully');
        
        console.log('🎙️ Enabling microphone...');
        await gCall.microphone.enable();
        console.log('✅ Microphone enabled successfully');
        
        // Wait a moment for streams to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('📊 Final call state:', {
          cameraEnabled: gCall.camera.state.status === 'enabled',
          microphoneEnabled: gCall.microphone.state.status === 'enabled',
          participantCount: gCall.state.participants?.length || 0
        });
      } catch (mediaErr) {
        console.error('❌ Media enabling error:', mediaErr);
        // Keep session even if media enabling fails
      }
      setCall(gCall);
      setHasJoined(true);
      setIsConnecting(false);
    } catch (error: any) {
      setIsConnecting(false);
      console.error('❌ Participant initialization failed:', error);
      
      const errorMessage = error?.data?.error || error?.message || 'Unable to join as participant';
      const isNetworkError = errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('connection');
      const isGetStreamError = errorMessage.includes('GetStream');
      
      let alertTitle = 'Join Failed';
      let alertMessage = errorMessage;
      
      if (isGetStreamError) {
        alertTitle = 'Streaming Service Error';
        alertMessage = 'There was an issue connecting to the streaming service. This might be temporary - please try again in a moment.';
      } else if (isNetworkError) {
        alertTitle = 'Network Error';
        alertMessage = 'Unable to connect to the streaming servers. Please check your internet connection and try again.';
      }
      
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { text: 'Go Back', onPress: () => router.back() },
          { text: 'Retry', onPress: () => {
            // Add small delay before retry to avoid overwhelming the service
            setTimeout(() => initializeParticipant(), 1000);
          }}
        ]
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleLeave = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      if (streamId) {
        try { await leaveStream(streamId).unwrap(); } catch {}
        dispatch(streamsApi.util.invalidateTags(['Stream']));
      }
      if (call) {
        try {
          await Promise.all([
            call.microphone.disable().catch(() => {}),
            call.camera.disable().catch(() => {}),
          ]);
          await call.leave();
        } catch {}
      }
      setHasJoined(false);
      router.back();
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmedLeave = async () => {
    console.log('🚪 Confirmed guest leave - leaving stream...');
    await handleLeave();
  };

  const Grid = () => {
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    
    // Filter out viewers - only show actual participants (host and guests)
    const activeParticipants = participants.filter((p: any) => {
      // Exclude viewer-only participants
      if (p.custom?.viewerOnly === true || p.custom?.role === 'viewer') return false;
      return true;
    });
    
    const active = activeParticipants.filter((p: any) => p.videoStream);
    const local = activeParticipants.find((p: any) => p.isLocalParticipant);

    if (!local) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white mt-3">Connecting…</Text>
          <Text className="text-gray-400 text-xs mt-2">
            Participants: {activeParticipants.length}
          </Text>
        </View>
      );
    }

    // Always show something - if no video participants, show local participant
    if (active.length === 0) {
      return (
        <View className="flex-1 bg-black">
          <VideoRenderer participant={local} objectFit="cover" />
          <View className="absolute top-4 left-4 bg-black/60 rounded px-2 py-1">
            <Text className="text-white text-xs">Camera initializing...</Text>
          </View>
        </View>
      );
    }

    if (active.length === 1) {
      return (
        <View className="flex-1 bg-black">
          <VideoRenderer participant={active[0]} objectFit="cover" />
          <View className="absolute bottom-4 left-4 bg-black/60 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-semibold">
              {active[0].isLocalParticipant ? 'You' : active[0].name || 'Guest'}
            </Text>
          </View>
        </View>
      );
    }

    if (active.length === 2) {
      return (
        <View className="flex-1 bg-black">
          <View className="flex-1">
            <VideoRenderer participant={active[0]} objectFit="cover" />
            <View className="absolute bottom-4 left-4 bg-black/60 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">
                {active[0].isLocalParticipant ? 'You' : active[0].name || 'Guest'}
              </Text>
            </View>
          </View>
          <View className="flex-1">
            <VideoRenderer participant={active[1]} objectFit="cover" />
            <View className="absolute bottom-4 left-4 bg-black/60 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">
                {active[1].isLocalParticipant ? 'You' : active[1].name || 'Guest'}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <View className="flex-1 flex-row">
          <View className="flex-1">
            <VideoRenderer participant={active[0]} objectFit="cover" />
          </View>
          <View className="flex-1">
            <VideoRenderer participant={active[1]} objectFit="cover" />
          </View>
        </View>
        <View className="flex-1 flex-row">
          <View className="flex-1">
            <VideoRenderer participant={active[2] || active[0]} objectFit="cover" />
          </View>
          {active[3] && (
            <View className="flex-1">
              <VideoRenderer participant={active[3]} objectFit="cover" />
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderBody = () => {
    if (isConnecting) {
      const connectingMessage = isHost
        ? (mode === 'single' ? 'Starting your stream…' : 'Preparing host session…')
        : 'Joining as participant…';
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white text-lg mt-4">{connectingMessage}</Text>
        </View>
      );
    }

    if (!streamClient || !call) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg">Connection error</Text>
          <TouchableOpacity onPress={initializeParticipant} className="mt-4 bg-[#C42720] px-4 py-2 rounded-lg">
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <StreamVideo client={streamClient}>
          <StreamCall call={call}>
            <Grid />
          </StreamCall>
        </StreamVideo>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="light" />
      <View className="flex-1">
        {renderBody()}
      </View>

      {/* Top overlay with leave button */}
      {hasJoined && (
        <View className="absolute top-16 right-4" style={{ zIndex: 10 }}>
          <TouchableOpacity onPress={() => setLeaveConfirmationVisible(true)} className="w-10 h-10 rounded-full items-center justify-center">
            <CancelIcon width={25} height={25} />
          </TouchableOpacity>
        </View>
      )}

      {/* Leave Stream Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={leaveConfirmationVisible}
        onRequestClose={() => setLeaveConfirmationVisible(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-gray-800/95 rounded-3xl p-8 w-full max-w-sm items-center">
            {/* Icon */}
            <View className="w-20 h-20 rounded-full bg-gray-700 items-center justify-center mb-6">
              <DareMeLiveIcon width={40} height={40} />
            </View>
            
            {/* Title */}
            <Text className="text-white text-2xl font-bold text-center mb-3">
              Leave Stream
            </Text>
            
            {/* Description */}
            <Text className="text-gray-300 text-base text-center leading-6 mb-8">
              Are you sure you want to leave as a guest? You'll no longer be able to speak in this stream and will return to viewer mode.
            </Text>
            
            {/* Buttons */}
            <View className="w-full space-y-3">
              {/* Stay as Guest Button */}
              <View className="w-full h-[52px] rounded-full overflow-hidden mb-6">
                <LinearGradient
                  colors={['#FF0000', '#330000']}
                  locations={[0, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="w-full h-full"
                >
                  <TouchableOpacity 
                    className="w-full h-full items-center justify-center"
                    onPress={() => setLeaveConfirmationVisible(false)}
                  >
                    <Text className="text-white text-[17px] font-semibold">Stay as Guest</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
              
              {/* Leave as Guest Button */}
              <View className="w-full h-[52px] rounded-full overflow-hidden">
                <LinearGradient
                  colors={['#4A5568', '#2D3748']}
                  locations={[0, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="w-full h-full"
                >
                  <TouchableOpacity 
                    className="w-full h-full items-center justify-center"
                    onPress={() => {
                      setLeaveConfirmationVisible(false);
                      handleConfirmedLeave();
                    }}
                  >
                    <Text className="text-white text-[17px] font-semibold">Leave as Guest</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

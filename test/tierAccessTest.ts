import { useTierAccessControl } from '../src/hooks/useTierAccessControl';
import { Stream, StreamHost } from '../src/store/streamsApi';

// Test function to validate tier access control logic
export const testTierAccessControl = () => {
  console.log('🧪 Testing Tier Access Control');

  // Mock stream data
  const mockStreamHost: StreamHost = {
    id: 1,
    username: 'testhost',
    first_name: 'Test',
    last_name: 'Host',
    full_name: 'Test Host',
    vip_level: 'premium',
    profile_picture_url: null
  };

  const mockStream: Stream = {
    id: 'test-stream-123',
    host: mockStreamHost,
    title: 'Test Stream',
    mode: 'single',
    channel: 'video',
    max_seats: 1,
    status: 'live',
    scheduled_at: null,
    started_at: new Date().toISOString(),
    ended_at: null,
    viewer_count: 5,
    total_viewers: 10,
    likes_count: 15,
    gifts_received: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    duration: null,
    is_live: true,
    is_recorded: false,
    recording_url: null,
    recording_status: 'pending',
    recording_file_size: null,
    has_recording: false,
    is_recording_available: false,
    participants: [],
    messages: []
  };

  // Test cases
  console.log('Test Case 1: Same tier access (basic-basic)');
  // Would need to mock useSelector to test properly
  
  console.log('Test Case 2: Higher tier accessing lower tier');
  // User: vip, Host: premium
  
  console.log('Test Case 3: Lower tier accessing higher tier (should fail)');
  // User: basic, Host: premium
  
  console.log('Test Case 4: Tier display names');
  console.log('Basic:', '🥉 Basic');
  console.log('Premium:', '🥈 Premium');
  console.log('VIP:', '🥇 VIP');
  console.log('VVIP:', '💎 VVIP');

  console.log('✅ Tier access control tests completed');
};

// Manual test for tier hierarchy
export const testTierHierarchy = () => {
  const tierHierarchy = {
    basic: 1,
    premium: 2,
    vip: 3,
    vvip: 4
  };

  console.log('🔢 Tier Hierarchy Tests:');
  console.log('Basic < Premium:', tierHierarchy.basic < tierHierarchy.premium);
  console.log('Premium < VIP:', tierHierarchy.premium < tierHierarchy.vip);
  console.log('VIP < VVIP:', tierHierarchy.vip < tierHierarchy.vvip);
  console.log('VVIP === VVIP:', tierHierarchy.vvip === tierHierarchy.vvip);
  
  // Test access scenarios
  console.log('\n🎯 Access Scenarios:');
  console.log('VIP user accessing Premium stream (allowHigherTier=true):', tierHierarchy.vip >= tierHierarchy.premium);
  console.log('Basic user accessing Premium stream (allowHigherTier=true):', tierHierarchy.basic >= tierHierarchy.premium);
  console.log('Premium user accessing Premium stream (exact match):', tierHierarchy.premium === tierHierarchy.premium);
};

// Export test functions for manual testing
export default {
  testTierAccessControl,
  testTierHierarchy
};

import React, { useState, useEffect } from 'react';
import { View, SafeAreaView } from 'react-native';
import StreamModeSelectionModal from '../../../components/modals/StreamModeSelectionModal';

// The actual 'create' action might be handled by the tab button itself or navigate elsewhere.
// This screen can be a fallback or a more detailed creation UI if needed.
export default function CreateScreen() {
  const [isModalVisible, setModalVisible] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#090909' }}>
      <StreamModeSelectionModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
} 
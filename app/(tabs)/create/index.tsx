import React, { useState, useEffect, useCallback } from 'react';
import { View, SafeAreaView } from 'react-native';
import StreamModeSelectionModal from '../../../components/modals/StreamModeSelectionModal';
import { useFocusEffect } from 'expo-router';

// The actual 'create' action might be handled by the tab button itself or navigate elsewhere.
// This screen can be a fallback or a more detailed creation UI if needed.
export default function CreateScreen() {
  const [isModalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Show the modal when the screen is focused
      setModalVisible(true);
      return () => {
        // Optional: hide the modal when the screen is unfocused
        // This can prevent seeing the modal briefly when switching tabs
        setModalVisible(false);
      };
    }, [])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#090909' }}>
      <StreamModeSelectionModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
} 
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import UniversalSearch from '../../../components/UniversalSearch';
import { MEDIA_BASE_URL } from '../../../src/config/env';

export default function SearchScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-black">
      <UniversalSearch
        mode="fullscreen"
        baseURL={MEDIA_BASE_URL}
        showTabs={true}
        autoFocus={true}
        placeholder="Search for streamers, content..."
      />
    </SafeAreaView>
  );
}

import React, { useMemo } from 'react';
import ShareContentModal, { ShareContent } from './ShareContentModal';
import { PUBLIC_WEB_BASE_URL } from '../src/config/env';

interface ShareProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userProfile: {
    id: string | number;
    username: string;
    full_name?: string;
    profile_picture_url?: string;
  };
}

export default function ShareProfileModal({ visible, onClose, userProfile }: ShareProfileModalProps) {
  const content = useMemo<ShareContent>(() => {
    const displayName = userProfile.full_name || userProfile.username;
    const url = `${PUBLIC_WEB_BASE_URL}/profile/${encodeURIComponent(userProfile.username)}` +
      '?utm_source=mobile_share&utm_medium=social';
    return {
      url,
      title: 'Share Profile',
      subtitle: 'Help others discover this creator',
      description: `Share ${displayName}'s DareMeLive profile with your friends and followers.`,
      linkLabel: 'Profile Link',
      dialogTitle: `Share ${displayName}'s profile`,
      shareText: `Discover ${displayName} on DareMeLive. Follow their profile: ${url}`,
      tweetText: `Discover ${displayName} on @DareMeLive: ${url} #DareMeLive`,
      telegramText: `Discover ${displayName} on DareMeLive.`,
    };
  }, [userProfile.full_name, userProfile.username]);

  return <ShareContentModal visible={visible} onClose={onClose} content={content} />;
}

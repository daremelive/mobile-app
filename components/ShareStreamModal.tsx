import React, { useMemo } from 'react';
import ShareContentModal, { ShareContent } from './ShareContentModal';
import { PUBLIC_WEB_BASE_URL } from '../src/config/env';

interface ShareStreamModalProps {
  visible: boolean;
  onClose: () => void;
  streamData: {
    id: string;
    title: string;
    host: {
      username: string;
      full_name?: string;
    };
    mode: 'single' | 'multi';
    channel: string;
    is_live?: boolean;
  };
}

export default function ShareStreamModal({ visible, onClose, streamData }: ShareStreamModalProps) {
  const content = useMemo<ShareContent>(() => {
    const hostName = streamData.host.full_name || streamData.host.username;
    const url = `${PUBLIC_WEB_BASE_URL}/stream/${encodeURIComponent(String(streamData.id))}` +
      `?utm_source=mobile_share&utm_medium=social&host=${encodeURIComponent(streamData.host.username)}`;
    const status = streamData.is_live ? 'Live now' : 'Stream';
    const format = streamData.mode === 'multi' ? 'multi-seat' : 'single-host';
    return {
      url,
      title: 'Share Stream',
      subtitle: streamData.is_live ? 'Invite others to join now' : 'Share this stream',
      description: `${streamData.title} by ${hostName} is a ${format} stream in ${streamData.channel}.`,
      linkLabel: 'Stream Link',
      dialogTitle: `Share ${streamData.title}`,
      shareText: `${status}: ${streamData.title} by ${hostName} on DareMeLive. Watch here: ${url}`,
      tweetText: `${status}: ${streamData.title} by ${hostName} on @DareMeLive. ${url} #DareMeLive`,
      telegramText: `${status}: ${streamData.title} by ${hostName} on DareMeLive.`,
    };
  }, [streamData]);

  return <ShareContentModal visible={visible} onClose={onClose} content={content} />;
}

import { useRef, useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useGetGiftsQuery, useSendGiftMutation } from '../../../src/store/streamsApi';
import { useGetWalletSummaryQuery, useGetCoinPackagesQuery, usePurchaseCoinsMutation } from '../../../src/api/walletApi';
import { UseGiftSystemProps } from './types';
import { createRequestId } from '../../../src/utils/requestId';
import logger from '../../../src/utils/logger';

export const useGiftSystem = ({ streamId, onGiftSent }: UseGiftSystemProps) => {
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  const [coinPurchaseModalVisible, setCoinPurchaseModalVisible] = useState(false);
  const [shouldOpenGiftModalAfterPurchase, setShouldOpenGiftModalAfterPurchase] = useState(false);

  // API hooks
  const {
    data: gifts = [],
    isLoading: giftsLoading,
    error: giftsError,
    refetch: refetchGifts
  } = useGetGiftsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: 0, // Disabled to prevent interference
  });

  const { data: walletSummary, isLoading: walletLoading, refetch: refetchWallet } = useGetWalletSummaryQuery();
  const { data: coinPackages = [], isLoading: packagesLoading } = useGetCoinPackagesQuery();
  const [sendGift] = useSendGiftMutation();
  const pendingGiftRequest = useRef<{ giftId: number; requestId: string } | null>(null);
  const [purchaseCoins] = usePurchaseCoinsMutation();

  // Memoize safe gifts to prevent unnecessary re-renders
  const safeGifts = useMemo(() => {
    if (!Array.isArray(gifts)) return [];

    const validGifts = gifts
      .filter(gift => gift && typeof gift === 'object' && gift.id)
      .filter(gift => gift.is_active !== false);

    return validGifts;
  }, [gifts]);

  // Handle gift press
  const handleGiftPress = useCallback(() => {
    setGiftModalVisible(true);
    refetchGifts();
  }, [refetchGifts]);

  // Handle send gift
  const handleSendGift = useCallback(async (gift: any) => {
    if (!streamId) {
      Alert.alert('Error', 'Stream not found');
      return;
    }

    // Check if user has enough coins
    if (walletSummary && walletSummary.coins < gift.cost) {
      const coinsNeeded = gift.cost - walletSummary.coins;
      Alert.alert(
        'Need more Riz',
        `You need ${coinsNeeded} more coins to send "${gift.name}".\n\nYour balance: ${walletSummary.coins} coins\nGift cost: ${gift.cost} coins`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Get Riz',
            style: 'default',
            onPress: () => {
              setGiftModalVisible(false);
              setShouldOpenGiftModalAfterPurchase(true);
              setCoinPurchaseModalVisible(true);
            }
          }
        ],
        { cancelable: true }
      );
      return;
    }

    setSendingGift(true);

    try {
      let giftRequest = pendingGiftRequest.current;
      if (!giftRequest || giftRequest.giftId !== gift.id) {
        giftRequest = {
          giftId: gift.id,
          requestId: createRequestId('gift'),
        };
      }
      pendingGiftRequest.current = giftRequest;
      const result = await sendGift({
        streamId,
        data: {
          gift_id: gift.id,
          request_id: giftRequest.requestId,
        }
      }).unwrap();
      pendingGiftRequest.current = null;

      // Trigger gift animation
      if (onGiftSent) {
        onGiftSent(gift);
      }

      // Refresh wallet to show updated balance
      refetchWallet();

      // Close gift modal
      setGiftModalVisible(false);

      Alert.alert(
        'Gift sent',
        `You sent "${gift.name}" successfully.`,
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error: any) {
      logger.error('Could not send gift', error);
      Alert.alert('Error', 'Failed to send gift. Please try again.');
    } finally {
      setSendingGift(false);
    }
  }, [streamId, walletSummary, sendGift, onGiftSent, refetchWallet]);

  // Handle coin purchase
  const handleCoinPurchase = useCallback(async (packageData: any) => {
    try {
      await purchaseCoins({
        package_id: packageData.id,
        payment_method: 'paystack' // Default payment method
      }).unwrap();

      refetchWallet();
      setCoinPurchaseModalVisible(false);

      // Open gift modal if it was requested after purchase
      if (shouldOpenGiftModalAfterPurchase) {
        setGiftModalVisible(true);
        setShouldOpenGiftModalAfterPurchase(false);
      }

      Alert.alert('Success', `Successfully purchased ${packageData.coins} Riz!`);
    } catch (error: any) {
      logger.error('Could not purchase Riz', error);
      Alert.alert('Error', 'Failed to purchase Riz. Please try again.');
    }
  }, [purchaseCoins, refetchWallet, shouldOpenGiftModalAfterPurchase]);

  return {
    // State
    giftModalVisible,
    sendingGift,
    coinPurchaseModalVisible,
    shouldOpenGiftModalAfterPurchase,

    // Data
    safeGifts,
    giftsLoading,
    giftsError,
    walletSummary,
    walletLoading,
    coinPackages,
    packagesLoading,

    // Actions
    handleGiftPress,
    handleSendGift,
    handleCoinPurchase,
    setGiftModalVisible,
    setCoinPurchaseModalVisible,
    setShouldOpenGiftModalAfterPurchase,
    refetchGifts,
    refetchWallet,
  };
};

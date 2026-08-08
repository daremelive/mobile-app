/**
 * React Hook for Apple In-App Purchases
 * 
 * Provides easy access to IAP functionality in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { iapService, IAPProduct, IAPPurchaseResult, ALL_PRODUCT_IDS } from '../services/iapService';
import { useGetWalletSummaryQuery } from '../api/walletApi';
import { logger } from '../utils/logger';

export interface UseIAPReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  products: IAPProduct[];
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<IAPPurchaseResult>;
  restorePurchases: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  
  // Helpers
  isIOS: boolean;
  isAvailable: boolean;
}

export const useIAP = (): UseIAPReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { refetch: refetchWallet } = useGetWalletSummaryQuery();

  const isIOS = Platform.OS === 'ios';

  /**
   * Initialize IAP service
   */
  const initialize = useCallback(async () => {
    if (!isIOS) {
      logger.log('IAP not available on non-iOS platforms');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await iapService.initialize();
      
      if (success) {
        setIsInitialized(true);
        const fetchedProducts = await iapService.fetchProducts();
        setProducts(fetchedProducts);
      } else {
        setError('Failed to initialize IAP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize IAP');
    } finally {
      setIsLoading(false);
    }
  }, [isIOS]);

  /**
   * Purchase a product
   */
  const purchaseProduct = useCallback(async (productId: string): Promise<IAPPurchaseResult> => {
    if (!isInitialized) {
      return { success: false, error: 'IAP not initialized' };
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const result = await iapService.purchaseProduct(productId);
      
      if (result.success) {
        // Refresh wallet balance after successful purchase
        await refetchWallet();
        
        Alert.alert(
          '🎉 Purchase Successful!',
          `You've received ${result.rizAmount} Riz!`,
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else if (result.error && result.error !== 'Purchase cancelled') {
        setError(result.error);
        Alert.alert('Purchase Failed', result.error);
      }
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Purchase failed';
      setError(errorMessage);
      Alert.alert('Purchase Error', errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsPurchasing(false);
    }
  }, [isInitialized, refetchWallet]);

  /**
   * Restore previous purchases
   */
  const restorePurchases = useCallback(async () => {
    if (!isInitialized) {
      Alert.alert('Error', 'IAP not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await iapService.restorePurchases();
      
      if (success) {
        await refetchWallet();
        Alert.alert('Success', 'Purchases restored successfully!');
      } else {
        Alert.alert('Info', 'No purchases to restore');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to restore purchases');
      Alert.alert('Error', 'Failed to restore purchases');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, refetchWallet]);

  /**
   * Refresh products list
   */
  const refreshProducts = useCallback(async () => {
    if (!isInitialized) return;

    setIsLoading(true);
    
    try {
      const fetchedProducts = await iapService.fetchProducts();
      setProducts(fetchedProducts);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh products');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (isIOS && !isInitialized) {
      initialize();
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect - we want to keep the connection alive
      // iapService.disconnect();
    };
  }, [isIOS, isInitialized, initialize]);

  return {
    isInitialized,
    isLoading,
    isPurchasing,
    products,
    error,
    initialize,
    purchaseProduct,
    restorePurchases,
    refreshProducts,
    isIOS,
    isAvailable: isIOS && isInitialized,
  };
};

export default useIAP;

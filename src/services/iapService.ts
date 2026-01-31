/**
 * Apple In-App Purchase Service
 * 
 * This service handles all Apple IAP operations for purchasing Riz coins.
 * It integrates with StoreKit via expo-in-app-purchases.
 */

import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/env';
import * as SecureStore from 'expo-secure-store';

// IAP Product IDs - These must match the products in App Store Connect
export const IAP_PRODUCT_IDS = {
  RIZ_100: 'com.mobile.daremelive.riz.100',
  RIZ_500: 'com.mobile.daremelive.riz.500',
  RIZ_1000: 'com.mobile.daremelive.riz.1000',
  RIZ_2000: 'com.mobile.daremelive.riz.2000',
  RIZ_5000: 'com.mobile.daremelive.riz.5000',
  RIZ_10000: 'com.mobile.daremelive.riz.10000',
};

// All product IDs as array for fetching
export const ALL_PRODUCT_IDS = Object.values(IAP_PRODUCT_IDS);

// Types
export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  rizAmount: number;
}

export interface IAPPurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  rizAmount?: number;
  error?: string;
}

export interface IAPReceiptValidationResponse {
  success: boolean;
  message: string;
  coins_added?: number;
  new_balance?: number;
  transaction_id?: string;
}

// Map product IDs to Riz amounts
const PRODUCT_RIZ_AMOUNTS: Record<string, number> = {
  [IAP_PRODUCT_IDS.RIZ_100]: 100,
  [IAP_PRODUCT_IDS.RIZ_500]: 500,
  [IAP_PRODUCT_IDS.RIZ_1000]: 1000,
  [IAP_PRODUCT_IDS.RIZ_2000]: 2000,
  [IAP_PRODUCT_IDS.RIZ_5000]: 5000,
  [IAP_PRODUCT_IDS.RIZ_10000]: 10000,
};

class IAPService {
  private isInitialized = false;
  private products: IAPProduct[] = [];

  /**
   * Initialize the IAP service
   * Must be called before any other IAP operations
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('📦 IAP Service already initialized');
      return true;
    }

    // Only initialize on iOS
    if (Platform.OS !== 'ios') {
      console.log('📦 IAP Service: Skipping initialization on non-iOS platform');
      return false;
    }

    try {
      console.log('📦 Initializing IAP Service...');
      
      // Connect to the App Store
      await InAppPurchases.connectAsync();
      
      // Set up purchase listener
      InAppPurchases.setPurchaseListener(this.handlePurchaseUpdate.bind(this));
      
      this.isInitialized = true;
      console.log('✅ IAP Service initialized successfully');
      
      // Fetch products
      await this.fetchProducts();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize IAP Service:', error);
      return false;
    }
  }

  /**
   * Disconnect from the App Store
   * Call this when the app is closing or IAP is no longer needed
   */
  async disconnect(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await InAppPurchases.disconnectAsync();
      this.isInitialized = false;
      console.log('📦 IAP Service disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect IAP Service:', error);
    }
  }

  /**
   * Fetch available products from the App Store
   */
  async fetchProducts(): Promise<IAPProduct[]> {
    if (!this.isInitialized) {
      console.warn('⚠️ IAP Service not initialized');
      return [];
    }

    try {
      console.log('📦 Fetching IAP products...');
      
      const { results, responseCode } = await InAppPurchases.getProductsAsync(ALL_PRODUCT_IDS);
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        this.products = results.map((product) => ({
          productId: product.productId,
          title: product.title,
          description: product.description,
          price: product.price,
          priceAmountMicros: product.priceAmountMicros,
          priceCurrencyCode: product.priceCurrencyCode,
          rizAmount: PRODUCT_RIZ_AMOUNTS[product.productId] || 0,
        }));
        
        console.log(`✅ Fetched ${this.products.length} IAP products`);
        return this.products;
      } else {
        console.warn('⚠️ Failed to fetch products, response code:', responseCode);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching IAP products:', error);
      return [];
    }
  }

  /**
   * Get cached products
   */
  getProducts(): IAPProduct[] {
    return this.products;
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(productId: string): Promise<IAPPurchaseResult> {
    if (!this.isInitialized) {
      return { success: false, error: 'IAP Service not initialized' };
    }

    if (Platform.OS !== 'ios') {
      return { success: false, error: 'IAP only available on iOS' };
    }

    try {
      console.log(`📦 Starting purchase for product: ${productId}`);
      
      await InAppPurchases.purchaseItemAsync(productId);
      
      // The actual result will come through the purchase listener
      // Return a pending state
      return { 
        success: true, 
        productId,
        rizAmount: PRODUCT_RIZ_AMOUNTS[productId] 
      };
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      
      // Handle user cancellation
      if (error.code === 'E_USER_CANCELLED') {
        return { success: false, error: 'Purchase cancelled' };
      }
      
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }

  /**
   * Handle purchase updates from the App Store
   */
  private async handlePurchaseUpdate(queryResponse: InAppPurchases.IAPQueryResponse<InAppPurchases.InAppPurchase>): Promise<void> {
    console.log('📦 Purchase update received:', queryResponse);

    const { responseCode, results } = queryResponse;

    if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
      for (const purchase of results) {
        if (!purchase.acknowledged) {
          console.log('📦 Processing purchase:', purchase.productId);
          
          // Validate the receipt with our backend
          const validation = await this.validateReceipt(purchase);
          
          if (validation.success) {
            // Finish the transaction
            await InAppPurchases.finishTransactionAsync(purchase, true);
            console.log('✅ Purchase completed and acknowledged');
          } else {
            console.error('❌ Receipt validation failed:', validation.message);
            // Still finish the transaction to prevent duplicate charges
            await InAppPurchases.finishTransactionAsync(purchase, false);
          }
        }
      }
    } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
      console.log('📦 Purchase cancelled by user');
    } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
      console.log('📦 Purchase deferred (Ask to Buy)');
    } else {
      console.error('❌ Purchase failed with code:', responseCode);
    }
  }

  /**
   * Validate the receipt with our backend server
   * This is CRITICAL for security - never trust the client alone!
   */
  private async validateReceipt(purchase: InAppPurchases.InAppPurchase): Promise<IAPReceiptValidationResponse> {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      
      if (!token) {
        return { success: false, message: 'User not authenticated' };
      }

      const response = await fetch(`${API_BASE_URL}wallet/validate-apple-receipt/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receipt_data: purchase.transactionReceipt,
          product_id: purchase.productId,
          transaction_id: purchase.orderId, // orderId is the transaction identifier
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: data.message || 'Receipt validated successfully',
          coins_added: data.coins_added,
          new_balance: data.new_balance,
          transaction_id: data.transaction_id,
        };
      } else {
        return {
          success: false,
          message: data.message || data.detail || 'Receipt validation failed',
        };
      }
    } catch (error: any) {
      console.error('❌ Receipt validation error:', error);
      return {
        success: false,
        message: error.message || 'Network error during validation',
      };
    }
  }

  /**
   * Restore previous purchases
   * Useful for when users reinstall the app or get a new device
   */
  async restorePurchases(): Promise<boolean> {
    if (!this.isInitialized) {
      console.warn('⚠️ IAP Service not initialized');
      return false;
    }

    try {
      console.log('📦 Restoring purchases...');
      
      const { results, responseCode } = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        console.log(`✅ Found ${results.length} previous purchases`);
        
        // Re-validate each purchase with our backend
        for (const purchase of results) {
          await this.validateReceipt(purchase);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      return false;
    }
  }

  /**
   * Check if IAP is available on this device
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && this.isInitialized;
  }

  /**
   * Get Riz amount for a product ID
   */
  getRizAmount(productId: string): number {
    return PRODUCT_RIZ_AMOUNTS[productId] || 0;
  }
}

// Export a singleton instance
export const iapService = new IAPService();

// Export default for convenience
export default iapService;

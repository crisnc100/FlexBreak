import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform } from 'react-native';
import * as storageService from './storageService';

// Define types for IAP responses to help TypeScript
interface IAPPurchaseResult {
  responseCode: number;
  results: Array<{
    productId: string;
    transactionId?: string;
    originalOrderId?: string;
    purchaseToken?: string;
    purchaseTime?: number;
    [key: string]: any;
  }>;
}

// Define subscription product IDs
export const PRODUCTS = {
  MONTHLY_SUB: Platform.select({
    ios: 'flexbreak_monthly_4.99',
    android: 'flexbreak_monthly_4.99',
    default: 'flexbreak_monthly_4.99',
  }),
  YEARLY_SUB: Platform.select({
    ios: 'flexbreak_yearly_44.99',
    android: 'flexbreak_yearly_44.99',
    default: 'flexbreak_yearly_44.99',
  }),
};

// Initialize IAP module
export const initializeIAP = async () => {
  try {
    // First disconnect to ensure we don't have an existing connection
    try {
      await InAppPurchases.disconnectAsync();
      console.log('Disconnected existing IAP connection');
    } catch (disconnectError) {
      // Ignore any disconnect errors, just continue
      console.log('No existing IAP connection to disconnect');
    }

    // Now we can safely connect
    await InAppPurchases.connectAsync();
    console.log('IAP connection established');
    return true;
  } catch (error) {
    // Check if the error is just that we're already connected
    if (error instanceof Error && error.message.includes('Already connected')) {
      console.log('Already connected to App Store, proceeding with existing connection');
      return true; // Return true because we do have a connection
    }
    
    console.error('Failed to establish IAP connection:', error);
    return false;
  }
};

// Disconnect IAP
export const disconnectIAP = async () => {
  try {
    await InAppPurchases.disconnectAsync();
    console.log('IAP connection closed');
  } catch (error) {
    console.error('Failed to disconnect IAP:', error);
  }
};

// Get products info
export const getProducts = async () => {
  try {
    const productIDs = Object.values(PRODUCTS);
    console.log('Requesting products with IDs:', productIDs);
    
    // Add a small delay before getProductsAsync to ensure connection is ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { results } = await InAppPurchases.getProductsAsync(productIDs);
    console.log('IAP products loaded:', results);
    return results;
  } catch (error) {
    console.error('Failed to get products:', error);
    return [];
  }
};

// Format purchase data into subscription details
const formatSubscriptionDetails = (purchase: any) => {
  const now = new Date();
  // Default to 1 month expiry if not specified
  let expiryDate = new Date(now);
  
  // Check if it's a monthly or yearly subscription
  if (purchase.productId === PRODUCTS.MONTHLY_SUB) {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  } else if (purchase.productId === PRODUCTS.YEARLY_SUB) {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  }
  
  return {
    productId: purchase.productId,
    purchaseDate: now.toISOString(),
    expiryDate: expiryDate.toISOString(),
    isActive: true,
    autoRenewing: true,
    platform: (Platform.OS === 'ios' ? 'ios' : 'android') as 'ios' | 'android',
    purchaseToken: purchase.transactionId || purchase.originalOrderId || purchase.purchaseToken,
  };
};

// Purchase subscription
export const purchaseSubscription = async (productId: string, updateSubscription: Function) => {
  try {
    console.log(`Initiating purchase for ${productId}`);
    // Cast to our defined type to fix TypeScript errors
    const result = await InAppPurchases.purchaseItemAsync(productId) as unknown as IAPPurchaseResult | null;
    
    // Handle case where result might be null
    if (!result) {
      return { success: false, error: 'No result from purchase' };
    }
    
    const { responseCode, results } = result;
    
    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      console.log('Purchase successful:', results);
      
      // Check if results is an array with items
      if (Array.isArray(results) && results.length > 0) {
        // Handle purchase verification (receipt validation would typically go here)
        const purchase = results[0];
        
        // Format subscription details
        const subscriptionDetails = formatSubscriptionDetails(purchase);
        
        // Update subscription details and premium status
        if (updateSubscription) {
          await updateSubscription(subscriptionDetails);
        } else {
          // Fallback to old method if context function not available
          await storageService.saveSubscriptionDetails(subscriptionDetails);
          await storageService.saveIsPremium(true);
        }
        
        return { success: true, purchase: results[0], subscriptionDetails };
      }
    }
    
    return { success: false, responseCode };
  } catch (error) {
    console.error('Error during purchase:', error);
    return { success: false, error };
  }
};

// Restore purchases
export const restorePurchases = async (updateSubscription: Function) => {
  try {
    console.log('Restoring purchases...');
    // Cast to our defined type to fix TypeScript errors
    const result = await InAppPurchases.getPurchaseHistoryAsync() as unknown as IAPPurchaseResult | null;
    
    // Handle case where result might be null
    if (!result) {
      return { success: false, error: 'No result from restore purchases' };
    }
    
    const { responseCode, results } = result;
    
    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      console.log('Restored purchases:', results);
      
      // Ensure results is an array before proceeding
      if (!Array.isArray(results)) {
        return { success: true, hasPurchases: false };
      }
      
      // Check if any valid subscription exists
      const validSubscriptions = results.filter(purchase => 
        Object.values(PRODUCTS).includes(purchase.productId)
      );
      
      if (validSubscriptions.length > 0) {
        // Get the most recent subscription
        const latestPurchase = validSubscriptions.reduce((latest, current) => {
          const latestDate = latest.purchaseTime || 0;
          const currentDate = current.purchaseTime || 0;
          return currentDate > latestDate ? current : latest;
        }, validSubscriptions[0]);
        
        // Format subscription details
        const subscriptionDetails = formatSubscriptionDetails(latestPurchase);
        
        // Update subscription details and premium status
        if (updateSubscription) {
          await updateSubscription(subscriptionDetails);
        } else {
          // Fallback to old method if context function not available
          await storageService.saveSubscriptionDetails(subscriptionDetails);
          await storageService.saveIsPremium(true);
        }
        
        return { success: true, hasPurchases: true, subscriptionDetails };
      }
      
      return { success: true, hasPurchases: results.length > 0 };
    }
    
    return { success: false, responseCode };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return { success: false, error };
  }
};
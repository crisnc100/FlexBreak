// IAP Service using expo-in-app-purchases
import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform } from 'react-native';
import * as storageService from './storageService';

// Define product IDs (using proper App Store IDs)
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

// Define types for subscription details
export interface SubscriptionDetails {
  productId: string;
  purchaseDate: string;
  expiryDate: string;
  isActive: boolean;
  autoRenewing: boolean;
  platform: 'ios' | 'android';
  purchaseToken: string;
}

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
    
    // Set up purchase listener
    InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
      console.log(`Purchase listener triggered: responseCode=${responseCode}, errorCode=${errorCode || 'none'}`);
      console.log(`Response code meaning: ${InAppPurchases.IAPResponseCode[responseCode] || 'Unknown'}`);
      
      if (Array.isArray(results)) {
        console.log(`Purchase listener results (${results.length}):`, JSON.stringify(results, null, 2));
      } else {
        console.log('Purchase listener results: none or invalid');
      }
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (results && Array.isArray(results)) {
          results.forEach((purchase, index) => {
            console.log(`Processing purchase result ${index + 1}/${results.length}`);
            
            // Complete the transaction after handling it
            if (Platform.OS === 'ios') {
              console.log(`Finishing transaction for product: ${purchase.productId}`);
              try {
                InAppPurchases.finishTransactionAsync(purchase, true);
                console.log('Transaction finished successfully');
              } catch (e) {
                console.error('Error finishing transaction:', e);
              }
            }
          });
        }
      } else {
        console.error('Purchase event error:', { responseCode, errorCode });
      }
    });
    
    return true;
  } catch (error) {
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
const formatSubscriptionDetails = (purchase: any): SubscriptionDetails => {
  const now = new Date();
  let expiryDate = new Date(now);
  
  // For iOS, parse the receipt data to get the real expiration date
  if (Platform.OS === 'ios' && purchase.originalTransactionId) {
    // In a real implementation, you would validate the receipt with Apple's server
    // and get the actual expiration date from the response.
    // For testing, we'll use a mock expiration date based on the product ID.
  }
  
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
    autoRenewing: Platform.OS === 'android' ? purchase.autoRenewingAndroid || false : true,
    platform: (Platform.OS === 'ios' ? 'ios' : 'android') as 'ios' | 'android',
    purchaseToken: purchase.transactionId || purchase.originalTransactionId || purchase.purchaseToken || '',
  };
};

// Purchase subscription
export const purchaseSubscription = async (productId: string, updateSubscription: Function) => {
  try {
    console.log(`Initiating purchase for ${productId}`);
    
    // Make the purchase
    let purchaseResponse;
    try {
      console.log('Calling purchaseItemAsync...');
      purchaseResponse = await InAppPurchases.purchaseItemAsync(productId);
      console.log('Purchase response received:', JSON.stringify(purchaseResponse, null, 2));
    } catch (e) {
      console.error('Purchase error (thrown exception):', e);
      return { success: false, error: e };
    }
    
    // Handle case where response might be null
    if (!purchaseResponse) {
      console.error('Purchase response is null');
      return { success: false, error: 'No result from purchase' };
    }
    
    const { responseCode, results } = purchaseResponse;
    console.log(`Purchase responseCode: ${responseCode} (${InAppPurchases.IAPResponseCode[responseCode] || 'Unknown'})`);
    
    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      console.log('Purchase successful:', JSON.stringify(results, null, 2));
      
      // Check if results has items
      if (results && results.length > 0) {
        // Handle purchase verification (receipt validation would go here in production)
        const purchase = results[0];
        console.log('Processing purchase:', JSON.stringify(purchase, null, 2));
        
        // Format subscription details
        const subscriptionDetails = formatSubscriptionDetails(purchase);
        console.log('Formatted subscription details:', JSON.stringify(subscriptionDetails, null, 2));
        
        // Update subscription details and premium status
        if (updateSubscription) {
          console.log('Calling updateSubscription');
          await updateSubscription(subscriptionDetails);
        } else {
          // Fallback to old method if context function not available
          console.log('Using fallback storage method for subscription');
          await storageService.saveSubscriptionDetails(subscriptionDetails);
          await storageService.saveIsPremium(true);
        }
        
        console.log('Purchase processing completed successfully');
        return { success: true, purchase: results[0], subscriptionDetails };
      } else {
        console.error('Purchase results array is empty or undefined');
      }
    } else {
      console.error(`Purchase failed with responseCode: ${responseCode} (${InAppPurchases.IAPResponseCode[responseCode] || 'Unknown'})`);
    }
    
    return { success: false, responseCode };
  } catch (error) {
    console.error('Unexpected error during purchase:', error);
    return { success: false, error };
  }
};

// Restore purchases
export const restorePurchases = async (updateSubscription: Function) => {
  try {
    console.log('Restoring purchases...');
    
    // Fetch purchase history
    let historyResponse;
    try {
      historyResponse = await InAppPurchases.getPurchaseHistoryAsync();
    } catch (e) {
      console.error('Restore error:', e);
      return { success: false, error: e };
    }
    
    // Handle case where response might be null
    if (!historyResponse) {
      return { success: false, error: 'No result from restore purchases' };
    }
    
    const { responseCode, results } = historyResponse;
    
    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      console.log('Restored purchases:', results);
      
      // Ensure results exists and has items
      if (!results || results.length === 0) {
        return { success: true, hasPurchases: false };
      }
      
      // Check if any valid subscription exists
      const validSubscriptions = results.filter(purchase => 
        Object.values(PRODUCTS).includes(purchase.productId)
      );
      
      if (validSubscriptions.length > 0) {
        // Get the most recent subscription
        const latestPurchase = validSubscriptions.reduce((latest, current) => {
          // Safe check for purchaseTime or purchaseDate or transactionDate
          const getTimestamp = (purchase: any) => {
            return purchase.purchaseTime || 
                   (purchase.purchaseDate ? new Date(purchase.purchaseDate).getTime() : 0) ||
                   (purchase.transactionDate ? new Date(purchase.transactionDate).getTime() : 0) ||
                   0;
          };
          
          const latestTime = getTimestamp(latest);
          const currentTime = getTimestamp(current);
          
          return currentTime > latestTime ? current : latest;
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
      
      return { success: true, hasPurchases: false };
    }
    
    return { success: false, responseCode };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return { success: false, error };
  }
};

// Check if a subscription is still valid
export const isSubscriptionActive = (subscriptionDetails: SubscriptionDetails | null): boolean => {
  if (!subscriptionDetails) return false;
  
  const now = new Date();
  const expiryDate = new Date(subscriptionDetails.expiryDate);
  
  return expiryDate > now && subscriptionDetails.isActive;
};
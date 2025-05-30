/**
 * Discount Pricing Service
 * Handles logic for showing appropriate IAP products based on verification status
 */

import { PRODUCTS } from './iapService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserType = 'student' | 'office';
export type VerificationStatus = 'verified' | 'trial' | 'pending' | 'none';

export interface PricingProduct {
  productId: string;
  isDiscounted: boolean;
  discountPercentage?: number;
  originalProductId?: string;
  userType?: UserType;
}

export class DiscountPricingService {
  
  /**
   * Get verification status from AsyncStorage (simplified approach)
   */
  static async getVerificationStatus(): Promise<{
    status: VerificationStatus;
    userType?: UserType;
    trialDaysLeft?: number;
  }> {
    try {
      const status = await AsyncStorage.getItem('@flexbreak:verification_status');
      const userType = await AsyncStorage.getItem('@flexbreak:user_type');
      const trialStarted = await AsyncStorage.getItem('@flexbreak:trial_started');
      
      let finalStatus: VerificationStatus = 'none';
      let trialDaysLeft: number | undefined;
      
      if (status === 'verified') {
        finalStatus = 'verified';
      } else if (status === 'trial' && trialStarted) {
        const daysElapsed = Math.floor((Date.now() - parseInt(trialStarted)) / (1000 * 60 * 60 * 24));
        trialDaysLeft = Math.max(0, 7 - daysElapsed);
        
        if (trialDaysLeft > 0) {
          finalStatus = 'trial';
        } else {
          finalStatus = 'none'; // Trial expired
        }
      }
      
      return {
        status: finalStatus,
        userType: userType as UserType | undefined,
        trialDaysLeft
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return { status: 'none' };
    }
  }
  
  /**
   * Get the appropriate product IDs to fetch based on verification status
   */
  static async getProductIdsToFetch(): Promise<string[]> {
    const { status, userType } = await this.getVerificationStatus();
    
    // Always include regular pricing
    const productIds = [
      PRODUCTS.MONTHLY_SUB,
      PRODUCTS.YEARLY_SUB
    ];
    
    // Add discounted products if verified OR on trial
    if (status === 'verified' || status === 'trial') {
      productIds.push(PRODUCTS.MONTHLY_VERIFIED, PRODUCTS.YEARLY_VERIFIED);
    }
    
    return productIds;
  }

  /**
   * Get the products to display in subscription modal
   */
  static async getDisplayProducts(allProducts: any[]): Promise<{
    monthly: any;
    yearly: any;
    hasDiscount: boolean;
    userType?: UserType;
    trialDaysLeft?: number;
  }> {
    const { status, userType, trialDaysLeft } = await this.getVerificationStatus();
    
    let monthly, yearly;
    let hasDiscount = false;
    
    if ((status === 'verified' || status === 'trial') && userType) {
      // Use discounted products for verified users OR trial users
      monthly = allProducts.find(p => p.productId === PRODUCTS.MONTHLY_VERIFIED);
      yearly = allProducts.find(p => p.productId === PRODUCTS.YEARLY_VERIFIED);
      hasDiscount = true;
    }
    
    // Fallback to regular products if discounted not available
    if (!monthly || !yearly) {
      monthly = allProducts.find(p => p.productId === PRODUCTS.MONTHLY_SUB);
      yearly = allProducts.find(p => p.productId === PRODUCTS.YEARLY_SUB);
      hasDiscount = false;
    }
    
    return {
      monthly,
      yearly,
      hasDiscount,
      userType: hasDiscount ? userType : undefined,
      trialDaysLeft
    };
  }

  /**
   * Get pricing display information for a product
   */
  static async getPricingDisplay(product: any): Promise<{
    price: string;
    originalPrice?: string;
    isDiscounted: boolean;
    discountPercentage?: number;
  }> {
    const { status, userType } = await this.getVerificationStatus();
    
    const isDiscountedProduct = this.isDiscountedProductId(product.productId);
    
    if ((status === 'verified' || status === 'trial') && isDiscountedProduct) {
      // Find the original product for comparison
      const originalProductId = this.getOriginalProductId(product.productId);
      
      return {
        price: product.price,
        originalPrice: this.getOriginalPrice(originalProductId, product.priceAmountMicros),
        isDiscounted: true,
        discountPercentage: 60
      };
    }
    
    return {
      price: product.price,
      isDiscounted: false
    };
  }

  /**
   * Check if a product ID is a discounted product
   */
  private static isDiscountedProductId(productId: string): boolean {
    return productId === PRODUCTS.MONTHLY_VERIFIED ||
           productId === PRODUCTS.YEARLY_VERIFIED;
  }

  /**
   * Get the original product ID for a discounted product
   */
  private static getOriginalProductId(discountedProductId: string): string {
    switch (discountedProductId) {
      case PRODUCTS.MONTHLY_VERIFIED:
        return PRODUCTS.MONTHLY_SUB;
      case PRODUCTS.YEARLY_VERIFIED:
        return PRODUCTS.YEARLY_SUB;
      default:
        return discountedProductId;
    }
  }

  /**
   * Calculate the original price for display purposes
   */
  private static getOriginalPrice(originalProductId: string, discountedPriceMicros: number): string {
    // Calculate original price (discounted price / 0.4 = original price)
    const originalPriceMicros = Math.round(discountedPriceMicros / 0.4);
    const originalPrice = originalPriceMicros / 1e6;
    
    // Format as currency (this is simplified - you might want to use the actual currency code)
    return originalPrice.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD'
    });
  }

  /**
   * Get user-friendly product display name
   */
  static getProductDisplayName(productId: string): string {
    if (productId === PRODUCTS.MONTHLY_SUB || productId === PRODUCTS.MONTHLY_VERIFIED) {
      return 'Monthly Plan';
    }
    if (productId === PRODUCTS.YEARLY_SUB || productId === PRODUCTS.YEARLY_VERIFIED) {
      return 'Annual Plan';
    }
    return 'Premium Plan';
  }

  /**
   * Get verification message for subscription modal
   */
  static async getVerificationMessage(): Promise<{
    icon: string;
    color: string;
    title: string;
    subtitle: string;
  } | null> {
    const { status, userType, trialDaysLeft } = await this.getVerificationStatus();
    
    if (status === 'verified') {
      return {
        icon: 'checkmark-circle',
        color: '#4CAF50',
        title: '60% Discount Active!',
        subtitle: `Verified ${userType} pricing applied`
      };
    }
    
    if (status === 'trial') {
      return {
        icon: 'time',
        color: '#FF9500',
        title: `${trialDaysLeft} Days Left!`,
        subtitle: 'Email flexbreakapp@gmail.com to keep discount'
      };
    }
    
    if (status === 'pending') {
      return {
        icon: 'time',
        color: '#FF9500',
        title: 'Verification Under Review',
        subtitle: 'You\'ll get 60% off when approved'
      };
    }
    
    // Show promotion for unverified users
    return {
      icon: 'gift',
      color: '#007AFF',
      title: 'Office Workers & Students',
      subtitle: 'Get 60% off with quick verification!'
    };
  }
}

export default DiscountPricingService;
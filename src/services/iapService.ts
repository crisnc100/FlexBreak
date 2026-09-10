import * as Store from 'expo-iap';
import { Platform } from 'react-native';
import { callBackend } from './security/backendClient';

export const PRODUCTS = {
  MONTHLY_SUB: 'flexbreak_monthly_4.99',
  YEARLY_SUB: 'flexbreak_yearly_44.99',
  MONTHLY_VERIFIED: 'flexbreak_monthly_verified',
  YEARLY_VERIFIED: 'flexbreak_yearly_verified',
} as const;

export interface SubscriptionDetails {
  verificationSource: 'server';
  productId: string;
  purchaseDate: string;
  expiryDate: string;
  isActive: boolean;
  autoRenewing: boolean;
  platform: 'ios' | 'android';
  purchaseToken: string;
}
type UpdateSubscription = (details: SubscriptionDetails) => void | Promise<void>;
type PurchaseResult = { success: boolean; responseCode?: string; error?: unknown; purchase?: Store.Purchase; subscriptionDetails?: SubscriptionDetails };
type VerifiedSubscription = Omit<SubscriptionDetails, 'purchaseDate' | 'verificationSource'> & { purchaseDate?: string };
const knownProduct = (id: string) => Object.values(PRODUCTS).some(product => product === id);
let initialization: Promise<boolean> | null = null;
let initialized = false;
let purchasing = false;
let connectionGeneration = 0;
let listeners: { remove(): void }[] = [];
const persistVerifiedSubscription: UpdateSubscription = async details => {
  const { saveSubscriptionDetails } = await import('./storageService');
  if (!await saveSubscriptionDetails(details)) throw new Error('Could not save verified subscription');
};
let updater: UpdateSubscription | null = persistVerifiedSubscription;
let pending: { productId: string; resolve: (result: PurchaseResult) => void; timer: ReturnType<typeof setTimeout> } | null = null;
const processing = new Map<string, Promise<PurchaseResult>>();
const completed = new Set<string>();

export const isSubscriptionActive = (details: SubscriptionDetails | null): boolean =>
  !!details && details.isActive === true && Number.isFinite(Date.parse(details.expiryDate)) && Date.parse(details.expiryDate) > Date.now();

async function verifyPurchase(purchase: Store.Purchase): Promise<SubscriptionDetails | null> {
  if (!knownProduct(purchase.productId) || purchase.purchaseState !== 'purchased') return null;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') throw new Error('Unsupported store platform');
  if (!purchase.purchaseToken) throw new Error('Store returned no verification token');
  const verified = await callBackend<VerifiedSubscription>('verify-purchase-v2', {
    platform: Platform.OS,
    productId: purchase.productId,
    purchaseToken: purchase.purchaseToken,
    transactionId: purchase.id,
  });
  if (!verified || !knownProduct(verified.productId) || verified.platform !== Platform.OS ||
      verified.purchaseToken !== purchase.purchaseToken || typeof verified.autoRenewing !== 'boolean' ||
      typeof verified.isActive !== 'boolean' || typeof verified.expiryDate !== 'string' ||
      !Number.isFinite(Date.parse(verified.expiryDate)) ||
      (verified.purchaseDate !== undefined && (typeof verified.purchaseDate !== 'string' || !Number.isFinite(Date.parse(verified.purchaseDate))))) {
    throw new Error('Purchase verification returned mismatched entitlement');
  }
  const details: SubscriptionDetails = {
    ...verified,
    verificationSource: 'server',
    purchaseDate: verified.purchaseDate ?? new Date(purchase.transactionDate).toISOString(),
  };
  // An expired/revoked transaction must never refresh premium from its purchase date.
  return isSubscriptionActive(details) ? details : null;
}

async function deliverPurchase(purchase: Store.Purchase, update: UpdateSubscription): Promise<PurchaseResult> {
  const key = `${purchase.productId}:${purchase.id}`;
  const generation = connectionGeneration;
  const existing = processing.get(key);
  if (existing) return existing;
  const task = (async (): Promise<PurchaseResult> => {
    try {
      const subscriptionDetails = await verifyPurchase(purchase);
      if (!subscriptionDetails) return { success: false, error: 'No active store subscription' };
      if (generation !== connectionGeneration) throw new Error('Store session changed during verification');
      await update(subscriptionDetails);
      // Subscriptions are non-consumable. Acknowledge only after verified entitlement
      // has been persisted successfully; rejected verification remains recoverable.
      if (!completed.has(key)) {
        await Store.finishTransaction({ purchase, isConsumable: false });
        completed.add(key);
      }
      return { success: true, purchase, subscriptionDetails };
    } catch (error) {
      return { success: false, error };
    }
  })();
  processing.set(key, task);
  try { return await task; } finally { processing.delete(key); }
}

function settle(result: PurchaseResult) {
  if (!pending) return;
  const current = pending;
  pending = null;
  clearTimeout(current.timer);
  current.resolve(result);
}

export async function initializeIAP(): Promise<boolean> {
  updater ||= persistVerifiedSubscription;
  if (initialized) return true;
  if (initialization) return initialization;
  initialization = (async () => {
    try {
      listeners = [
        Store.purchaseUpdatedListener(purchase => {
          // Pending/deferred transactions never grant access. Background updates use
          // the durable default callback until the provider installs its updater.
          if (!updater || purchase.purchaseState !== 'purchased' || !knownProduct(purchase.productId)) return;
          const update = updater;
          void deliverPurchase(purchase, update).then(result => {
            if (pending?.productId === purchase.productId) settle(result);
          });
        }),
        Store.purchaseErrorListener(error => settle({ success: false, error })),
      ];
      initialized = await Store.initConnection();
      if (!initialized) throw new Error('Store connection unavailable');
      return true;
    } catch (error) {
      listeners.forEach(listener => listener.remove());
      listeners = [];
      console.warn('Unable to connect to the store', error);
      return false;
    } finally {
      initialization = null;
    }
  })();
  return initialization;
}

export async function disconnectIAP(): Promise<void> {
  settle({ success: false, error: 'Store connection closed' });
  updater = null;
  connectionGeneration++;
  listeners.forEach(listener => listener.remove());
  listeners = [];
  initialized = false;
  initialization = null;
  await Store.endConnection();
}

export async function getProducts() {
  try {
    if (!await initializeIAP()) return [];
    const products = await Store.fetchProducts({ skus: Object.values(PRODUCTS), type: 'subs' });
    return (products ?? []).map(product => ({
      ...product,
      productId: product.id,
      price: product.displayPrice,
      priceAmountMicros: Math.round((product.price ?? 0) * 1_000_000),
      priceCurrencyCode: product.currency,
      title: product.title,
    }));
  } catch (error) {
    console.warn('Unable to load subscription products', error);
    return [];
  }
}

export const getProductsForUser = (verificationType?: 'office' | 'student' | null) =>
  verificationType === 'office' || verificationType === 'student'
    ? { monthly: PRODUCTS.MONTHLY_VERIFIED, yearly: PRODUCTS.YEARLY_VERIFIED }
    : { monthly: PRODUCTS.MONTHLY_SUB, yearly: PRODUCTS.YEARLY_SUB };

export async function purchaseSubscription(productId: string, updateSubscription: UpdateSubscription): Promise<PurchaseResult> {
  if (!knownProduct(productId)) return { success: false, error: 'Unknown subscription product' };
  if (purchasing) return { success: false, error: 'A purchase is already in progress' };
  purchasing = true;
  try {
    if (!await initializeIAP()) throw new Error('Store connection unavailable');
    const products = await Store.fetchProducts({ skus: [productId], type: 'subs' });
    const product = products?.find(item => item.id === productId);
    if (!product) throw new Error('Subscription unavailable in this store');
    const offers = 'subscriptionOffers' in product ? product.subscriptionOffers : null;
    const offer = offers?.find(item => !!item.offerTokenAndroid);
    if (Platform.OS === 'android' && !offer?.offerTokenAndroid) throw new Error('No eligible subscription offer');
    updater = updateSubscription;
    const result = new Promise<PurchaseResult>(resolve => {
      pending = { productId, resolve, timer: setTimeout(() => settle({ success: false, error: 'Store confirmation is pending. Use Restore Purchases after approval.' }), 120_000) };
    });
    // requestPurchase is event-based. Never interpret its return value as success,
    // and never retry a store purchase automatically after an ambiguous response.
    void Store.requestPurchase({
      type: 'subs',
      request: {
        apple: { sku: productId },
        google: { skus: [productId], subscriptionOffers: offer?.offerTokenAndroid ? [{ sku: productId, offerToken: offer.offerTokenAndroid }] : [] },
      },
    }).catch(error => settle({ success: false, error }));
    return await result;
  } catch (error) {
    return { success: false, error };
  } finally {
    purchasing = false;
  }
}

export async function restorePurchases(updateSubscription: UpdateSubscription) {
  try {
    updater = updateSubscription;
    if (!await initializeIAP()) throw new Error('Store connection unavailable');
    const purchases = await Store.getAvailablePurchases();
    let verificationError: unknown;
    for (const purchase of purchases.filter(item => knownProduct(item.productId) && item.purchaseState === 'purchased')
      .sort((a, b) => b.transactionDate - a.transactionDate)) {
      const result = await deliverPurchase(purchase, updateSubscription);
      if (result.success) return { ...result, hasPurchases: true };
      if (result.error !== 'No active store subscription') verificationError = result.error;
    }
    if (verificationError) return { success: false, hasPurchases: false, error: verificationError };
    return { success: true, hasPurchases: false };
  } catch (error) {
    return { success: false, hasPurchases: false, error };
  }
}

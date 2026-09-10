import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import { gamificationEvents } from '../hooks/progress/useGamification';
import { PREMIUM_STATUS_CHANGED } from '../hooks/progress/useFeatureAccess';
import * as rewardManager from '../utils/progress/modules/rewardManager';
import { refillMonthlyFlexSaves } from '../utils/progress/modules/flexSaveManager';
import * as storageService from '../services/storageService';
import AdService from '../services/adService';

const STORE_RECONCILE_KEY = '@flexbreak:store_reconcile';
const AUTOMATIC_RECONCILE_INTERVAL = 15 * 60 * 1000;
const FAILED_RECONCILE_BACKOFF = 60 * 1000;
type ReconcileAttempt = { attemptedAt: number; succeeded: boolean };

export type SubscriptionDetails = storageService.StoredSubscriptionDetails;
export type PremiumContextType = {
  isPremium: boolean;
  setPremiumStatus: (status: boolean) => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  subscriptionDetails: SubscriptionDetails | null;
  updateSubscription: (details: SubscriptionDetails) => Promise<void>;
  cancelSubscription: () => Promise<void>;
};
export const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const currentStatus = useRef<boolean | null>(null);
  const mounted = useRef(true);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconciling = useRef(false);
  const lastReconcile = useRef<ReconcileAttempt | null>(null);

  const refreshPremiumStatus = useCallback(async (): Promise<void> => {
    const snapshot = await storageService.getEntitlementSnapshot();
    if (!mounted.current) return;
    const previous = currentStatus.current;
    currentStatus.current = snapshot.isPremium;
    setIsPremium(snapshot.isPremium);
    setSubscriptionDetails(snapshot.subscriptionDetails);
    AdService.setPremiumStatus(snapshot.isPremium);
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = snapshot.nextExpiry ? setTimeout(() => {
      void refreshPremiumStatus().catch(error => console.warn('Could not refresh expiring premium access:', error));
    }, Math.min(2_147_483_647, Math.max(1, Date.parse(snapshot.nextExpiry) - Date.now() + 50))) : null;

    // Initial load synchronizes access without replaying an upgrade welcome.
    // Later changes notify every feature/theme consumer, including expiry.
    if (previous !== null && previous !== snapshot.isPremium) {
      gamificationEvents.emit(PREMIUM_STATUS_CHANGED);
      gamificationEvents.emit('SUBSCRIPTION_UPDATED');
      try {
        if (snapshot.isPremium) {
          const progress = await storageService.getUserProgress();
          await rewardManager.updateRewards(progress);
        }
        const { scheduleAIWellnessV2 } = await import('../services/ai/scheduling/notificationScheduler');
        await scheduleAIWellnessV2(snapshot.isPremium ? 'upgrade' : 'preference_change');
      } catch (error) {
        console.warn('Premium feature refresh could not complete:', error);
      }
    }
    if (snapshot.isPremium) {
      // Shared monthly rules preserve uses already consumed this month.
      await refillMonthlyFlexSaves();
    }
  }, []);

  const updateSubscription = useCallback(async (details: SubscriptionDetails): Promise<void> => {
    // Validation/persistence failure must reject the IAP callback so the store
    // transaction is not finished before its verified entitlement is durable.
    if (!await storageService.saveSubscriptionDetails(details)) throw new Error('Could not save verified subscription');
    await refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const reconcileStore = useCallback(async (explicit = false): Promise<void> => {
    if (reconciling.current) return;
    reconciling.current = true;
    try {
      if (!explicit) {
        if (!lastReconcile.current) {
          try {
            const raw = await AsyncStorage.getItem(STORE_RECONCILE_KEY);
            const cached = raw ? JSON.parse(raw) : null;
            if (cached && Number.isFinite(cached.attemptedAt) && typeof cached.succeeded === 'boolean') lastReconcile.current = cached;
          } catch (error) { console.warn('Could not read store reconciliation timing:', error); }
        }
        const previous = lastReconcile.current;
        if (previous) {
          const elapsed = Date.now() - previous.attemptedAt;
          const interval = previous.succeeded ? AUTOMATIC_RECONCILE_INTERVAL : FAILED_RECONCILE_BACKOFF;
          if (elapsed >= 0 && elapsed < interval) return;
        }
      }
      let succeeded = false;
      try {
      const { restorePurchases } = await import('../services/iapService');
      const result = await restorePurchases(updateSubscription);
      if (result.success && !result.hasPurchases) {
        await storageService.clearVerifiedPaidEntitlement();
        await refreshPremiumStatus();
      }
      succeeded = result.success;
      // No store/backend answer is not a revocation. Keep legacy-paid/cache.
      } finally {
        lastReconcile.current = { attemptedAt: Date.now(), succeeded };
        try { await AsyncStorage.setItem(STORE_RECONCILE_KEY, JSON.stringify(lastReconcile.current)); }
        catch (error) { console.warn('Could not persist store reconciliation timing:', error); }
      }
    } catch (error) {
      console.warn('Store reconciliation unavailable; retaining cached access:', error);
    } finally {
      reconciling.current = false;
    }
  }, [refreshPremiumStatus, updateSubscription]);

  const setPremiumStatus = useCallback(async (status: boolean): Promise<void> => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) await storageService.saveIsPremium(status);
    await refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  useEffect(() => {
    mounted.current = true;
    const timeout = setTimeout(() => { if (mounted.current) setIsInitialized(true); }, 2000);
    void refreshPremiumStatus().catch(error => console.warn('Unable to read premium settings:', error)).finally(() => {
      if (mounted.current) setIsInitialized(true);
      // Authentication/store networking never blocks application initialization.
      if (mounted.current) void reconcileStore();
    });
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void refreshPremiumStatus().catch(error => console.warn('Premium refresh unavailable:', error));
        void reconcileStore();
      }
    });
    return () => {
      mounted.current = false;
      clearTimeout(timeout);
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      listener.remove();
    };
  }, [refreshPremiumStatus, reconcileStore]);

  if (!isInitialized) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={{ marginTop: 10 }}>Loading app settings...</Text>
    </View>;
  }
  return <PremiumContext.Provider value={{ isPremium, setPremiumStatus, refreshPremiumStatus,
    subscriptionDetails, updateSubscription, cancelSubscription: () => reconcileStore(true) }}>
    {children}
  </PremiumContext.Provider>;
};

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (context === undefined) throw new Error('usePremium must be used within a PremiumProvider');
  return context;
};

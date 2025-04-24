// SubscriptionModal.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  FlatList,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Comment out IAP imports for now
/* 
import {
  getProducts,
  purchaseSubscription,
  restorePurchases,
  PRODUCTS
} from '../services/iapService';
*/

// Temporary mock for IAP service
const PRODUCTS = {
  MONTHLY_SUB: 'month_sub',
  YEARLY_SUB: 'year_sub'
};

import * as soundEffects from '../utils/soundEffects';
import * as storageService from '../services/storageService';
import CORE_REWARDS from '../data/rewards.json';

import { usePremium } from '../context/PremiumContext';
import { useFeatureAccess, PREMIUM_STATUS_CHANGED } from '../hooks/progress/useFeatureAccess';
import { useGamification } from '../hooks/progress/useGamification';
import { useTheme } from '../context/ThemeContext';
import { gamificationEvents } from '../hooks/progress/useGamification';

/* -------------------------------------------------- */
/* helpers                                            */
/* -------------------------------------------------- */

const BENEFITS = [
  'Track your progress',
  'Custom routines',
  'Dark mode',
  'XP Boost & streak protection',
  'Premium stretches'
];

const createInitialRewards = () =>
  Object.fromEntries(
    CORE_REWARDS.map(r => [
      r.id,
      {
        ...r,
        unlocked: false,
        ...(r.id === 'xp_boost' ? { initialUses: 2 } : {}),
        ...(r.id === 'streak_freezes' ? { initialUses: 1 } : {})
      }
    ])
  );

/* -------------------------------------------------- */
/* component                                          */
/* -------------------------------------------------- */

export default function SubscriptionModal({
  visible,
  onClose
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { subscriptionDetails, updateSubscription, setPremiumStatus, refreshPremiumStatus } =
    usePremium();
  const { refreshAccess } = useFeatureAccess();
  const { refreshData } = useGamification();
  const { refreshTheme } = useTheme();

  const [products, setProducts] = useState<any[]>([]);

  /* pull current App-Store prices on open */
  useEffect(() => {
    if (visible) {
      // Mock products for now
      setProducts([
        {
          productId: PRODUCTS.MONTHLY_SUB,
          title: 'Monthly Premium',
          price: '$4.99',
          priceAmountMicros: 4990000,
          priceCurrencyCode: 'USD'
        },
        {
          productId: PRODUCTS.YEARLY_SUB,
          title: 'Yearly Premium',
          price: '$39.99',
          priceAmountMicros: 39990000,
          priceCurrencyCode: 'USD'
        }
      ]);
      // Commented out for now
      // getProducts().then(setProducts).catch(console.warn);
    }
  }, [visible]);

  /* ------------------------------------ */
  /* business-logic wrappers              */
  /* ------------------------------------ */

  const unlockPremiumLocally = async () => {
    /* identical to your old handleSubscribe, minus the UI */
    const current = await storageService.getUserProgress();

    if (!current.rewards || Object.keys(current.rewards).length === 0) {
      await storageService.saveUserProgress({
        ...(current || storageService.INITIAL_STATE.USER_PROGRESS),
        rewards: createInitialRewards()
      });
    }

    if (current.level >= 2 && current.rewards?.dark_theme && !current.rewards.dark_theme.unlocked) {
      const updated = { ...current };
      updated.rewards.dark_theme.unlocked = true;
      await storageService.saveUserProgress(updated);
    }

    await setPremiumStatus(true);
    await soundEffects.playPremiumUnlockedSound().catch(() => {});
    gamificationEvents.emit(PREMIUM_STATUS_CHANGED);

    if (refreshPremiumStatus) await refreshPremiumStatus();
    refreshAccess?.();
    refreshData?.();
    refreshTheme?.();
  };

  const onBuy = async (pid: string) => {
    // Mock purchase for now
    alert('Purchases are disabled in this build.');
    /*
    const res = await purchaseSubscription(pid, updateSubscription);
    if (res.success) await unlockPremiumLocally();
    */
    
    // For testing
    await unlockPremiumLocally();
    onClose();
  };

  const onRestore = async () => {
    // Mock restore for now
    alert('Restore functionality is disabled in this build.');
    /*
    const res = await restorePurchases(updateSubscription);
    if (res.success && res.hasPurchases) await unlockPremiumLocally();
    if (!res.hasPurchases) alert('No previous purchases found.');
    */
    onClose();
  };

  /* ------------------------------------ */
  /* helpers for UI                       */
  /* ------------------------------------ */

  const monthly = products.find(p => p.productId === PRODUCTS.MONTHLY_SUB);
  const yearly = products.find(p => p.productId === PRODUCTS.YEARLY_SUB);
  const isCurrent = (pid: string) =>
    subscriptionDetails?.productId === pid && subscriptionDetails?.isActive;

  const discountLabel = () => {
    if (!monthly || !yearly) return 'Save 25 %';
    const m = monthly.priceAmountMicros / 1e6;
    const y = yearly.priceAmountMicros / 1e6;
    const pct = 100 - (y / 12 / m) * 100;
    return `Save ${Math.round(pct)} %`;
  };

  const Plan = ({ item, highlight }: { item: any; highlight?: boolean }) => (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={isCurrent(item.productId)}
      style={[
        styles.card,
        highlight && styles.cardHighlight,
        isCurrent(item.productId) && styles.cardDisabled
      ]}
      onPress={() => onBuy(item.productId)}
    >
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardPrice}>{item.price}</Text>

      {highlight && <Text style={styles.cardBadge}>{discountLabel()}</Text>}

      {item === yearly && monthly && (
        <Text style={styles.cardSub}>
          ≈{' '}
          {(item.priceAmountMicros / 12 / 1e6).toLocaleString(undefined, {
            style: 'currency',
            currency: item.priceCurrencyCode
          })}
          /mo
        </Text>
      )}

      {isCurrent(item.productId) && (
        <Text style={styles.cardCurrent}>Current plan</Text>
      )}
    </TouchableOpacity>
  );

  /* ------------------------------------ */
  /* render                               */
  /* ------------------------------------ */

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet}>
          {/* header */}
          <View style={styles.headerRow}>
            <Text style={styles.header}>Go Premium</Text>
            <Ionicons
              name="close"
              size={26}
              color="#555"
              onPress={onClose}
              accessibilityLabel="Close"
            />
          </View>

          {/* plans */}
          <FlatList
            horizontal
            data={[yearly, monthly].filter(Boolean)}
            keyExtractor={p => p.productId}
            renderItem={({ item }) => (
              <Plan item={item} highlight={item === yearly} />
            )}
            contentContainerStyle={{ gap: 14 }}
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: 18 }}
          />

          {/* benefits */}
          <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={styles.benefits}>
            {BENEFITS.map(b => (
              <View key={b} style={styles.row}>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={styles.benefit}>{b}</Text>
              </View>
            ))}
          </ScrollView>

          {/* restore */}
          <TouchableOpacity onPress={onRestore} style={{ marginTop: 18 }}>
            <Text style={styles.restore}>Restore purchase</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* -------------------------------------------------- */
/* styles                                             */
/* -------------------------------------------------- */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 16
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: '700', color: '#111' },

  /* plan card */
  card: {
    width: 170,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 16,
    alignItems: 'center'
  },
  cardHighlight: { borderColor: '#4CAF50' },
  cardDisabled: { opacity: 0.45 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardPrice: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  cardBadge: {
    marginTop: 4,
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  cardSub: { fontSize: 12, color: '#555', marginTop: 2 },
  cardCurrent: { marginTop: 6, fontSize: 12, color: '#4CAF50' },

  /* benefits */
  benefits: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefit: { fontSize: 14 },

  /* restore */
  restore: { fontSize: 13, color: '#666', textAlign: 'center' }
});

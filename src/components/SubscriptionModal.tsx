// SubscriptionModal.tsx  – real IAP version
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  SafeAreaView, FlatList, ScrollView, ActivityIndicator, AppState, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  initializeIAP,
  getProducts,
  purchaseSubscription,
  restorePurchases,
  PRODUCTS          // IDs: com.cristianortega.flexbreak.monthly / yearly
} from '../services/iapService';

import * as soundEffects from '../utils/soundEffects';
import * as storageService from '../services/storageService';
import CORE_REWARDS from '../data/rewards.json';

import { usePremium } from '../context/PremiumContext';
import { useFeatureAccess, PREMIUM_STATUS_CHANGED } from '../hooks/progress/useFeatureAccess';
import { useGamification } from '../hooks/progress/useGamification';
import { useTheme } from '../context/ThemeContext';
import { gamificationEvents } from '../hooks/progress/useGamification';

/* --- helpers (benefits + reward init) --- */
const BENEFITS = ['Track your progress','Custom routines','Dark mode',
  'XP Boost & streak protection','Premium stretches'];
const createInitialRewards = () =>
  Object.fromEntries(CORE_REWARDS.map(r=>[r.id,{
    ...r, unlocked:false,
    ...(r.id==='xp_boost'?{initialUses:2}:{})
  }]));

// Links to legal documents
const PRIVACY_POLICY_URL = "https://flexbreak-privacy-app.netlify.app/";
const TERMS_URL = "https://flexbreak-support-hub.com/";

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenVerification?: () => void;
}

/* --- component --- */
export default function SubscriptionModal({ 
  visible, 
  onClose, 
  onOpenVerification 
}: SubscriptionModalProps) {
  const {subscriptionDetails,updateSubscription,setPremiumStatus,refreshPremiumStatus}=usePremium();
  const {refreshAccess}=useFeatureAccess();
  const {refreshData}=useGamification();
  const {refreshTheme}=useTheme();

  const [products,setProducts]=useState<any[]|null>(null);
  const [busy,setBusy]=useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [showVerificationPromo, setShowVerificationPromo] = useState(false);

  /* Check verification status */
  useEffect(() => {
    if (!visible) return;
    
    const checkVerificationStatus = async () => {
      try {
        const status = await AsyncStorage.getItem('@flexbreak:verification_status');
        const type = await AsyncStorage.getItem('@flexbreak:user_type');
        const detectedType = await AsyncStorage.getItem('@flexbreak:detected_user_type');
        
        setVerificationStatus(status);
        setUserType(type || detectedType);
        
        // Show verification promo if not verified and not premium
        setShowVerificationPromo(!status || status === 'none');
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };
    
    checkVerificationStatus();
  }, [visible]);

  /* fetch live prices */
  useEffect(()=>{ if(!visible) return;
    (async()=>{
      setProducts(null);
      console.log('[SubscriptionModal] Fetching product information');
      try{
        if(await initializeIAP()){
          console.log('[SubscriptionModal] Successfully initialized IAP');
          const list=await getProducts();
          console.log(`[SubscriptionModal] Products retrieved: ${list.length}`);
          setProducts(list);
        }else {
          console.error('[SubscriptionModal] Failed to initialize IAP');
          setProducts([]);
        }
      }catch(e){
        console.error('[SubscriptionModal] Error loading products:',e);
        setProducts([]);
      }
    })();
  },[visible]);

  /* side-effects after unlock */
  const unlockPremiumLocally=async()=>{
    console.log('[SubscriptionModal] Unlocking premium features locally');
    try {
      const cur=await storageService.getUserProgress();
      if(!cur.rewards) {
        console.log('[SubscriptionModal] Creating initial rewards');
        await storageService.saveUserProgress({
          ...cur, rewards:createInitialRewards()
        });
      }
      await setPremiumStatus(true);
      await soundEffects.playPremiumUnlockedSound().catch(()=>{});
      gamificationEvents.emit(PREMIUM_STATUS_CHANGED);
      await refreshPremiumStatus?.(); refreshAccess?.(); refreshData?.(); refreshTheme?.();
      console.log('[SubscriptionModal] Premium unlock completed successfully');
    } catch (error) {
      console.error('[SubscriptionModal] Error during premium unlock:',error);
    }
  };

  const onBuy=async(pid:string)=>{
    setBusy(true);
    console.log(`[SubscriptionModal] Starting purchase for product ID: ${pid}`);
    
    // Track if we started a purchase
    let purchaseStarted = false;
    
    try {
      // Set up app state change listener to detect return from payment sheet
      const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
        console.log(`[SubscriptionModal] App state changed to: ${nextAppState}`);
        
        // Only proceed if we're returning to the foreground after starting a purchase
        if (purchaseStarted && nextAppState === 'active') {
          console.log('[SubscriptionModal] App returned to foreground after purchase attempt, checking purchases');
          
          // Remove the listener since we only need it once
          appStateSubscription.remove();
          
          // Check if the purchase was successful by checking purchase history
          try {
            const restoreResult = await restorePurchases(updateSubscription);
            console.log(`[SubscriptionModal] Purchase verification result:`, JSON.stringify(restoreResult, null, 2));
            
            if (restoreResult.success && restoreResult.hasPurchases) {
              console.log('[SubscriptionModal] Purchase verified successfully, unlocking premium features');
              await unlockPremiumLocally();
              setBusy(false);
              onClose();
              return;
            }
          } catch (verifyError) {
            console.error('[SubscriptionModal] Error verifying purchase:', verifyError);
          }
        }
      });
      
      // Mark that we're starting a purchase
      purchaseStarted = true;
      
      // Attempt the purchase
      const res = await purchaseSubscription(pid, updateSubscription);
      console.log(`[SubscriptionModal] Purchase result: ${JSON.stringify(res, null, 2)}`);
      
      // If the purchase was successful directly
      if (res.success) {
        console.log('[SubscriptionModal] Purchase successful, unlocking premium features');
        await unlockPremiumLocally();
        // Remove the listener since we succeeded directly
        appStateSubscription.remove();
      } else {
        console.error('[SubscriptionModal] Purchase failed:', res.error || res.responseCode);
        // Wait for the app state listener to potentially capture the successful purchase
        // If after 10 seconds we don't get a success, show an error
        setTimeout(() => {
          if (busy) {
            alert('Purchase failed or timed out. Please try again later.');
            setBusy(false);
            appStateSubscription.remove();
          }
        }, 10000);
      }
    } catch (error) {
      console.error('[SubscriptionModal] Purchase error:', error);
      alert('Purchase failed. Please try again later.');
      setBusy(false);
      onClose();
    }
  };

  const onRestore=async()=>{
    setBusy(true);
    console.log('[SubscriptionModal] Starting restore purchases flow');
    const res=await restorePurchases(updateSubscription);
    console.log(`[SubscriptionModal] Restore result: ${JSON.stringify(res, null, 2)}`);
    
    if(res.success&&res.hasPurchases) {
      console.log('[SubscriptionModal] Restore successful, unlocking premium features');
      await unlockPremiumLocally();
    } else {
      console.log('[SubscriptionModal] No previous purchases found or restore failed');
      alert('No previous purchases found.');
    }
    setBusy(false); onClose();
  };

  const monthly=products?.find(p=>p.productId===PRODUCTS.MONTHLY_SUB);
  const yearly =products?.find(p=>p.productId===PRODUCTS.YEARLY_SUB);
  const isCurrent=(pid:string)=>subscriptionDetails?.productId===pid&&subscriptionDetails?.isActive;
  const discount=()=>!monthly||!yearly?'Save 20 %':
      `Save ${Math.round(100-(yearly.priceAmountMicros/12)/(monthly.priceAmountMicros)*100)} %`;

  // Get readable display names based on product ID
  const getProductDisplayName = (productId: string) => {
    if (productId === PRODUCTS.MONTHLY_SUB) return "FlexBreak Monthly";
    if (productId === PRODUCTS.YEARLY_SUB) return "FlexBreak Yearly";
    return "Premium Subscription";
  };

  // Get pricing display based on verification status
  const getPricingDisplay = (product: any) => {
    if (verificationStatus === 'verified') {
      // Show discounted pricing for verified users
      const discountedPrice = product.priceAmountMicros * 0.4; // 60% off
      const formattedPrice = (discountedPrice / 1e6).toLocaleString(undefined, {
        style: 'currency',
        currency: product.priceCurrencyCode
      });
      return {
        price: formattedPrice,
        originalPrice: product.price,
        isDiscounted: true
      };
    }
    return {
      price: product.price,
      originalPrice: null,
      isDiscounted: false
    };
  };

  // Verification status messaging
  const getVerificationMessage = () => {
    if (verificationStatus === 'verified') {
      return {
        icon: 'checkmark-circle',
        color: '#4CAF50',
        title: '60% Discount Active!',
        subtitle: 'Your verification is approved'
      };
    }
    if (verificationStatus === 'pending') {
      return {
        icon: 'time',
        color: '#FF9500',
        title: 'Verification Under Review',
        subtitle: 'You\'ll get 60% off when approved'
      };
    }
    if (showVerificationPromo) {
      return {
        icon: 'gift',
        color: '#007AFF',
        title: 'Office Workers & Students',
        subtitle: 'Get 60% off with quick verification!'
      };
    }
    return null;
  };

  const Plan = ({item, highlight}: {item: any; highlight?: boolean}) => {
    const pricing = getPricingDisplay(item);
    const isYearly = item.productId === PRODUCTS.YEARLY_SUB;
    
    return (
      <TouchableOpacity 
        disabled={isCurrent(item.productId) || busy}
        style={[
          styles.planContainer,
          highlight && styles.planHighlight,
          isCurrent(item.productId) && styles.planDisabled
        ]}
        onPress={() => onBuy(item.productId)}
      >
        {isYearly && (
          <View style={styles.bestValueTag}>
            <Text style={styles.bestValueTagText}>BEST VALUE</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{getProductDisplayName(item.productId)}</Text>
          <View style={styles.priceBlock}>
            {pricing.isDiscounted && (
              <Text style={styles.originalPrice}>{pricing.originalPrice}</Text>
            )}
            <Text style={[styles.planPrice, pricing.isDiscounted && styles.discountedPrice]}>
              {pricing.price}
            </Text>
            {item === yearly && monthly && (
              <Text style={styles.perMonth}>
                ≈ {((pricing.isDiscounted ? item.priceAmountMicros * 0.4 : item.priceAmountMicros)/12/1e6).toLocaleString(undefined, {
                  style: 'currency',
                  currency: item.priceCurrencyCode
                })}/mo
              </Text>
            )}
          </View>
        </View>

        <View style={styles.planFeatures}>
          <View style={styles.featureRow}>
            <Ionicons name="gift" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>First 2 Months FREE</Text>
          </View>
          {pricing.isDiscounted && (
            <View style={styles.featureRow}>
              <Ionicons name="pricetag" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>60% Student & Office Worker Discount</Text>
            </View>
          )}
          <View style={styles.featureRow}>
            <Ionicons name="time" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>
              {isYearly ? 'Billed yearly after trial' : 'Billed monthly after trial'}
            </Text>
          </View>
        </View>

        {isCurrent(item.productId) && (
          <Text style={styles.currentPlan}>Current plan</Text>
        )}
      </TouchableOpacity>
    );
  };

  return(
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.header}>Go Premium</Text>
              <Text style={styles.headerSubtitle}>Unlock all features and stretches</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Wrap everything in a ScrollView */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
          

            {/* Verification Message */}
            {getVerificationMessage() && (
              <View style={styles.verificationMessage}>
                <Ionicons 
                  name={getVerificationMessage()!.icon as any} 
                  size={20} 
                  color={getVerificationMessage()!.color} 
                />
                <View style={styles.verificationText}>
                  <Text style={[styles.verificationTitle, { color: getVerificationMessage()!.color }]}>
                    {getVerificationMessage()!.title}
                  </Text>
                  <Text style={styles.verificationSubtitle}>
                    {getVerificationMessage()!.subtitle}
                  </Text>
                </View>
                {showVerificationPromo && onOpenVerification && (
                  <TouchableOpacity 
                    style={[styles.verifyButton, { borderColor: getVerificationMessage()!.color }]}
                    onPress={onOpenVerification}
                  >
                    <Text style={[styles.verifyButtonText, { color: getVerificationMessage()!.color }]}>
                      Verify
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {products === null ? (
              <ActivityIndicator size="large" style={{marginVertical: 40}}/>
            ) : products.length === 0 ? (
              <Text style={{marginVertical: 30, textAlign: 'center'}}>
                Unable to load prices.{"\n"}Is the device signed into the App Store?
              </Text>
            ) : (
              <>
                {/* Plans */}
                <View style={styles.plansContainer}>
                  {[yearly, monthly].filter(Boolean).map((item) => (
                    <Plan key={item.productId} item={item} highlight={item === yearly}/>
                  ))}
                </View>

                {/* Benefits */}
                <View style={styles.benefitsContainer}>
                  {BENEFITS.map(b => (
                    <View key={b} style={styles.row}>
                      <Ionicons name="checkmark-circle" size={18} color="#4CAF50"/>
                      <Text style={styles.benefit}>{b}</Text>
                    </View>
                  ))}
                </View>

                {/* Subscription Info */}
                <View style={styles.subscriptionInfo}>
                  <Text style={styles.subscriptionInfoTitle}>Subscription Information:</Text>
                  <Text style={styles.subscriptionInfoText}>
                    • Monthly subscription renews monthly
                  </Text>
                  <Text style={styles.subscriptionInfoText}>
                    • Yearly subscription renews yearly
                  </Text>
                  <Text style={styles.subscriptionInfoText}>
                    • Payment will be charged to your Apple ID account at confirmation of purchase
                  </Text>
                  <Text style={styles.subscriptionInfoText}>
                    • Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period
                  </Text>
                  <Text style={styles.subscriptionInfoText}>
                    • Account will be charged for renewal within 24 hours prior to the end of the current period
                  </Text>
                  <Text style={styles.subscriptionInfoText}>
                    • You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase
                  </Text>
                </View>

                {/* Legal Links */}
                <View style={styles.legalLinks}>
                  <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                    <Text style={styles.legalLink}>Privacy Policy</Text>
                  </TouchableOpacity>
                  <Text style={styles.legalText}> • </Text>
                  <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                    <Text style={styles.legalLink}>Terms of Use</Text>
                  </TouchableOpacity>
                </View>

                {/* Restore Purchase Button */}
                <TouchableOpacity onPress={onRestore} disabled={busy} style={styles.restoreButton}>
                  <Text style={styles.restore}>Restore purchase</Text>
                </TouchableOpacity>

                {/* Dev Mode Button */}
                {__DEV__ && (
                  <TouchableOpacity 
                    onPress={async () => {
                      console.log('[DEV MODE] Force unlocking premium features');
                      await unlockPremiumLocally();
                      onClose();
                    }} 
                    style={styles.devButton}>
                    <Text style={styles.devButtonText}>
                      DEV ONLY: Force Unlock Premium
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* ---- styles ---- */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '90%',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  card:{
    width: 150,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHighlight: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDisabled: { opacity: 0.5 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    color: '#111',
  },
  cardSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 14,
  },
  cardCurrent: {
    marginTop: 6,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  benefits:{gap:10,paddingBottom:16}, 
  row:{flexDirection:'row',alignItems:'center',gap:8}, 
  benefit:{fontSize:14,color:'#333'},
  restore:{fontSize:13,color:'#666',textAlign:'center'},
  // New subscription info styles
  subscriptionInfo: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 16,
  },
  subscriptionInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  subscriptionInfoText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  legalLinks: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalLink: {
    fontSize: 12,
    color: '#4CAF50',
    textDecorationLine: 'underline',
  },
  legalText: {
    fontSize: 12,
    color: '#666',
  },
  originalPrice: {
    fontSize: 12,
    color: '#555',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  discountedPrice: {
    color: '#4CAF50',
  },
  verificationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    marginBottom: 12,
  },
  verificationText: {
    flex: 1,
    marginLeft: 12,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  verifyButton: {
    padding: 8,
    borderWidth: 2,
    borderColor: '#d0d0d0',
    borderRadius: 4,
  },
  verifyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  freeBanner: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  freeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeBannerTextContainer: {
    marginLeft: 8,
  },
  freeBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  freeBannerSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 1,
  },
  freeMonthsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  freeMonthsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 1,
  },
  bestValueText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  plansContainer: {
    gap: 12,
    marginVertical: 16,
  },
  planContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16,
    position: 'relative',
  },
  planHighlight: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#F9FFF9',
  },
  planDisabled: {
    opacity: 0.5,
  },
  bestValueTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bestValueTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  planHeader: {
    marginBottom: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  priceBlock: {
    marginTop: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  perMonth: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  planFeatures: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#444',
    flex: 1,
  },
  currentPlan: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
  },
  benefitsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  restoreButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  devButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffcc00',
    borderRadius: 4,
    marginBottom: 8,
  },
  devButtonText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
});

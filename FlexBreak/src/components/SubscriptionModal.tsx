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

  const Plan=({item,highlight}:{item:any;highlight?:boolean})=>{
    const pricing = getPricingDisplay(item);
    return (
      <TouchableOpacity disabled={isCurrent(item.productId)||busy}
        style={[styles.card,highlight&&styles.cardHighlight,isCurrent(item.productId)&&styles.cardDisabled]}
        onPress={()=>onBuy(item.productId)}>
        <Text style={styles.cardTitle}>{getProductDisplayName(item.productId)}</Text>
        
        {pricing.isDiscounted && (
          <Text style={styles.originalPrice}>{pricing.originalPrice}</Text>
        )}
        <Text style={[styles.cardPrice, pricing.isDiscounted && styles.discountedPrice]}>
          {pricing.price}
        </Text>
        
        {pricing.isDiscounted && (
          <Text style={styles.discountBadge}>60% OFF</Text>
        )}
        {highlight && !pricing.isDiscounted && (
          <Text style={styles.cardBadge}>{discount()}</Text>
        )}
        
        {/* 2 Months Free Badge */}
        <Text style={styles.freeMonthsBadge}>+ 2 months free</Text>
        
        {item===yearly&&monthly&&(
          <Text style={styles.cardSub}>
            ≈ {((pricing.isDiscounted ? item.priceAmountMicros * 0.4 : item.priceAmountMicros)/12/1e6).toLocaleString(undefined,{
                style:'currency',currency:item.priceCurrencyCode})}/mo
          </Text>)}
        {isCurrent(item.productId)&&<Text style={styles.cardCurrent}>Current plan</Text>}
      </TouchableOpacity>
    );
  };

  return(
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.header}>Go Premium</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#555" />
            </TouchableOpacity>
          </View>

          {/* 2 Months Free Banner */}
          <View style={styles.freeBanner}>
            <Ionicons name="gift" size={20} color="#fff" />
            <Text style={styles.freeBannerText}>First 2 Months FREE - Cancel Anytime</Text>
          </View>

          {/* Verification Status Message */}
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

          {products===null ? (
            <ActivityIndicator size="large" style={{marginVertical:40}}/>
          ) : products.length===0 ? (
            <Text style={{marginVertical:30,textAlign:'center'}}>
              Unable to load prices.{"\n"}Is the device signed into the App Store?
            </Text>
          ) : (
            <>
              <FlatList horizontal data={[yearly,monthly].filter(Boolean)}
                keyExtractor={p=>p.productId}
                renderItem={({item})=><Plan item={item!} highlight={item===yearly}/>}
                contentContainerStyle={{gap:14}} showsHorizontalScrollIndicator={false}
                style={{marginVertical:18}}/>
              <ScrollView style={{maxHeight:220}} contentContainerStyle={styles.benefits}>
                {BENEFITS.map(b=>(
                  <View key={b} style={styles.row}>
                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50"/>
                    <Text style={styles.benefit}>{b}</Text>
                  </View>))}

                {/* Subscription Info - Required by App Store */}
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
                  <View style={styles.legalLinks}>
                    <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                      <Text style={styles.legalLink}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <Text style={styles.legalText}> • </Text>
                    <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                      <Text style={styles.legalLink}>Terms of Use</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
              <TouchableOpacity onPress={onRestore} disabled={busy} style={{marginTop:18}}>
                <Text style={styles.restore}>Restore purchase</Text>
              </TouchableOpacity>

              {/* Development-only override (REMOVE IN PRODUCTION) */}
              {__DEV__ && (
                <TouchableOpacity 
                  onPress={async () => {
                    console.log('[DEV MODE] Force unlocking premium features');
                    await unlockPremiumLocally();
                    onClose();
                  }} 
                  style={{marginTop:10, padding:8, backgroundColor:'#ffcc00', borderRadius:4}}>
                  <Text style={{fontSize:12, textAlign:'center', color:'#333'}}>
                    DEV ONLY: Force Unlock Premium
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>);
}

/* ---- styles (reuse from mock) ---- */
const styles = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.55)',justifyContent:'center',padding:16, zIndex:9999},
  sheet:{backgroundColor:'#fff',borderRadius:18,padding:24},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  header:{fontSize:28,fontWeight:'700',color:'#111'},
  card:{width:170,padding:18,borderWidth:1,borderColor:'#d0d0d0',borderRadius:16,alignItems:'center'},
  cardHighlight:{borderColor:'#4CAF50'}, cardDisabled:{opacity:0.45},
  cardTitle:{fontSize:15,fontWeight:'600'}, cardPrice:{fontSize:22,fontWeight:'700',marginTop:2},
  cardBadge:{marginTop:4,fontSize:12,color:'#fff',backgroundColor:'#4CAF50',
             paddingHorizontal:6,paddingVertical:2,borderRadius:6},
  cardSub:{fontSize:12,color:'#555',marginTop:2},
  cardCurrent:{marginTop:6,fontSize:12,color:'#4CAF50'},
  benefits:{gap:12}, row:{flexDirection:'row',alignItems:'center',gap:6}, benefit:{fontSize:14},
  restore:{fontSize:13,color:'#666',textAlign:'center'},
  // New subscription info styles
  subscriptionInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  },
  discountedPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4CAF50',
  },
  discountBadge: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
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
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  freeMonthsBadge: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
});

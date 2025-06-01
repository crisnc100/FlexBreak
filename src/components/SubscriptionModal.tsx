// SubscriptionModal.tsx  – real IAP version
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  SafeAreaView, FlatList, ScrollView, ActivityIndicator, AppState, Linking, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  initializeIAP,
  getProducts,
  purchaseSubscription,
  restorePurchases,
  PRODUCTS,          // IDs: com.cristianortega.flexbreak.monthly / yearly
  getProductsForUser
} from '../services/iapService';

import * as soundEffects from '../utils/soundEffects';
import * as storageService from '../services/storageService';
import CORE_REWARDS from '../data/rewards.json';

import { usePremium } from '../context/PremiumContext';
import { useFeatureAccess, PREMIUM_STATUS_CHANGED } from '../hooks/progress/useFeatureAccess';
import { useGamification } from '../hooks/progress/useGamification';
import { useTheme } from '../context/ThemeContext';
import { gamificationEvents } from '../hooks/progress/useGamification';
import { EmailVerificationService } from '../services/emailVerificationService';
import { PreGeneratedCodes } from '../services/preGeneratedCodes';

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
  const {subscriptionDetails,updateSubscription,setPremiumStatus,refreshPremiumStatus,isPremium}=usePremium();
  const {refreshAccess}=useFeatureAccess();
  const {refreshData}=useGamification();
  const {refreshTheme}=useTheme();

  const [products,setProducts]=useState<any[]|null>(null);
  const [busy,setBusy]=useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [showVerificationPromo, setShowVerificationPromo] = useState(false);
  
  // Verification flow state
  const [currentView, setCurrentView] = useState<'subscription' | 'verification'>('subscription');
  const [verificationStep, setVerificationStep] = useState<'type' | 'email' | 'confirm' | 'email_verification' | 'manual_code'>('type');
  const [email, setEmail] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        // TEMPORARY: Force show for testing
        const shouldShowPromo = true; // (!status || status === 'none') && !isPremium;
        setShowVerificationPromo(shouldShowPromo);
        
        console.log('[SubscriptionModal] Verification check:', {
          status,
          userType: type || detectedType,
          isPremium,
          showVerificationPromo: shouldShowPromo,
          onOpenVerification: !!onOpenVerification
        });
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };
    
    checkVerificationStatus();
  }, [visible, onOpenVerification, isPremium]);

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
  },[visible, verificationStatus]);

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

  // Get the correct product IDs based on verification status
  const productIds = verificationStatus === 'verified' 
    ? getProductsForUser(userType as 'office' | 'student')
    : getProductsForUser(null);
  
  const monthly=products?.find(p=>p.productId===productIds.monthly);
  const yearly =products?.find(p=>p.productId===productIds.yearly);
  const isCurrent=(pid:string)=>subscriptionDetails?.productId===pid&&subscriptionDetails?.isActive;
  const discount=()=>!monthly||!yearly?'Save 20 %':
      `Save ${Math.round(100-(yearly.priceAmountMicros/12)/(monthly.priceAmountMicros)*100)} %`;
  
  // Verification functions
  const handleUserTypeSelect = (type: 'student' | 'office') => {
    setUserType(type);
    setVerificationStep('email');
  };

  const handleEmailSubmit = () => {
    if (!email.trim()) {
      Alert.alert('Please enter your email');
      return;
    }
    setVerificationStep('confirm');
  };
  
  const handleVerificationComplete = async (approved: boolean) => {
    if (approved) {
      // Update verification status
      await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
      // Refresh premium status to apply discount
      await refreshPremiumStatus();
      // Return to subscription view
      setCurrentView('subscription');
      setVerificationStep('type');
      setEmail('');
      setEmailVerificationCode('');
      setManualCode('');
    }
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        setIsSubmitting(false);
        return;
      }

      // Check if email is already used by another verification
      const existingUsers = await AsyncStorage.getItem('@flexbreak:verified_emails');
      const usedEmails: string[] = existingUsers ? JSON.parse(existingUsers) : [];
      
      if (usedEmails.includes(email.toLowerCase())) {
        Alert.alert(
          '⚠️ Email Already Used',
          'This email has already been verified by another user. Each email can only be used once.\n\nIf this is your email and you\'re having issues, contact:\nflexbreakapp@gmail.com',
          [{ text: 'OK', onPress: () => setIsSubmitting(false) }]
        );
        return;
      }

      // SMART VERIFICATION LOGIC
      const restrictedDomains = ['gmail.com', 'yahoo.com', 'icloud.com', 'aol.com'];
      const businessPersonalDomains = ['outlook.com', 'hotmail.com']; // Outlook can be business
      const isRestrictedEmail = restrictedDomains.includes(domain);
      const isBusinessPersonal = businessPersonalDomains.includes(domain);
      
      // AUTO-APPROVE: Business/School domains
      const autoApprovePatterns = [
        /\.edu$/,           // Universities (.edu)
        /\.ac\./,           // Academic institutions (.ac.uk, etc.)
        /\.org$/,           // Organizations
        /university/i,      // University in domain
        /college/i,         // College in domain
        /school/i,          // School in domain
      ];
      
      const shouldAutoApprove = autoApprovePatterns.some(pattern => 
        pattern.test(domain)
      ) || (!isRestrictedEmail && !isBusinessPersonal && domain.length > 8); // Business domains are usually longer
      
      if (shouldAutoApprove || isBusinessPersonal) {
        // AUTO-APPROVE: Clear business/school email
        // Add email to used list
        usedEmails.push(email.toLowerCase());
        await AsyncStorage.setItem('@flexbreak:verified_emails', JSON.stringify(usedEmails));
        
        await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
        await AsyncStorage.setItem('@flexbreak:user_type', userType!);
        await AsyncStorage.setItem('@flexbreak:user_email', email);
        await AsyncStorage.setItem('@flexbreak:verification_method', 'auto_approved');
        
        const message = userType === 'student' 
          ? '🎓 Student verification successful! 60% discount activated.'
          : '💼 Office worker verification successful! 60% discount activated.';
        
        Alert.alert('✅ Verified!', message, [
          { text: 'Great!', onPress: () => handleVerificationComplete(true) }
        ]);
        
      } else {
        // Manual verification required
        Alert.alert(
          '📧 Manual Verification Required',
          `Personal email addresses require manual verification.\n\nTo get your discount:\n\n1. Email: flexbreakapp@gmail.com\n2. Include your ${userType === 'student' ? 'school details' : 'work details'}\n3. You'll receive a verification code within 24 hours`,
          [
            { text: 'Got it', onPress: () => {
              setCurrentView('subscription');
              setVerificationStep('type');
            }}
          ]
        );
      }
      
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get readable display names based on product ID
  const getProductDisplayName = (productId: string) => {
    if (productId === PRODUCTS.MONTHLY_SUB || productId === PRODUCTS.MONTHLY_VERIFIED) 
      return "FlexBreak Monthly";
    if (productId === PRODUCTS.YEARLY_SUB || productId === PRODUCTS.YEARLY_VERIFIED) 
      return "FlexBreak Yearly";
    return "Premium Subscription";
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
    const isYearly = item.productId === productIds.yearly;
    const isVerified = verificationStatus === 'verified';
    
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
            <Text style={[styles.planPrice, isVerified && styles.discountedPrice]}>
              {item.price}
            </Text>
            {item === yearly && monthly && (
              <Text style={styles.perMonth}>
                ≈ {(item.priceAmountMicros/12/1e6).toLocaleString(undefined, {
                  style: 'currency',
                  currency: item.priceCurrencyCode,
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
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
          {isVerified && (
            <View style={styles.featureRow}>
              <Ionicons name="pricetag" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>60% Student & Office Worker Discount Applied!</Text>
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
  
  // Render verification view
  const renderVerificationView = () => {
    switch (verificationStep) {
      case 'type':
        return (
          <View style={styles.verificationContainer}>
            <View style={styles.verificationHeader}>
              <Ionicons name="gift" size={48} color="#4CAF50" />
              <Text style={styles.verificationStepTitle}>Get 60% Off Premium!</Text>
              <Text style={styles.verificationStepSubtitle}>Quick verification for students & office workers</Text>
            </View>

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => handleUserTypeSelect('student')}
            >
              <Ionicons name="school" size={24} color="#2196F3" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>I'm a Student</Text>
                <Text style={styles.optionDesc}>Currently enrolled in education</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => handleUserTypeSelect('office')}
            >
              <Ionicons name="business" size={24} color="#FF9500" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>I'm an Office Worker</Text>
                <Text style={styles.optionDesc}>Work in office or hybrid</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#666" />
            </TouchableOpacity>
            
            {/* Back to Subscription Button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setCurrentView('subscription')}
            >
              <Ionicons name="arrow-back" size={18} color="#666" />
              <Text style={styles.backButtonText}>Back to Subscription</Text>
            </TouchableOpacity>
          </View>
        );

      case 'email':
        return (
          <View style={styles.verificationContainer}>
            <Text style={styles.verificationStepTitle}>
              {userType === 'student' ? '🎓 Student Email' : '💼 Work Email'}
            </Text>
            <Text style={styles.verificationStepSubtitle}>
              {userType === 'student' 
                ? 'Enter your school email address'
                : 'Enter your work email address'
              }
            </Text>

            <TextInput
              style={styles.emailInput}
              placeholder={userType === 'student' ? 'you@university.edu' : 'you@company.com'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity 
              style={[styles.continueButton, !email.trim() && styles.disabledButton]}
              onPress={handleEmailSubmit}
              disabled={!email.trim()}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setVerificationStep('type')}
            >
              <Ionicons name="arrow-back" size={18} color="#666" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        );

      case 'confirm':
        return (
          <View style={styles.verificationContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.verificationStepTitle}>Almost Done!</Text>
            <Text style={styles.verificationStepSubtitle}>
              Confirm you're eligible for the {userType} discount
            </Text>

            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                ✓ I am a {userType === 'student' ? 'current student' : 'office/hybrid worker'}
              </Text>
              <Text style={styles.confirmText}>
                ✓ I understand this discount is for {userType === 'student' ? 'students' : 'office workers'}
              </Text>
              <Text style={styles.confirmSubtext}>
                By continuing, you confirm your eligibility for this special pricing.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleFinalConfirm}
              disabled={isSubmitting}
            >
              <Text style={styles.confirmButtonText}>
                {isSubmitting ? 'Verifying...' : 'Activate 60% Discount'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setVerificationStep('email')}
            >
              <Ionicons name="arrow-back" size={18} color="#666" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return(
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.header}>
                {currentView === 'subscription' ? 'Go Premium' : 'Verify for 60% Off'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {currentView === 'subscription' ? 'Unlock all features and stretches' : 'Students & office workers discount'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => {
              // Reset to subscription view when closing
              setCurrentView('subscription');
              setVerificationStep('type');
              setEmail('');
              onClose();
            }} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Wrap everything in a ScrollView */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {currentView === 'verification' ? (
              renderVerificationView()
            ) : (
              <>
          

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
                {showVerificationPromo && (
                  <TouchableOpacity 
                    style={[styles.verifyButton, { borderColor: getVerificationMessage()!.color }]}
                    onPress={() => {
                      console.log('[SubscriptionModal] Verify button pressed, showing verification view');
                      setCurrentView('verification');
                    }}
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
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  verificationText: {
    flex: 1,
    marginLeft: 12,
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  verificationSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  verifyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderRadius: 8,
    marginLeft: 12,
  },
  verifyButtonText: {
    fontSize: 13,
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
  // Verification styles
  verificationContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  verificationHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  verificationStepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginTop: 12,
    textAlign: 'center',
  },
  verificationStepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  optionDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  emailInput: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  confirmBox: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  confirmText: {
    fontSize: 16,
    color: '#111',
    marginBottom: 8,
  },
  confirmSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

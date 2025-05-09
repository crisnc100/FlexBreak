import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePremium } from './PremiumContext';

interface PremiumPromotionContextProps {
  showPromotionModal: boolean;
  setShowPromotionModal: (show: boolean) => void;
  source: string;
  setSource: (source: string) => void;
  showPromotion: (source: string) => void;
  hidePromotion: () => void;
  canShowPromotion: boolean;
  resetPromotionTimers: () => void;
  getPromotionCount: () => Promise<number>;
  showPromotionWithDelay: (source: string, delayMs: number) => void;
  getLastPromotionTime: () => Promise<number>;
}

const PremiumPromotionContext = createContext<PremiumPromotionContextProps>({
  showPromotionModal: false,
  setShowPromotionModal: () => {},
  source: '',
  setSource: () => {},
  showPromotion: () => {},
  hidePromotion: () => {},
  canShowPromotion: false,
  resetPromotionTimers: () => {},
  getPromotionCount: async () => 0,
  showPromotionWithDelay: () => {},
  getLastPromotionTime: async () => 0,
});

// Storage keys
const LAST_PROMOTION_SHOWN_KEY = 'last_premium_promotion_shown';
const PROMOTION_HIDE_COUNT_KEY = 'premium_promotion_hide_count';
const PROMOTION_DAILY_COUNT_KEY = 'premium_promotion_daily_count';
const PROMOTION_DAILY_RESET_KEY = 'premium_promotion_daily_reset';

// Timing constants (in milliseconds)
const ONE_DAY = 24 * 60 * 60 * 1000;
const THREE_DAYS = 3 * ONE_DAY;
const SEVEN_DAYS = 7 * ONE_DAY;

// Maximum promotions per day
const MAX_DAILY_PROMOTIONS = 2;
const MIN_PROMOTION_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours between promotions

export const PremiumPromotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [source, setSource] = useState('app');
  const [lastShownTime, setLastShownTime] = useState<number>(0);
  const [hideCount, setHideCount] = useState<number>(0);
  const [canShowPromotion, setCanShowPromotion] = useState<boolean>(false);
  const [dailyPromotionCount, setDailyPromotionCount] = useState<number>(0);
  const [dailyResetTime, setDailyResetTime] = useState<number>(0);
  const { isPremium } = usePremium();

  // Load stored values on component mount
  useEffect(() => {
    const loadStoredValues = async () => {
      try {
        const lastShownTimeStr = await AsyncStorage.getItem(LAST_PROMOTION_SHOWN_KEY);
        const hideCountStr = await AsyncStorage.getItem(PROMOTION_HIDE_COUNT_KEY);
        const dailyCountStr = await AsyncStorage.getItem(PROMOTION_DAILY_COUNT_KEY);
        const dailyResetStr = await AsyncStorage.getItem(PROMOTION_DAILY_RESET_KEY);
        
        if (lastShownTimeStr) {
          setLastShownTime(parseInt(lastShownTimeStr));
        }
        
        if (hideCountStr) {
          setHideCount(parseInt(hideCountStr));
        }
        
        if (dailyCountStr) {
          setDailyPromotionCount(parseInt(dailyCountStr));
        }
        
        if (dailyResetStr) {
          setDailyResetTime(parseInt(dailyResetStr));
        } else {
          // Initialize daily reset time to next day if not set
          const now = Date.now();
          const tomorrow = now + ONE_DAY;
          const nextMidnight = new Date(tomorrow);
          nextMidnight.setHours(0, 0, 0, 0);
          
          setDailyResetTime(nextMidnight.getTime());
          await AsyncStorage.setItem(PROMOTION_DAILY_RESET_KEY, nextMidnight.getTime().toString());
        }
        
        // Reset daily count if past reset time
        if (Date.now() > dailyResetTime) {
          await resetDailyCount();
        }
      } catch (error) {
        console.error('Error loading promotion data:', error);
      }
    };
    
    loadStoredValues();
  }, []);

  // Reset the daily promotion count
  const resetDailyCount = async () => {
    // Set the next reset time to the next midnight
    const now = Date.now();
    const tomorrow = now + ONE_DAY;
    const nextMidnight = new Date(tomorrow);
    nextMidnight.setHours(0, 0, 0, 0);
    
    setDailyPromotionCount(0);
    setDailyResetTime(nextMidnight.getTime());
    
    await AsyncStorage.setItem(PROMOTION_DAILY_COUNT_KEY, '0');
    await AsyncStorage.setItem(PROMOTION_DAILY_RESET_KEY, nextMidnight.getTime().toString());
  };

  // Update canShowPromotion state whenever relevant states change
  useEffect(() => {
    if (isPremium) {
      setCanShowPromotion(false);
      return;
    }
    
    const now = Date.now();
    let minTimeBetweenPromotions = MIN_PROMOTION_INTERVAL;
    
    // Increase delay based on how many times user has dismissed the promotion
    if (hideCount >= 10) {
      minTimeBetweenPromotions = SEVEN_DAYS;
    } else if (hideCount >= 5) {
      minTimeBetweenPromotions = THREE_DAYS;
    }
    
    // Check if we've exceeded daily promotion count
    const belowDailyLimit = dailyPromotionCount < MAX_DAILY_PROMOTIONS;
    
    // Check if enough time has passed since last promotion
    const enoughTimePassed = now - lastShownTime >= minTimeBetweenPromotions;
    
    // Reset daily count if past reset time
    if (now > dailyResetTime) {
      resetDailyCount();
    }
    
    const canShow = belowDailyLimit && enoughTimePassed;
    setCanShowPromotion(canShow);
  }, [lastShownTime, hideCount, isPremium, dailyPromotionCount, dailyResetTime]);

  const getPromotionCount = async (): Promise<number> => {
    const countStr = await AsyncStorage.getItem(PROMOTION_DAILY_COUNT_KEY);
    return countStr ? parseInt(countStr) : 0;
  };

  const getLastPromotionTime = async (): Promise<number> => {
    const timeStr = await AsyncStorage.getItem(LAST_PROMOTION_SHOWN_KEY);
    return timeStr ? parseInt(timeStr) : 0;
  };

  const showPromotion = (promotionSource: string) => {
    if (isPremium || !canShowPromotion) return;
    
    setSource(promotionSource);
    setShowPromotionModal(true);
    
    // Update last shown time
    const now = Date.now();
    setLastShownTime(now);
    AsyncStorage.setItem(LAST_PROMOTION_SHOWN_KEY, now.toString());
    
    // Update daily promotion count
    const newCount = dailyPromotionCount + 1;
    setDailyPromotionCount(newCount);
    AsyncStorage.setItem(PROMOTION_DAILY_COUNT_KEY, newCount.toString());
  };

  const showPromotionWithDelay = (promotionSource: string, delayMs: number) => {
    if (isPremium || !canShowPromotion) return;
    
    setTimeout(() => {
      // Re-check can show promotion in case something changed during the delay
      if (!isPremium && canShowPromotion) {
        showPromotion(promotionSource);
      }
    }, delayMs);
  };

  const hidePromotion = async () => {
    setShowPromotionModal(false);
    
    // Update hide count
    const newHideCount = hideCount + 1;
    setHideCount(newHideCount);
    await AsyncStorage.setItem(PROMOTION_HIDE_COUNT_KEY, newHideCount.toString());
  };

  const resetPromotionTimers = async () => {
    setLastShownTime(0);
    setHideCount(0);
    setDailyPromotionCount(0);
    await AsyncStorage.removeItem(LAST_PROMOTION_SHOWN_KEY);
    await AsyncStorage.removeItem(PROMOTION_HIDE_COUNT_KEY);
    await AsyncStorage.removeItem(PROMOTION_DAILY_COUNT_KEY);
    setCanShowPromotion(true);
  };

  return (
    <PremiumPromotionContext.Provider
      value={{
        showPromotionModal,
        setShowPromotionModal,
        source,
        setSource,
        showPromotion,
        hidePromotion,
        canShowPromotion,
        resetPromotionTimers,
        getPromotionCount,
        showPromotionWithDelay,
        getLastPromotionTime,
      }}
    >
      {children}
    </PremiumPromotionContext.Provider>
  );
};

export const usePremiumPromotion = () => useContext(PremiumPromotionContext); 
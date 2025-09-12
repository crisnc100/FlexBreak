import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { usePremium } from '../../context/PremiumContext';
import AdService from '../../services/adService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

interface BannerAdComponentProps {
  position?: 'top' | 'bottom';
  showPremiumPrompt?: boolean;
  onOpenSubscription?: () => void;
}

const DynamicBannerAd: React.FC<{
  bannerRef: any;
  unitId: string;
  onAdFailedToLoad: (error: Error) => void;
}> = ({ bannerRef, unitId, onAdFailedToLoad }) => {
  const [BannerAdComponent, setBannerAdComponent] = useState<any>(null);
  const [BannerAdSize, setBannerAdSize] = useState<any>(null);

  useEffect(() => {
    import('react-native-google-mobile-ads')
      .then(({ BannerAd, BannerAdSize }) => {
        setBannerAdComponent(() => BannerAd);
        setBannerAdSize(BannerAdSize);
      })
      .catch((error) => {
        console.error('Failed to load BannerAd module:', error);
        onAdFailedToLoad(error);
      });
  }, []);

  if (!BannerAdComponent || !BannerAdSize) {
    return null;
  }

  return (
    <BannerAdComponent
      ref={bannerRef}
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{
        requestNonPersonalizedAdsOnly: true,
        keywords: ['fitness', 'health', 'wellness', 'exercise'],
      }}
      onAdFailedToLoad={onAdFailedToLoad}
      onAdLoaded={() => console.log('BannerAd: Ad loaded successfully')}
      onAdOpened={() => console.log('BannerAd: Ad opened')}
      onAdClosed={() => console.log('BannerAd: Ad closed')}
    />
  );
};

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ 
  position = 'bottom',
  showPremiumPrompt = true,
  onOpenSubscription
}) => {
  const { isPremium } = usePremium();
  const [adError, setAdError] = useState(false);
  const [shouldShowAd, setShouldShowAd] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const bannerRef = useRef<any>(null);

  // Handle app state changes to pause/resume ads
  useEffect(() => {
    // Small initial delay to avoid competing with audio setup on first mount
    const readyTimer = setTimeout(() => setIsReady(true), 1000);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background - hide ad to prevent background audio
        console.log('BannerAd: App going to background, hiding ad');
        setShouldShowAd(false);
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App is coming to foreground - show ad again
        console.log('BannerAd: App coming to foreground, showing ad');
        setShouldShowAd(true);
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      clearTimeout(readyTimer);
    };
  }, []);

  // Hide ad when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('BannerAd: Screen focused, showing ad');
      setShouldShowAd(true);
      
      return () => {
        console.log('BannerAd: Screen unfocused, hiding ad');
        setShouldShowAd(false);
      };
    }, [])
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      console.log('BannerAd: Component unmounting, cleaning up');
      setShouldShowAd(false);
    };
  }, []);

  if (isPremium) {
    return null;
  }
  
  // Skip rendering banner ad entirely if ads module is not available (e.g., Expo Go)
  if (!AdService.isAvailable()) {
    return null;
  }

  const handleAdError = (error: Error) => {
    console.error('Banner ad error:', error);
    setAdError(true);
  };

  return (
    <View style={[styles.container, position === 'top' ? styles.top : styles.bottom]}>
      {showPremiumPrompt && (
        <TouchableOpacity 
          style={styles.premiumPrompt} 
          onPress={onOpenSubscription}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={16} color="#666" />
          <Text style={styles.premiumText}>Remove ads • Go Premium</Text>
          <Ionicons name="sparkles" size={16} color="#4A90E2" />
        </TouchableOpacity>
      )}
      
      {!adError && shouldShowAd && isReady ? (
        <DynamicBannerAd 
          bannerRef={bannerRef}
          unitId={AdService.getBannerAdUnitId()}
          onAdFailedToLoad={handleAdError}
        />
      ) : !adError ? null : (
        <View style={styles.fallback}>
          <TouchableOpacity 
            style={styles.fallbackButton}
            onPress={onOpenSubscription}
            activeOpacity={0.8}
          >
            <Text style={styles.fallbackText}>🚀 Enjoy ad-free experience</Text>
            <Text style={styles.fallbackSubtext}>Upgrade to Premium</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  top: {
    top: 0,
    paddingTop: 50, // Account for status bar
  },
  bottom: {
    bottom: 0,
  },
  premiumPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 8,
  },
  premiumText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  fallback: {
    padding: 10,
    alignItems: 'center',
  },
  fallbackButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  fallbackText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fallbackSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
});

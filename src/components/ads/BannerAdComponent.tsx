import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { usePremium } from '../../context/PremiumContext';
import AdService from '../../services/adService';
import { Ionicons } from '@expo/vector-icons';

interface BannerAdComponentProps {
  position?: 'top' | 'bottom';
  showPremiumPrompt?: boolean;
  onOpenSubscription?: () => void;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ 
  position = 'bottom',
  showPremiumPrompt = true,
  onOpenSubscription
}) => {
  const { isPremium } = usePremium();
  const [adError, setAdError] = React.useState(false);

  if (isPremium) {
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
      
      {!adError ? (
        <BannerAd
          unitId={AdService.getBannerAdUnitId()}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdFailedToLoad={handleAdError}
        />
      ) : (
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
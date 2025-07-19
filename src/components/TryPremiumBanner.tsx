import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { diffInMs, MS_PER_DAY } from '../utils/progress/modules/utils/dateUtils';

interface TryPremiumBannerProps {
  onPress: () => void;
  onDismiss?: () => void;
  context?: 'home' | 'completion';
}

export const TryPremiumBanner: React.FC<TryPremiumBannerProps> = ({
  onPress,
  onDismiss,
  context = 'home'
}) => {
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkBannerVisibility();
  }, [isPremium, context]);

  const checkBannerVisibility = async () => {
    try {
      // Don't show if already premium
      if (isPremium) {
        setIsVisible(false);
        return;
      }

      // Check if user has dismissed this specific banner within the last 3 days
      const dismissKey = `@flexbreak:try_premium_banner_dismissed_${context}`;
      const dismissedTimestamp = await AsyncStorage.getItem(dismissKey);
      
      if (dismissedTimestamp) {
        const timeSinceDismissal = diffInMs(new Date(), new Date(dismissedTimestamp));
        if (timeSinceDismissal < MS_PER_DAY * 3) { // 3 days instead of 1 for less aggressive
          setIsVisible(false);
          return;
        }
      }

      // Check if they've already seen a free trial offer
      const hasSeenFreeTrial = await AsyncStorage.getItem('@flexbreak:has_seen_free_trial');
      if (hasSeenFreeTrial) {
        // Still show but less frequently for users who've seen it
        const showChance = Math.random();
        if (showChance < 0.3) { // 30% chance to show if they've seen it before
          setIsVisible(true);
        }
      } else {
        // Always show for new users
        setIsVisible(true);
        await AsyncStorage.setItem('@flexbreak:has_seen_free_trial', 'true');
      }
    } catch (error) {
      console.error('Error checking try premium banner visibility:', error);
    }
  };
  
  useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const handleDismiss = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(async () => {
      setIsVisible(false);
      // Store current timestamp when banner is dismissed
      const dismissKey = `@flexbreak:try_premium_banner_dismissed_${context}`;
      await AsyncStorage.setItem(dismissKey, new Date().toISOString());
      onDismiss?.();
    });
  };

  const getBannerContent = () => {
    if (context === 'completion') {
      return {
        mainText: 'Great job! Try Premium free up to 1 month',
        subText: 'Unlock custom routines, advanced analytics & more',
        ctaText: 'Start free trial',
        icon: 'trophy' as const,
        gradient: ['#10b981', '#059669', '#047857'] // Success green
      };
    }
    
    // Home context
    return {
      mainText: 'Try Premium free up to 1 month',
      subText: 'Custom routines, smart reminders & analytics',
      ctaText: 'Start free trial',
      icon: 'star' as const,
      gradient: ['#22c55e', '#16a34a', '#166534'] // Green
    };
  };

  if (!isVisible) return null;

  const content = getBannerContent();

  return (
    <Animated.View style={[styles.container, { 
      opacity: fadeAnim,
      transform: [{
        translateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 0]
        })
      }]
    }]}>
      <TouchableOpacity
        style={styles.banner}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={content.gradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.gradient}
        >
          <View style={styles.bannerContent}>
            <View style={styles.iconContainer}>
              <Ionicons name={content.icon} size={22} color="#fff" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.mainText}>
                {content.mainText}
              </Text>
              <Text style={styles.subText}>
                {content.subText}
              </Text>
              <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>{content.ctaText}</Text>
                <Ionicons name="arrow-forward-circle" size={16} color="#fff" />
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color="#fff" style={{ opacity: 0.8 }} />
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
    lineHeight: 16,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctaText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dismissButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});

export default TryPremiumBanner; 
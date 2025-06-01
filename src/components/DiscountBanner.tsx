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

interface DiscountBannerProps {
  onPress: () => void;
  onDismiss?: () => void;
}

export const DiscountBanner: React.FC<DiscountBannerProps> = ({
  onPress,
  onDismiss
}) => {
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const [isVisible, setIsVisible] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkBannerVisibility();
  }, [isPremium]);

  const checkBannerVisibility = async () => {
    try {
      // Don't show if already premium
      if (isPremium) {
        setIsVisible(false);
        return;
      }

      // Check if user has dismissed the banner within the last 24 hours
      const dismissedTimestamp = await AsyncStorage.getItem('@flexbreak:discount_banner_dismissed_timestamp');
      
      if (dismissedTimestamp) {
        const timeSinceDismissal = diffInMs(new Date(), new Date(dismissedTimestamp));
        if (timeSinceDismissal < MS_PER_DAY) {
          setIsVisible(false);
          return;
        }
      }

      // Check verification status
      const verificationStatus = await AsyncStorage.getItem('@flexbreak:verification_status');
      const userType = await AsyncStorage.getItem('@flexbreak:user_type');

      // Show appropriate message based on status
      if (verificationStatus === 'verified') {
        setBannerText('🎉 Your 60% discount is ready! Upgrade now');
        setIsVisible(true);
      } else if (verificationStatus === 'pending') {
        setBannerText('⏳ Verification pending - 60% discount coming soon');
        setIsVisible(true);
      } else {
        // Try to detect user type from email or show general promotion
        const detectedType = await detectUserType();
        if (detectedType) {
          setBannerText(`${detectedType === 'office' ? '💼' : '🎓'} ${detectedType === 'office' ? 'Office worker' : 'Student'}? Get 60% off premium features!`);
          setIsVisible(true);
        } else {
          setBannerText('💼 Office worker or student? Get 60% off!');
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Error checking banner visibility:', error);
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

  const detectUserType = async (): Promise<'office' | 'student' | null> => {
    try {
      // Check if user has a stored email that might indicate their type
      const userEmail = await AsyncStorage.getItem('@flexbreak:user_email');
      if (userEmail) {
        // Educational domains
        if (userEmail.includes('.edu') || userEmail.includes('.ac.')) {
          await AsyncStorage.setItem('@flexbreak:detected_user_type', 'student');
          return 'student';
        }
        
        // Common corporate domains
        const corporateDomains = ['microsoft.com', 'google.com', 'apple.com', 'amazon.com', 'meta.com'];
        const domain = userEmail.split('@')[1]?.toLowerCase();
        if (domain && corporateDomains.includes(domain)) {
          await AsyncStorage.setItem('@flexbreak:detected_user_type', 'office');
          return 'office';
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleDismiss = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(async () => {
      setIsVisible(false);
      // Store current timestamp when banner is dismissed
      await AsyncStorage.setItem('@flexbreak:discount_banner_dismissed_timestamp', new Date().toISOString());
      onDismiss?.();
    });
  };

  if (!isVisible) return null;

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
          colors={['#2563eb', '#3b82f6', '#60a5fa']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.gradient}
        >
          <View style={styles.bannerContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="flash" size={22} color="#fff" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.mainText}>
                {bannerText}
              </Text>
              <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>Tap to verify</Text>
                <Ionicons name="chevron-forward-circle" size={16} color="#fff" />
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
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
    marginBottom: 4,
    lineHeight: 21,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

export default DiscountBanner; 
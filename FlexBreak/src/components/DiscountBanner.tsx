import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';

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
  const fadeAnim = new Animated.Value(0);

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

      // Check if user has dismissed the banner
      const dismissed = await AsyncStorage.getItem('@flexbreak:discount_banner_dismissed');
      if (dismissed === 'true') {
        setIsVisible(false);
        return;
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
          setBannerText(`${detectedType === 'office' ? '💼' : '🎓'} ${detectedType === 'office' ? 'Office worker' : 'Student'}? Get 60% off Premium!`);
          setIsVisible(true);
        } else {
          setBannerText('💼🎓 Office worker or student? Get 60% off Premium!');
          setIsVisible(true);
        }
      }

      if (isVisible) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('Error checking banner visibility:', error);
    }
  };

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
    }).start(() => {
      setIsVisible(false);
      AsyncStorage.setItem('@flexbreak:discount_banner_dismissed', 'true');
      onDismiss?.();
    });
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={[styles.banner, { backgroundColor: theme.accent }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <Text style={[styles.text, { color: '#fff' }]}>
            {bannerText}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </View>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default DiscountBanner; 
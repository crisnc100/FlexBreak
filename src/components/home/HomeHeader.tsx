import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated, TouchableWithoutFeedback, Platform, Easing } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { KEYS } from '../../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface HomeHeaderProps {
  title?: string;
  subtitle?: string;
}

/**
 * Enhanced header component for the home screen with modern styling
 * Shows "Pro" badge only for premium users
 */
const HomeHeader: React.FC<HomeHeaderProps> = ({
  title = 'FlexBreak',
  subtitle = 'Stretch. Relax. Work Better.'
}) => {
  const { theme, isDark } = useTheme();
  const { isPremium } = usePremium();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowOpacity = useRef(new Animated.Value(0)).current;
  const shadowRadius = useRef(new Animated.Value(0)).current;
  const [animationInProgress, setAnimationInProgress] = useState(false);
  const [aiWellnessEnabled, setAiWellnessEnabled] = useState(false);
  
  // Check if AI wellness is enabled
  useEffect(() => {
    const checkAiWellness = async () => {
      const enabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
      console.log('[HomeHeader] AI Wellness enabled:', enabled);
      setAiWellnessEnabled(enabled === 'true');
    };
    checkAiWellness();
  }, []);
  
  // Check if it's Wednesday for free users
  const isWednesday = new Date().getDay() === 3;
  const canAccessFlexChat = aiWellnessEnabled && (isPremium || isWednesday);
  console.log('[HomeHeader] Can access FlexChat:', canAccessFlexChat, { aiWellnessEnabled, isPremium, isWednesday });
  
  // Subtle breathing animation for glow
  useEffect(() => {
    if (canAccessFlexChat) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shadowOpacity, {
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(shadowOpacity, {
            toValue: 0.2,
            duration: 1500,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    } else {
      shadowOpacity.setValue(0);
      shadowRadius.setValue(0);
    }
  }, [canAccessFlexChat]);

  const handleLogoPress = () => {
    if (animationInProgress) return;
    
    // Check if we should open FlexChat
    if (canAccessFlexChat && (global as any).openFlexChat) {
      // Special haptic feedback for FlexChat
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      setAnimationInProgress(true);
      
      // Simple bounce animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start(() => {
        setAnimationInProgress(false);
        // Open FlexChat after animation
        (global as any).openFlexChat();
      });
    } else {
      // Normal bounce animation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      setAnimationInProgress(true);
      
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 30,
          useNativeDriver: true,
        })
      ]).start(() => {
        setAnimationInProgress(false);
      });
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <TouchableWithoutFeedback onPress={handleLogoPress}>
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <Image 
              source={require('../../../assets/images/potentialLogo2.png')} 
              style={styles.logoImage}
            />
            {/* Simple animated border */}
            {canAccessFlexChat && (
              <Animated.View 
                style={[
                  styles.animatedBorder,
                  {
                    borderColor: '#4CAF50',
                    opacity: shadowOpacity,
                  }
                ]}
              />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>
            {title}
            {isPremium && <Text style={styles.highlight}> Pro</Text>}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
          {/* Show availability info for free users */}
          {aiWellnessEnabled && !isPremium && (
            <Text style={[styles.availabilityText, { color: theme.textSecondary }]}>
              {isWednesday ? '✨ AI Coach available today!' : ''}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  animatedBorder: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 19,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    borderRadius: 12,
    backgroundColor: 'transparent'
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  highlight: {
    color: '#4CAF50',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  availabilityText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  }
});

export default HomeHeader; 
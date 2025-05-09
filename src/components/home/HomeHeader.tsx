import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
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
  const [animationInProgress, setAnimationInProgress] = useState(false);
  
  const handleLogoPress = () => {
    if (animationInProgress) return;
    
    // Provide subtle haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setAnimationInProgress(true);
    
    // Simple, elegant animation sequence
    Animated.sequence([
      // Scale down slightly
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      
      // Bounce back slightly larger
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      
      // Settle back to normal size
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 30,
        useNativeDriver: true,
      })
    ]).start(() => {
      setAnimationInProgress(false);
    });
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
  }
});

export default HomeHeader; 
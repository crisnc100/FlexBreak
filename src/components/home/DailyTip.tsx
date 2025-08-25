import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { tw } from '../../utils/tw';
import { LinearGradient } from 'expo-linear-gradient';

interface DailyTipProps {
  tip: string;
  iconName?: string;
  iconColor?: string;
}

/**
 * Daily tip component that displays a random tip with an icon and animation
 */
const DailyTip: React.FC<DailyTipProps> = ({
  tip,
  iconName = 'bulb-outline',
  iconColor = '#FF9800'
}) => {
  const { theme, isDark, isSunset } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Check if this is a quote (has quotation marks and author)
  const isQuote = tip.includes('"') && tip.includes(' - ');
  
  // Create rotate interpolation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg']
  });
  
  // Run animations when component mounts or when quote changes
  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: isQuote ? 1.08 : 1.05,
          duration: isQuote ? 1200 : 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: isQuote ? 1200 : 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
    
    // Subtle rotation animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
    
    // Glow animation for quotes
    if (isQuote) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    }
  }, [pulseAnim, rotateAnim, glowAnim, isQuote]);
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ scale: pulseAnim }] }
      ]}
    >
      <LinearGradient
        colors={
          isQuote ? 
            // Special gradient for quotes
            isDark ?
              ['rgba(74, 144, 226, 0.2)', 'rgba(255, 215, 0, 0.15)'] :
              ['rgba(74, 144, 226, 0.1)', 'rgba(255, 215, 0, 0.1)'] :
            // Regular gradient for tips
            isDark ? 
              [theme.backgroundLight, 'rgba(255,152,0,0.1)'] : 
              isSunset ?
                ['rgba(50, 30, 64, 0.6)', 'rgba(255, 140, 90, 0.2)'] :
                ['#f8f9fa', '#fff3e0']
        }
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.gradient, isQuote && styles.quoteGradient]}
      >
        <View style={[
          styles.iconContainer,
          { 
            backgroundColor: 
              isQuote ?
                'rgba(255, 215, 0, 0.2)' : // Golden background for quotes
                isDark ? 
                  'rgba(255, 152, 0, 0.2)' : 
                  isSunset ? 
                    'rgba(255, 140, 90, 0.3)' : 
                    'rgba(255, 152, 0, 0.15)' 
          }
        ]}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons 
              name={isSunset ? "flame" : (iconName as any)} 
              size={24} 
              color={
                isDark ? 
                  iconColor : 
                  isSunset ? 
                    '#FF8C5A' : 
                    '#FF8F00'
              } 
            />
          </Animated.View>
        </View>
        <View style={styles.textContainer}>
          <Text style={[
            styles.tipText, 
            { color: theme.text },
            isQuote && styles.quoteText
          ]}>
            {isQuote ? '✨ Daily Motivation' : ''}
          </Text>
          <Text style={[
            isQuote ? styles.motivationalText : styles.regularTipText,
            { color: isQuote ? theme.textSecondary : theme.text }
          ]}>
            {tip}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden'
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  textContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginRight: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteText: {
    fontSize: 12,
  },
  regularTipText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500'
  },
  motivationalText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    fontWeight: '500',
    marginTop: 4,
  },
  quoteGradient: {
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  }
});

export default DailyTip; 
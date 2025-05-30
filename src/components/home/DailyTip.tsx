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
  
  // Create rotate interpolation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg']
  });
  
  // Run animations when component mounts
  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
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
  }, [pulseAnim, rotateAnim]);
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ scale: pulseAnim }] }
      ]}
    >
      <LinearGradient
        colors={
          isDark ? 
            [theme.backgroundLight, 'rgba(255,152,0,0.1)'] : 
            isSunset ?
              ['rgba(50, 30, 64, 0.6)', 'rgba(255, 140, 90, 0.2)'] :
              ['#f8f9fa', '#fff3e0']
        }
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.gradient}
      >
        <View style={[
          styles.iconContainer,
          { 
            backgroundColor: 
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
        <Text style={[styles.tipText, { color: theme.text }]}>
          {tip}
        </Text>
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
  tipText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500'
  }
});

export default DailyTip; 
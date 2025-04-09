import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface DeskBreakBoostProps {
  onPress: () => void;
  isAvailable: boolean;
  requiredLevel: number;
  userLevel: number;
  isPremium: boolean;
}

/**
 * A component that displays the Desk Break Boost button on the home screen
 * This feature allows users to do quick desk stretches
 */
const DeskBreakBoost: React.FC<DeskBreakBoostProps> = ({
  onPress,
  isAvailable,
  requiredLevel,
  userLevel,
  isPremium
}) => {
  const { theme, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Create a pulsing animation for the active button
  useEffect(() => {
    if (isAvailable) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ).start();
    }
  }, [isAvailable, pulseAnim]);
  
  // If user isn't premium, don't show this component at all
  if (!isPremium) {
    return null;
  }
  
  // If feature is not available, show locked version with improved UI
  if (!isAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
        <LinearGradient
          colors={isDark ? 
            ['#455A64', '#37474F'] : 
            ['#ECEFF1', '#CFD8DC']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[styles.gradient, styles.lockedGradient]}
        >
          <View style={styles.lockedContent}>
            <View style={styles.iconTextRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="desktop-outline" size={22} color={isDark ? '#90A4AE' : '#78909C'} />
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
                </View>
              </View>
              
              <View style={styles.textContainer}>
                <Text style={[styles.buttonText, { color: isDark ? '#CFD8DC' : '#546E7A', fontSize: 16 }]}>
                  Desk Break Boost
                </Text>
                <Text style={[styles.description, { color: isDark ? '#90A4AE' : '#78909C', fontSize: 12 }]}>
                  Fast stretches to recharge the grind!
                </Text>
              </View>
            </View>
            
            <View style={styles.levelInfoContainer}>
              <Text style={[styles.levelText, { color: theme.textSecondary }]}>
                Unlocks at Level {requiredLevel}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }
  
  // Feature is available, show active button
  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: theme.cardBackground }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isDark ? 
            ['#2E7D32', '#0D47A1'] : 
            ['#4CAF50', '#2196F3']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.gradient}
        >
          <View style={styles.button}>
            <View style={styles.iconContainer}>
              <Ionicons name="desktop-outline" size={24} color="#fff" />
              <Ionicons name="flash" size={14} color="#fff" style={styles.flashIcon} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.buttonText, { fontSize: 16 }]}>Desk Break Boost</Text>
              <Text style={[styles.description, { fontSize: 12 }]}>Fast stretches to recharge the grind!</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 14,
    marginHorizontal: 2,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  gradient: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  lockedGradient: {
    opacity: 0.9,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedContent: {
    padding: 14,
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#9E9E9E',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  flashIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  levelInfoContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  levelText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  }
});

export default DeskBreakBoost; 
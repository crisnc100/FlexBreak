import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import existing routine stats component to reuse
import RoutineStats from '../tabs/RoutineStats';

interface SummaryTransitionProps {
  area: string;
  duration: string;
  routineLength: number;
  xpEarned?: number;       // Add XP earned prop
  hasXpBoost?: boolean;    // Add XP boost prop
  theme: any;
  onTransitionComplete: () => void;
}

export const SummaryTransition: React.FC<SummaryTransitionProps> = ({
  area,
  duration,
  routineLength,
  xpEarned = 0,           // Default to 0 if not provided
  hasXpBoost = false,     // Default to false if not provided
  theme,
  onTransitionComplete
}) => {
  // Animation values
  const headerFadeIn = useRef(new Animated.Value(0)).current;
  const headerSlideIn = useRef(new Animated.Value(-30)).current;
  const statsSlideIn = useRef(new Animated.Value(50)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const xpSlideIn = useRef(new Animated.Value(30)).current;      // Add XP animation
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const motivationFadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startSummarySequence();
  }, []);

  const startSummarySequence = () => {
    // Step 1: Header slides in from top
    Animated.parallel([
      Animated.timing(headerFadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlideIn, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();

    // Step 2: Stats slide up from bottom
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(statsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(statsSlideIn, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    }, 200);

    // Step 3: XP summary slides in (if XP earned)
    if (xpEarned > 0) {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(xpOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(xpSlideIn, {
            toValue: 0,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
          })
        ]).start();
      }, 400);
    }

    // Step 4: Motivational message fades in
    setTimeout(() => {
      Animated.timing(motivationFadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onTransitionComplete();
      });
    }, xpEarned > 0 ? 800 : 600);  // Adjust timing based on XP display
  };

  const getMotivationalMessage = () => {
    const messages = [
      "Outstanding work! 💪",
      "You're building healthy habits! 🌟",
      "Consistency is key - keep it up! 🔥",
      "Your body thanks you! 🙏",
      "Progress over perfection! ✨",
      "Keep the grind! 🏆",
      "Movement is medicine! 🏃‍♂️",
      "Accomplish your goals! 🎯",
      "Every stretch counts! 🤸‍♂️",
      "You're one step closer to your goals! 🚀",
      "Stay flexible, stay strong! 🧘‍♂️",
      "Great things come from small efforts! 🪴",
      "Keep moving forward! ➡️",
      "Stretch today, succeed tomorrow! 🌅",
      "You crushed it! 👏",
      "Discipline brings results! 🥇",
      "Your future self thanks you! 🙌",
      "Keep pushing your limits! 🏋️‍♂️",
      "Small wins add up! 📈",
      "You're unstoppable! 🦾"
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <Animated.View 
        style={[
          styles.headerContainer,
          {
            opacity: headerFadeIn,
            transform: [{ translateY: headerSlideIn }]
          }
        ]}
      >
        <View style={[styles.headerIcon, { backgroundColor: theme.success + '20' }]}>
          <Ionicons name="analytics" size={24} color={theme.success} />
        </View>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Session Summary
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Here's how you did
        </Text>
      </Animated.View>

      {/* Routine Stats - reuse existing component */}
      <Animated.View
        style={[
          styles.statsContainer,
          {
            opacity: statsOpacity,
            transform: [{ translateY: statsSlideIn }]
          }
        ]}
      >
        <RoutineStats
          area={area}
          duration={duration}
          numStretches={routineLength}
          showAnyLevelUp={false}
          theme={theme}
        />
      </Animated.View>

      {/* XP Summary Card - highlight XP earned */}
      {xpEarned > 0 && (
        <Animated.View
          style={[
            styles.xpSummaryContainer,
            {
              opacity: xpOpacity,
              transform: [{ translateY: xpSlideIn }]
            }
          ]}
        >
          <View style={[
            styles.xpSummaryCard, 
            { 
              backgroundColor: theme.cardBackground,
              borderColor: hasXpBoost ? theme.accent : 'transparent',
              borderWidth: hasXpBoost ? 2 : 0,
            }
          ]}>
            {/* Double boost glow effect */}
            {hasXpBoost && (
              <View style={[
                styles.boostGlow,
                { backgroundColor: theme.accent + '15' }
              ]} />
            )}
            
            {/* Double boost badge */}
            {hasXpBoost && (
              <View style={[
                styles.doubleBoostBadge,
                { backgroundColor: theme.accent }
              ]}>
                <Text style={[styles.doubleBoostText, { color: theme.background }]}>
                  2X
                </Text>
              </View>
            )}
            
            <View style={styles.xpSummaryHeader}>
              <View style={[
                styles.xpIcon, 
                { 
                  backgroundColor: hasXpBoost ? theme.accent + '30' : theme.accent + '20',
                  transform: hasXpBoost ? [{ scale: 1.1 }] : [{ scale: 1 }]
                }
              ]}>
                <Ionicons 
                  name={hasXpBoost ? "flash" : "flash-outline"} 
                  size={20} 
                  color={theme.accent} 
                />
              </View>
              <View style={styles.xpTextContainer}>
                <Text style={[styles.xpEarnedLabel, { color: theme.textSecondary }]}>
                  {hasXpBoost ? "Total XP Earned (Boosted!)" : "Total XP Earned"}
                </Text>
                <View style={styles.xpValueContainer}>
                  <Text style={[
                    styles.xpEarnedValue, 
                    { 
                      color: theme.accent,
                      textShadowColor: hasXpBoost ? theme.accent + '40' : 'transparent',
                      textShadowOffset: hasXpBoost ? { width: 0, height: 1 } : { width: 0, height: 0 },
                      textShadowRadius: hasXpBoost ? 3 : 0,
                    }
                  ]}>
                    +{xpEarned} XP
                  </Text>
                  {hasXpBoost && (
                    <Text style={[styles.boostIndicator, { color: theme.accent }]}>
                      ⚡⚡
                    </Text>
                  )}
                </View>
                {hasXpBoost && (
                  <Text style={[styles.boostSubtext, { color: theme.accent }]}>
                    Double XP Boost Applied!
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Motivational Message */}
      <Animated.View
        style={[
          styles.motivationContainer,
          { opacity: motivationFadeIn }
        ]}
      >
        <View style={[styles.motivationCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.motivationText, { color: theme.text }]}>
            {getMotivationalMessage()}
          </Text>
          <Text style={[styles.motivationSubtext, { color: theme.textSecondary }]}>
            Ready for your next challenge?
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  statsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  motivationContainer: {
    width: '100%',
    marginBottom: 40,
  },
  motivationCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  motivationText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  motivationSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  xpSummaryContainer: {
    width: '100%',
    marginBottom: 32,
  },
  xpSummaryCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xpSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  xpTextContainer: {
    alignItems: 'center',
  },
  xpEarnedLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  xpEarnedValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  xpValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boostGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  doubleBoostBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  doubleBoostText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  boostIndicator: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  boostSubtext: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
}); 
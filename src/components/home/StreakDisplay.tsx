import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Vibration,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as storageService from '../../services/storageService';
import * as featureAccessUtils from '../../utils/featureAccessUtils';
import * as haptics from '../../utils/haptics';
import { useStreak } from '../../hooks/progress/useStreak';

// Helper function for consistent haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
  try {
    // Use our custom haptics utility which handles cross-device compatibility
    switch (type) {
      case 'light':
        haptics.light();
        break;
      case 'medium':
        haptics.medium();
        break;
      case 'heavy':
        haptics.heavy();
        break;
      case 'success':
        haptics.success();
        break;
      case 'warning':
        haptics.warning();
        break;
      case 'error':
        haptics.error();
        break;
    }
  } catch (error) {
    // Fallback to basic vibration if haptics fail
    Vibration.vibrate(15);
  }
};

interface StreakDisplayProps {
  currentStreak: number;
  onPremiumPress?: () => void;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({ 
  currentStreak = 0,
  onPremiumPress
}) => {
  const { theme, isDark, isSunset } = useTheme();
  const { isPremium } = usePremium();
  const [streak, setStreak] = useState(currentStreak);
  const [freezeCount, setFreezeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [canUseStreakFreeze, setCanUseStreakFreeze] = useState(false);
  const [focusedMilestone, setFocusedMilestone] = useState<number | null>(null);
  const [progressPulse, setProgressPulse] = useState(false);
  const [isStreakBroken, setIsStreakBroken] = useState(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const tapAnimations = useRef<{ [key: number]: Animated.Value }>({}).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Start animations
  useEffect(() => {
    // Pulsing animation for the flame
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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
    
    // Simplified glow animation with better performance
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
    
    // Simple one-time progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false // Keep false as we animate width
    }).start();
  }, []);
  
  // Simplified progress animation without pulsing
  const startProgressAnimation = () => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false // Keep false as we animate width
    }).start();
  };
  
  // Handle milestone tap - simplify animation for better performance
  const handleMilestoneTap = (milestone: number, isCompleted: boolean, isCurrent: boolean) => {
    // Don't animate if tapping on an already focused milestone
    if (focusedMilestone === milestone) {
      setFocusedMilestone(null);
      triggerHaptic('light');
      return;
    }
    
    setFocusedMilestone(milestone);
    
    // Create animation for this milestone if it doesn't exist yet
    if (!tapAnimations[milestone]) {
      tapAnimations[milestone] = new Animated.Value(1);
    }
    
    // Enhanced haptic feedback based on milestone status
    if (isCompleted) {
      triggerHaptic('success');
    } else if (isCurrent) {
      triggerHaptic('medium');
    } else {
      triggerHaptic('light');
    }
    
    // Simple scale animation
    Animated.timing(tapAnimations[milestone], {
      toValue: 1.3,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      Animated.timing(tapAnimations[milestone], {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }).start();
    });
    
    // If this is the current goal, also animate the progress bar
    if (isCurrent) {
      startProgressAnimation();
    }
  };
  
  // Load streak data from streakManager instead of directly from storage
/* 1️⃣  live streak – automatically up-to-date */
const liveStreak = useStreak();

/* 2️⃣  map it into the local state that drives animations */
useEffect(() => {
  setStreak(liveStreak);
}, [liveStreak]);

/* 3️⃣  lightweight loader for everything **other** than the number itself */
useEffect(() => {
  let cancelled = false;

  const loadExtras = async () => {
    try {
      setLoading(true);

      // We still ask the manager for status, but ONLY for side-data
      const status   = await streakManager.getStreakStatus();
      const broken   = await streakManager.isStreakBroken();
      const progress = await storageService.getUserProgress();

      if (cancelled) return;

      const firstTime   = streakManager.streakCache.routineDates.length === 0;
      const level       = progress.level || 1;
      const reqLevel    = featureAccessUtils.getRequiredLevel('streak_freezes');
      const meetsLevel  = level >= reqLevel;

      setIsStreakBroken(broken && !firstTime);
      // Keep streak value from useStreak hook; avoid double-count or TZ drift
      setUserLevel(level);
      setCanUseStreakFreeze(meetsLevel);
      if (isPremium && meetsLevel) {
        setFreezeCount(status.freezesAvailable);
      }
    } catch (err) {
      console.error('StreakDisplay loadExtras:', err);
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  loadExtras();

  // refresh extras whenever the streak system fires its event
  const onUpdate = () => loadExtras();
  streakManager.streakEvents.on('streak_updated', onUpdate);
  streakManager.streakEvents.on(streakManager.STREAK_SAVED_EVENT, onUpdate);

  return () => {
    cancelled = true;
    streakManager.streakEvents.off('streak_updated', onUpdate);
    streakManager.streakEvents.off(streakManager.STREAK_SAVED_EVENT, onUpdate);
  };
}, [isPremium]);

  
  // Show loading indicator while data is loading
  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF'}]}>
        <ActivityIndicator size="small" color={isDark || isSunset ? '#90CAF9' : '#2196F3'} />
        <Text style={[styles.loadingText, {color: theme.text}]}>Loading...</Text>
      </View>
    );
  }
  
  // Create milestone data for streak path
  const milestones = [
    { days: 1, label: "START" },
    { days: 3, label: "3D" },
    { days: 7, label: "WEEK" },
    { days: 14, label: "14D" },
    { days: 30, label: "30D" },
    { days: 90, label: "90D" },
    { days: 180, label: "180D" },
    { days: 365, label: "YEAR" }
  ];
  
  // Find the current milestone and next milestone
  const currentMilestoneIndex = milestones.findIndex(m => streak < m.days) - 1;
  const currentMilestone = currentMilestoneIndex >= 0 ? milestones[currentMilestoneIndex] : { days: 0, label: "" };
  const nextMilestone = currentMilestoneIndex < milestones.length - 1 ? milestones[currentMilestoneIndex + 1] : null;
  
  // Calculate progress to next milestone
  const progress = nextMilestone 
    ? (streak - currentMilestone.days) / (nextMilestone.days - currentMilestone.days) 
    : 1;
  
  // Get days to next milestone
  const daysToNextMilestone = nextMilestone ? nextMilestone.days - streak : 0;
  
  // Haptic feedback for main flame icon when tapped
  const handleFlamePress = () => {
    triggerHaptic('heavy');
    
    // Start flame animation again
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.4,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.inOut(Easing.elastic(1.5)),
        useNativeDriver: true
      })
    ]).start();
  };
  
  return (
    <View style={[styles.container, {backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF'}]}>
      {/* Header with streak count and freeze info */}
      <View style={styles.header}>
        <View style={styles.streakTitleContainer}>
          <TouchableOpacity onPress={handleFlamePress} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons 
                name={isStreakBroken ? "flame-outline" : (streak === 0 ? "star-outline" : "flame")} 
                size={32} 
                color={isStreakBroken ? "#9E9E9E" : 
                       (streak === 0 ? "#90CAF9" :
                        (streak > 30 ? "#FF6D00" : (streak > 7 ? "#FF9800" : "#FFB74D")))} 
              />
            </Animated.View>
          </TouchableOpacity>
          <View style={styles.streakTextContainer}>
            <Text style={[styles.streakCount, { 
              color: isStreakBroken ? theme.textSecondary : theme.text 
            }]}>
              {streak}
            </Text>
            <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>
              {isStreakBroken ? "STREAK BROKEN" : 
               (streak === 0 ? "READY TO START" : `DAY${streak !== 1 ? 'S' : ''} STREAK`)}
            </Text>
          </View>
        </View>
        
        {/* Premium freeze display */}
        {isPremium && canUseStreakFreeze ? (
          <TouchableOpacity 
            style={[styles.freezeContainer, { 
              backgroundColor: isDark || isSunset ? 
                'rgba(144, 202, 249, 0.15)' : 
                'rgba(144, 202, 249, 0.1)' 
            }]}
            onPress={() => triggerHaptic('medium')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="snow" 
              size={16} 
              color={isDark || isSunset ? '#90CAF9' : '#2196F3'} 
            />
            <Text style={[styles.freezeCount, { 
              color: freezeCount > 0 ? 
                (isDark || isSunset ? '#90CAF9' : '#2196F3') : 
                '#EF5350' 
            }]}>
              {freezeCount}
            </Text>
          </TouchableOpacity>
        ) : !isPremium ? (
          <TouchableOpacity 
            style={[styles.premiumBadge, {
              backgroundColor: isDark || isSunset ? 
                'rgba(255, 167, 38, 0.15)' : 
                'rgba(255, 167, 38, 0.1)'
            }]}
            onPress={() => {
              triggerHaptic('medium');
              if (onPremiumPress) onPremiumPress();
            }}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="shield" 
              size={14} 
              color={isDark || isSunset ? '#FFA726' : '#FFA726'} 
            />
            <Text style={[
              styles.premiumText, 
              { color: isDark || isSunset ? '#FFA726' : '#FFA726' }
            ]}>PROTECT</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.levelBadge, {
              backgroundColor: isDark || isSunset ? 
                'rgba(149, 117, 205, 0.15)' : 
                'rgba(149, 117, 205, 0.1)'
            }]}
            onPress={() => triggerHaptic('light')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.levelText,
              { color: isDark || isSunset ? '#9575CD' : '#9575CD' }
            ]}>LVL 6 UNLOCKS</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Streak path visualization */}
      <View style={styles.streakPathContainer}>
        {/* Streak path track */}
        <View style={styles.streakTrack}>
          {milestones.map((milestone, index) => {
            const isCompleted = streak >= milestone.days;
            const isCurrent = nextMilestone?.days === milestone.days;
            const isFocused = focusedMilestone === milestone.days;
            
            // Create animation for this milestone if it doesn't exist yet
            if (!tapAnimations[milestone.days]) {
              tapAnimations[milestone.days] = new Animated.Value(1);
            }
            
            // Determine colors based on completion and theme
            const dotColor = isCompleted 
              ? (isDark ? 
                  '#FFB74D' : 
                  isSunset ? 
                    '#FF8C5A' : 
                    '#FF9800') 
              : (isDark || isSunset ? 
                  'rgba(255,255,255,0.2)' : 
                  '#E0E0E0');
            
            // Enhanced glow effect for the current milestone and focused milestones
            const glowOpacity = isCurrent 
              ? glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 0.8]
                }) 
              : isFocused ? 0.6 : 0;
            
            // Line to next milestone (except for last one)
            const showLine = index < milestones.length - 1;
            
            return (
              <TouchableOpacity 
                key={milestone.days} 
                style={styles.milestoneContainer}
                onPress={() => handleMilestoneTap(milestone.days, isCompleted, isCurrent)}
                activeOpacity={0.7}
              >
                {/* Milestone dot */}
                <Animated.View 
                  style={[
                    styles.dotContainer,
                    {
                      transform: [{ scale: tapAnimations[milestone.days] }],
                      zIndex: isFocused ? 10 : 2
                    }
                  ]}
                >
                  {/* Glow effect */}
                  {(isCurrent || isFocused) && (
                    <Animated.View style={[
                      styles.glowDot,
                      { 
                        backgroundColor: isCurrent 
                          ? (isDark ? 
                              '#FF9800' : 
                              isSunset ? 
                                '#FF8C5A' : 
                                '#FF9800')
                          : (isCompleted ? 
                              isSunset ? 
                                '#FF8C5A' : 
                                '#81C784' : 
                              isSunset ? 
                                '#FFB38E' : 
                                '#90CAF9'),
                        opacity: isFocused ? 0.7 : glowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0.5]
                        }),
                        transform: [{
                          scale: isFocused ? 1 : glowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1.1]
                          })
                        }],
                        width: isFocused ? 30 : 24,
                        height: isFocused ? 30 : 24,
                      }
                    ]} />
                  )}
                  <View style={[
                    styles.milestoneDot, 
                    { 
                      backgroundColor: isFocused && !isCompleted ? 
                        (isSunset ? '#FFB38E' : '#90CAF9') : 
                        dotColor,
                      borderColor: isCompleted 
                        ? (isDark ? 
                            '#FF9800' : 
                            isSunset ? 
                              '#FF8C5A' : 
                              '#FF9800') 
                        : isFocused ? 
                            (isSunset ? '#FFB38E' : '#90CAF9') : 
                            'transparent',
                      width: (isCurrent || isFocused) ? 16 : 12,
                      height: (isCurrent || isFocused) ? 16 : 12,
                    }
                  ]}>
                    {isCompleted && (
                      <Ionicons name="checkmark" size={8} color="#FFF" />
                    )}
                  </View>
                </Animated.View>
                
                {/* Label */}
                <Text style={[
                  styles.milestoneLabel, 
                  { 
                    color: isFocused
                      ? (isCompleted ? 
                          isSunset ? '#FF8C5A' : '#FF9800' : 
                          isSunset ? '#FFB38E' : '#2196F3')
                      : isCompleted 
                        ? (isDark ? 
                            '#FFB74D' : 
                            isSunset ? 
                              '#FF8C5A' : 
                              '#FF9800') 
                        : theme.textSecondary,
                    fontWeight: (isCurrent || isFocused) ? '700' : (isCompleted ? '600' : 'normal'),
                    fontSize: isFocused ? 12 : 10
                  }
                ]}>
                  {milestone.label}
                </Text>
                
                {/* Line to next milestone */}
                {showLine && (
                  <View style={styles.lineContainer}>
                    <View style={[
                      styles.milestoneLine,
                      {
                        backgroundColor: index < currentMilestoneIndex + 1 
                          ? (isDark ? 
                              '#FFB74D' : 
                              isSunset ? 
                                '#FF8C5A' : 
                                '#FF9800') 
                          : (isDark || isSunset ? 
                              'rgba(255,255,255,0.1)' : 
                              '#E0E0E0')
                      }
                    ]} />
                    {/* Progress line for current segment */}
                    {index === currentMilestoneIndex && nextMilestone && (
                      <Animated.View 
                        style={[
                          styles.progressLine,
                          {
                            backgroundColor: isDark ? 
                              '#FFB74D' : 
                              isSunset ? 
                                '#FF8C5A' : 
                                '#FF9800',
                            width: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', `${progress * 100}%`]
                            }),
                            shadowOpacity: 0.3
                          }
                        ]}
                      />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      {/* Focused milestone info or motivation */}
      <View style={styles.motivationContainer}>
        {focusedMilestone !== null ? (
          <>
            <View style={styles.focusedMilestoneInfo}>
              <MaterialCommunityIcons 
                name={
                  focusedMilestone <= streak 
                    ? "trophy" 
                    : focusedMilestone === nextMilestone?.days 
                      ? "target" 
                      : "calendar-clock"
                } 
                size={20} 
                color={
                  focusedMilestone <= streak 
                    ? isSunset ? "#FF8C5A" : "#FF9800" 
                    : focusedMilestone === nextMilestone?.days 
                      ? isSunset ? "#FFB38E" : "#2196F3" 
                      : theme.textSecondary
                }
              />
              <Text style={[styles.focusedMilestoneText, { 
                color: theme.text,
                fontWeight: '600'
              }]}>
                {focusedMilestone <= streak 
                  ? `${focusedMilestone}-day streak achieved!` 
                  : focusedMilestone === nextMilestone?.days
                    ? `${daysToNextMilestone} day${daysToNextMilestone !== 1 ? 's' : ''} until ${focusedMilestone}-day streak`
                    : `${focusedMilestone - streak} more days to reach ${focusedMilestone}-day streak`
                }
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.closeFocusButton}
              onPress={() => {
                triggerHaptic('light');
                setFocusedMilestone(null);
              }}
            >
              <Text style={styles.closeFocusText}>Close</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <MaterialCommunityIcons 
              name={streak > 30 ? "fire" : (streak > 7 ? "run-fast" : "star-shooting")} 
              size={18} 
              color={isDark ? '#FFB74D' : '#FF9800'} 
            />
            <Text style={[styles.motivationText, { color: theme.textSecondary }]}>
              {isStreakBroken ? "Start a new streak today!" :
               streak === 0 ? "Begin your fitness journey today!" :
               streak < 3 ? "Great start! Keep going!" :
               streak < 7 ? "You're building momentum!" :
               streak < 14 ? "One week down! You're on fire!" :
               streak < 30 ? "Amazing dedication!" :
               streak < 90 ? "You're a stretching champion!" :
               streak < 180 ? "Incredible consistency!" :
               "You're legendary! Keep that streak alive!"}
            </Text>
            
            {/* Streak freeze message for non-premium */}
            {!isPremium && streak > 3 && canUseStreakFreeze && !isStreakBroken && (
              <TouchableOpacity 
                style={styles.freezePromptContainer}
                onPress={() => {
                  triggerHaptic('warning');
                  if (onPremiumPress) onPremiumPress();
                }}
              >
                <Text style={styles.freezePromptText}>
                  Get Premium to protect your {streak} day streak!
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Tap instruction hint */}
            <Text style={styles.tapHintText}>
              Tap milestones to explore your journey
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakTextContainer: {
    marginLeft: 10,
  },
  streakCount: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  freezeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  freezeCount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFA726',
    marginLeft: 4,
  },
  levelBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9575CD',
  },
  streakPathContainer: {
    marginVertical: 16,
  },
  streakTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
    position: 'relative',
  },
  milestoneContainer: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
    paddingVertical: 10, // Makes tap target larger
    marginHorizontal: 2, // Add a bit of space between milestone containers
  },
  dotContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    width: 24,
    marginBottom: 6,
  },
  glowDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    zIndex: 1,
  },
  milestoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2,
  },
  milestoneLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    width: 36, // Wider fixed width to fit text labels
    flexShrink: 0, // Prevent text from shrinking/wrapping
  },
  lineContainer: {
    position: 'absolute',
    height: 3,
    left: '50%',
    right: '50%',
    top: 10,
    zIndex: 0,
  },
  milestoneLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 1.5,
  },
  progressLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    borderRadius: 1.5,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 5,
  },
  motivationContainer: {
    marginTop: 8,
    flexDirection: 'column',
    alignItems: 'center',
  },
  motivationText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  freezePromptContainer: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    borderRadius: 12,
  },
  freezePromptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
    textAlign: 'center',
  },
  tapHintText: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 14,
    opacity: 0.8,
  },
  focusedMilestoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  focusedMilestoneText: {
    fontSize: 13,
    marginLeft: 8,
    flexShrink: 1,
  },
  closeFocusButton: {
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  closeFocusText: {
    fontSize: 12,
    color: '#9E9E9E',
  }
});

export default StreakDisplay; 
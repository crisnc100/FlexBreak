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
  Platform,
  Modal,
  Alert,
  InteractionManager
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as flexSaveManager from '../../utils/progress/modules/flexSaveManager';
import * as storageService from '../../services/storageService';
import * as featureAccessUtils from '../../utils/featureAccessUtils';
import * as haptics from '../../utils/haptics';
import * as dateUtils from '../../utils/progress/modules/utils/dateUtils';
import { useStreak } from '../../hooks/progress/useStreak';
import { EventEmitter } from '../../utils/progress/modules/utils/EventEmitter';

// Create an event emitter for streak flexSave events that parent components can listen to
export const streakFlexSaveEvents = new EventEmitter();
export const STREAK_FLEX_SAVE_APPLIED = 'streak_flex_save_applied';

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
  onFlexSaveApplied?: (data: { success: boolean, streakValue: number, flexSavesRemaining: number }) => void;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({ 
  currentStreak = 0,
  onPremiumPress,
  onFlexSaveApplied
}) => {
  const { theme, isDark, isSunset } = useTheme();
  const { isPremium } = usePremium();
  const [streak, setStreak] = useState(currentStreak);
  const [flexSaveCount, setFlexSaveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [canUseFlexSave, setCanUseFlexSave] = useState(false);
  const [streakBroken, setStreakBroken] = useState(false);
  const [streakSaveable, setStreakSaveable] = useState(false);
  const [yesterdayActivity, setYesterdayActivity] = useState(false);
  const [dayBeforeActivity, setDayBeforeActivity] = useState(false);
  const [focusedMilestone, setFocusedMilestone] = useState<number | null>(null);
  const [progressPulse, setProgressPulse] = useState(false);
  const [isStreakBroken, setIsStreakBroken] = useState(false);
  const [showFlexSaveModal, setShowFlexSaveModal] = useState(false);
  const [applyingFlexSave, setApplyingFlexSave] = useState(false);
  const [flexSaveSuccess, setFlexSaveSuccess] = useState<boolean | null>(null);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const tapAnimations = useRef<{ [key: number]: Animated.Value }>({}).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const flexSaveIconAnim = useRef(new Animated.Value(1)).current;
  const flexSaveModalAnim = useRef(new Animated.Value(0)).current;
  
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
  
  // Animation for flexSave icon
  const animateFlexSaveIcon = () => {
    flexSaveIconAnim.setValue(1);
    Animated.sequence([
      Animated.timing(flexSaveIconAnim, {
        toValue: 1.4,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(flexSaveIconAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.inOut(Easing.elastic(1.5)),
        useNativeDriver: true
      })
    ]).start();
  };
  
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

        // Get complete status info
        const status = await streakManager.getStreakStatus();
        const broken = await streakManager.isStreakBroken();
        const legacyStatus = await streakManager.getLegacyStreakStatus();
        const progress = await storageService.getUserProgress();
        
        // Get specific day activity
        const hasYesterdayActivity = await streakManager.hasRoutineYesterday();
        const hasYesterdayFlexSave = await streakManager.hasFlexSaveYesterday();
        
        // Check if user had activity 2 days ago
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const twoDaysAgoStr = dateUtils.formatDateYYYYMMDD(twoDaysAgo);
        const hasTwoDaysAgoActivity = streakManager.streakCache.routineDates.includes(twoDaysAgoStr) || 
                                     streakManager.streakCache.flexSaveDates.includes(twoDaysAgoStr);

        if (cancelled) return;

        const firstTime = streakManager.streakCache.routineDates.length === 0;
        const level = progress.level || 1;
        const reqLevel = featureAccessUtils.getRequiredLevel('flex_saves');
        const meetsLevel = level >= reqLevel;

        // DEBUG CODE - TEMPORARY: Detailed logging of streak flexSave data
        if (isPremium && meetsLevel) {
          console.log(`[FLEX SAVE DISPLAY DEBUG] StreakDisplay - FlexSave count from status: ${status.flexSavesAvailable}`);
          
          // Check direct from storage
          const userProgress = await storageService.getUserProgress();
          console.log(`[FLEX SAVE DEBUG] StreakDisplay - User level: ${userProgress.level}, required level: ${reqLevel}`);
          
          // Check if reward exists
          const flexSaveReward = userProgress.rewards?.flex_saves;
          console.log(`[FLEX SAVE DEBUG] StreakDisplay - Reward exists: ${!!flexSaveReward}`);
          
          if (flexSaveReward) {
            console.log(`[FLEX SAVE DEBUG] StreakDisplay - Reward data:`, {
              unlocked: flexSaveReward.unlocked,
              uses: flexSaveReward.uses || 0,
              lastRefill: flexSaveReward.lastRefill || 'never'
            });
          }
        }
        // END DEBUG CODE

        setIsStreakBroken(broken && !firstTime);
        // Keep streak value from useStreak hook; avoid double-count or TZ drift
        setUserLevel(level);
        setCanUseFlexSave(meetsLevel);
        setStreakBroken(legacyStatus.streakBroken);
        setStreakSaveable(legacyStatus.canSaveYesterdayStreak);
        setYesterdayActivity(hasYesterdayActivity || hasYesterdayFlexSave);
        setDayBeforeActivity(hasTwoDaysAgoActivity);
        
        if (isPremium && meetsLevel) {
          setFlexSaveCount(status.flexSavesAvailable);
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

  // Add a debounce utility to limit the frequency of checks
  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout | null = null;
    return function executedFunction(...args: any[]) {
      const later = () => {
        timeout = null;
        func(...args);
      };
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  };

  // Check if user can actually use a flexSave - ONLY if broken yesterday specifically
  // Re-check all conditions directly from manager, don't rely on local state
  const checkCanApplyFlexSave = async (): Promise<boolean> => {
    if (!isPremium) return false;
    
    try {
      // Force reinitialize streak data to get the latest state
      if (!streakManager.streakCache.initialized) {
        await streakManager.initializeStreak();
      }
      
      // Get fresh data directly from the streak manager
      const status = await streakManager.getStreakStatus(false); // Don't force refresh every time
      const legacyStatus = await streakManager.getLegacyStreakStatus();
      
      // Get specific day activity
      const hasYesterdayActivity = await streakManager.hasRoutineYesterday();
      const hasYesterdayFlexSave = await streakManager.hasFlexSaveYesterday();
      
      // Check if user had activity 2 days ago
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = dateUtils.formatDateYYYYMMDD(twoDaysAgo);
      const hasTwoDaysAgoActivity = streakManager.streakCache.routineDates.includes(twoDaysAgoStr) || 
                                   streakManager.streakCache.flexSaveDates.includes(twoDaysAgoStr);
      
      // Only log when debugging is needed - comment this out for production
      // console.log('[FLEXSAVE AVAILABILITY] Checking flexSave availability:', {
      //   isPremium,
      //   hasRequiredLevel: status.canFlexSave,
      //   flexSaveCount: status.flexSavesAvailable,
      //   streakBroken: legacyStatus.streakBroken,
      //   canSaveYesterday: legacyStatus.canSaveYesterdayStreak,
      //   yesterdayActivity: hasYesterdayActivity || hasYesterdayFlexSave,
      //   twoDaysAgoActivity: hasTwoDaysAgoActivity
      // });
      
      // Set the flexSaveCount from the fresh status
      setFlexSaveCount(status.flexSavesAvailable);
      setStreakBroken(legacyStatus.streakBroken);
      setStreakSaveable(legacyStatus.canSaveYesterdayStreak);
      setYesterdayActivity(hasYesterdayActivity || hasYesterdayFlexSave);
      setDayBeforeActivity(hasTwoDaysAgoActivity);
      
      return isPremium && 
             status.canFlexSave && 
             status.flexSavesAvailable > 0 && 
             legacyStatus.streakBroken && 
             legacyStatus.canSaveYesterdayStreak &&
             !(hasYesterdayActivity || hasYesterdayFlexSave) &&
             hasTwoDaysAgoActivity;
    } catch (error) {
      console.error('[FLEXSAVE ERROR] Error checking flexSave availability:', error);
      return false;
    }
  };

  // Create a debounced version of the check function
  const debouncedCheckFlexSave = debounce(async () => {
    await checkCanApplyFlexSave();
  }, 1000); // Limit checks to once per second

  useEffect(() => {
    // Check flexSave availability once during initial component mount
    checkCanApplyFlexSave();
    
    // Listen for streak events to refresh availability
    const onStreakEvent = () => debouncedCheckFlexSave();
    streakManager.streakEvents.on('streak_updated', onStreakEvent);
    streakManager.streakEvents.on(streakManager.STREAK_SAVED_EVENT, onStreakEvent);
    
    // Only listen to STREAK_BROKEN_EVENT if we actually need to respond to it
    // This event is triggered too frequently and causes performance issues
    // streakManager.streakEvents.on(streakManager.STREAK_BROKEN_EVENT, onStreakEvent);
    
    return () => {
      streakManager.streakEvents.off('streak_updated', onStreakEvent);
      streakManager.streakEvents.off(streakManager.STREAK_SAVED_EVENT, onStreakEvent);
      // streakManager.streakEvents.off(streakManager.STREAK_BROKEN_EVENT, onStreakEvent);
    };
  }, []);

  // Handle flexSave button press - force a fresh check only when needed
  const handleFlexSavePress = async () => {
    // Force a fresh check of flexSave availability
    const canApply = await checkCanApplyFlexSave();
    
    if (!canApply) {
      // Provide error feedback with specific reason
      triggerHaptic('error');
      
      // Determine the specific reason for unavailability
      let reason = 'Your streak cannot be restored at this time.';
      if (flexSaveCount <= 0) {
        reason = 'You have no Flex Saves available.';
      } else if (!streakBroken) {
        reason = 'Your streak is already active and doesn\'t need restoring.';
      } else if (!streakSaveable) {
        reason = 'Your streak has been broken for more than one day and cannot be recovered.';
      }
      
      Alert.alert(
        'Flex Save Unavailable', 
        reason
      );
      return;
    }
    
    // No additional checks needed here since we just verified availability
    triggerHaptic('medium');
    animateFlexSaveIcon();
    setShowFlexSaveModal(true);
    
    // Animate modal appearance
    flexSaveModalAnim.setValue(0);
    Animated.timing(flexSaveModalAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }).start();
  };

  // Apply streak flexSave with better error handling
  const applyFlexSave = async () => {
    try {
      setApplyingFlexSave(true);
      triggerHaptic('medium');

      // Allow the UI to render the loading state before heavy work begins
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Move heavy logic off UI thread for smoother animation
      await InteractionManager.runAfterInteractions(async () => {
        try {
          // Double-check availability right before applying
          const canApply = await checkCanApplyFlexSave();
          if (!canApply) {
            setFlexSaveSuccess(false);
            triggerHaptic('error');
            return;
          }

          const result = await flexSaveManager.applyFlexSave();

          if (result.success) {
            setFlexSaveSuccess(true);
            setFlexSaveCount(result.remainingFlexSaves);

            const updatedStatus = await streakManager.getStreakStatus(true);
            setStreak(updatedStatus.currentStreak);
            setIsStreakBroken(false);

            triggerHaptic('success');
            
            // Prepare flexSave data
            const flexSaveData = {
              success: true,
              streakValue: updatedStatus.currentStreak,
              flexSavesRemaining: result.remainingFlexSaves
            };
            
            // Emit an event that the parent can listen to
            streakFlexSaveEvents.emit(STREAK_FLEX_SAVE_APPLIED, flexSaveData);
            
            // Also call the callback if provided
            if (onFlexSaveApplied) {
              onFlexSaveApplied(flexSaveData);
            }
            
            // Close the modal sooner since we have the snowflake animation
            setTimeout(() => {
              setApplyingFlexSave(false);
              closeModal();
            }, 700); // Reduced from 1200ms to 700ms for a quicker transition
          } else {
            setFlexSaveSuccess(false);
            triggerHaptic('error');
            
            // Keep longer delay for error cases so users can read the message
            setTimeout(() => {
              setApplyingFlexSave(false);
              closeModal();
            }, 1200);
          }
        } catch (err) {
          console.error('Error applying flexSave:', err);
          setFlexSaveSuccess(false);
          triggerHaptic('error');
          
          // Keep longer delay for error cases so users can read the message
          setTimeout(() => {
            setApplyingFlexSave(false);
            closeModal();
          }, 1200);
        }
      });
    } catch (error) {
      console.error('Error preparing flexSave:', error);
      setFlexSaveSuccess(false);
      triggerHaptic('error');
      
      // Keep longer delay for error cases so users can read the message
      setTimeout(() => {
        setApplyingFlexSave(false);
        closeModal();
      }, 1200);
    }
  };

  // Helper function to close modal
  const closeModal = () => {
    // Animate modal out
    Animated.timing(flexSaveModalAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      setShowFlexSaveModal(false);
      setFlexSaveSuccess(null);
      setApplyingFlexSave(false);
    });
  };

  // Cancel streak flexSave
  const cancelFlexSave = () => {
    triggerHaptic('light');
    closeModal();
  };

  useEffect(() => {
    // Check flexSave availability whenever the component is visible 
    // or streak events are triggered
    const refreshFlexSaveAvailability = async () => {
      // This updates all our state variables with the latest values
      await checkCanApplyFlexSave();
    };
    
    refreshFlexSaveAvailability();
    
    // Listen for streak events to refresh availability
    const onStreakEvent = () => refreshFlexSaveAvailability();
    streakManager.streakEvents.on('streak_updated', onStreakEvent);
    streakManager.streakEvents.on(streakManager.STREAK_SAVED_EVENT, onStreakEvent);
    streakManager.streakEvents.on(streakManager.STREAK_BROKEN_EVENT, onStreakEvent);
    
    return () => {
      streakManager.streakEvents.off('streak_updated', onStreakEvent);
      streakManager.streakEvents.off(streakManager.STREAK_SAVED_EVENT, onStreakEvent);
      streakManager.streakEvents.off(streakManager.STREAK_BROKEN_EVENT, onStreakEvent);
    };
  }, []);
  
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

  // Check if user can actually use a flexSave
  const canApplyFlexSave = isPremium && 
                        canUseFlexSave && 
                        flexSaveCount > 0 && 
                        streakBroken && 
                        streakSaveable &&
                        !yesterdayActivity &&  // No activity yesterday
                        dayBeforeActivity;     // Had activity two days ago
  
  return (
    <View style={[styles.container, {backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF'}]}>
      {/* Prominent Flex Save Banner when applicable */}
      {canApplyFlexSave && (
        <TouchableOpacity
          style={[styles.flexSaveBanner, {
            backgroundColor: isDark 
              ? 'rgba(33, 150, 243, 0.15)' 
              : 'rgba(33, 150, 243, 0.08)'
          }]}
          onPress={handleFlexSavePress}
          activeOpacity={0.7}
        >
          <Animated.View style={{
            transform: [{ scale: pulseAnim }],
            marginRight: 10
          }}>
            <MaterialCommunityIcons 
              name="timer-sand" 
              size={20} 
              color={isDark ? '#90CAF9' : '#2196F3'} 
            />
          </Animated.View>
          <View style={styles.flexSaveBannerTextContainer}>
            <Text style={[styles.flexSaveBannerTitle, {
              color: isDark ? '#90CAF9' : '#2196F3'
            }]}>
              Streak Broken! Apply FlexSave?
            </Text>
            <Text style={[styles.flexSaveBannerSubtitle, {
              color: theme.textSecondary
            }]}>
              Tap to recover your {currentStreak}-day streak using 1 Flex Save
            </Text>
          </View>
          <View style={styles.flexSaveBadge}>
            <Text style={styles.flexSaveBadgeText}>{flexSaveCount}</Text>
          </View>
        </TouchableOpacity>
      )}
      {/* Header with streak count and flexSave info */}
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
        
        {/* Premium flexSave display - ONLY shown when it can actually be used */}
        {canApplyFlexSave ? (
          <TouchableOpacity 
            style={[styles.flexSaveContainer, { 
              backgroundColor: isDark || isSunset ? 
                'rgba(144, 202, 249, 0.15)' : 
                'rgba(144, 202, 249, 0.1)',
            }]}
            onPress={handleFlexSavePress}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: flexSaveIconAnim }] }}>
              <MaterialCommunityIcons 
                name="timer-sand" 
                size={16} 
                color={isDark || isSunset ? '#90CAF9' : '#2196F3'} 
              />
            </Animated.View>
            <Text style={[styles.flexSaveCount, { 
              color: isDark || isSunset ? '#90CAF9' : '#2196F3'
            }]}>
              {flexSaveCount}
            </Text>
          </TouchableOpacity>
        ) : isPremium && canUseFlexSave ? (
          // Always show flexSave count for premium users with level req met, just in disabled state
          <View 
            style={[styles.flexSaveContainer, { 
              backgroundColor: isDark || isSunset ? 
                'rgba(144, 202, 249, 0.08)' : 
                'rgba(144, 202, 249, 0.05)',
              opacity: flexSaveCount > 0 ? 0.6 : 0.4
            }]}
          >
            <MaterialCommunityIcons 
              name="timer-sand" 
              size={16} 
              color={flexSaveCount > 0 ? "#9E9E9E" : "#BDBDBD"} 
            />
            <Text style={[styles.flexSaveCount, { 
              color: flexSaveCount > 0 ? "#9E9E9E" : "#BDBDBD"
            }]}>
              {flexSaveCount}
            </Text>
          </View>
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
            
            {/* Streak flexSave message for non-premium */}
            {!isPremium && streak > 3 && canUseFlexSave && !isStreakBroken && (
              <TouchableOpacity 
                style={styles.flexSavePromptContainer}
                onPress={() => {
                  triggerHaptic('warning');
                  if (onPremiumPress) onPremiumPress();
                }}
              >
                <Text style={styles.flexSavePromptText}>
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
      
      {/* Flex Save Modal */}
      <Modal
        transparent={true}
        visible={showFlexSaveModal}
        animationType="none"
        onRequestClose={cancelFlexSave}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.flexSaveModalContainer,
              {
                backgroundColor: isDark ? theme.cardBackground : '#FFF',
                transform: [
                  { scale: flexSaveModalAnim.interpolate({ 
                    inputRange: [0, 1], 
                    outputRange: [0.9, 1] 
                  }) },
                  { translateY: flexSaveModalAnim.interpolate({ 
                    inputRange: [0, 1], 
                    outputRange: [20, 0] 
                  }) }
                ],
                opacity: flexSaveModalAnim
              }
            ]}
          >
            {flexSaveSuccess === null ? (
              <>
                <View style={styles.flexSaveModalIconContainer}>
                  <Animated.View style={{ 
                    transform: [{ 
                      rotate: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      }) 
                    }] 
                  }}>
                    <View style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: 'rgba(144, 202, 249, 0.2)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: isDark ? '#90CAF9' : '#2196F3',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: isDark ? 0.8 : 0.5,
                      shadowRadius: 15,
                      elevation: 5,
                    }}>
                      <MaterialCommunityIcons 
                        name="timer-sand" 
                        size={32} 
                        color={isDark ? "#90CAF9" : "#2196F3"} 
                      />
                    </View>
                  </Animated.View>
                </View>
                <Text style={[styles.flexSaveModalTitle, { color: theme.text }]}>
                  Recover Your Streak
                </Text>
                <Text style={[styles.flexSaveModalDescription, { color: theme.textSecondary }]}>
                  Your streak was broken yesterday. Apply a Flex Save to protect it.
                  You have {flexSaveCount} Flex Save{flexSaveCount !== 1 ? 's' : ''} remaining this month.
                </Text>
                <View style={styles.flexSaveModalButtons}>
                  <TouchableOpacity 
                    style={[styles.flexSaveModalButton, styles.cancelButton]}
                    onPress={cancelFlexSave}
                    disabled={applyingFlexSave}
                  >
                    <Text style={[
                      styles.cancelButtonText, 
                      applyingFlexSave && { opacity: 0.5 }
                    ]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.flexSaveModalButton, 
                      styles.applyButton, 
                      applyingFlexSave && { opacity: 0.8 }
                    ]}
                    onPress={applyFlexSave}
                    disabled={applyingFlexSave}
                  >
                    {applyingFlexSave ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.flexSaveLoadingText}>Applying...</Text>
                      </View>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="timer-sand" size={16} color="#FFFFFF" style={{marginRight: 6}} />
                        <Text style={styles.applyButtonText}>Apply FlexSave</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : flexSaveSuccess ? (
              <View style={styles.flexSaveResultContainer}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={60} color="#81C784" />
                </View>
                <Text style={[styles.flexSaveResultTitle, { color: theme.text }]}>
                  Streak Recovered!
                </Text>
                <Text style={[styles.flexSaveResultMessage, { color: theme.textSecondary }]}>
                  Your streak has been successfully protected from breaking.
                </Text>
                <View style={styles.flexSaveRemainingContainer}>
                  <MaterialCommunityIcons name="timer-sand" size={16} color={isDark ? "#90CAF9" : "#2196F3"} style={{marginRight: 6}} />
                  <Text style={[styles.flexSaveRemainingText, { color: theme.textSecondary }]}>
                    {flexSaveCount} flexSave{flexSaveCount !== 1 ? 's' : ''} remaining this month
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.flexSaveResultContainer}>
                <View style={styles.errorIconContainer}>
                  <Ionicons name="close-circle" size={60} color="#EF5350" />
                </View>
                <Text style={[styles.flexSaveResultTitle, { color: theme.text }]}>
                  Unable to Apply FlexSave
                </Text>
                <Text style={[styles.flexSaveResultMessage, { color: theme.textSecondary }]}>
                  There was an issue applying your streak flexSave. Please try again later.
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
      
      {/* Show broken streak notice with flexSave option if applicable */}
      {isStreakBroken && canApplyFlexSave && (
        <View style={styles.brokenStreakNotice}>
          <MaterialCommunityIcons name="alert" size={18} color="#EF5350" />
          <Text style={styles.brokenStreakText}>
            Your streak was broken yesterday. Use a streak flexSave to recover it!
          </Text>
          <TouchableOpacity 
            style={styles.miniApplyButton}
            onPress={handleFlexSavePress}
          >
            <MaterialCommunityIcons name="timer-sand" size={14} color="#FFF" />
            <Text style={styles.miniApplyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}
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
  flexSaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  flexSaveCount: {
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
  flexSavePromptContainer: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    borderRadius: 12,
  },
  flexSavePromptText: {
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  flexSaveModalContainer: {
    width: '90%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  flexSaveModalIconContainer: {
    marginBottom: 16,
    height: 80,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexSaveModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  flexSaveModalDescription: {
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  flexSaveModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  flexSaveModalButton: {
    padding: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#9E9E9E',
    fontWeight: '600',
    fontSize: 15,
  },
  applyButton: {
    backgroundColor: '#2196F3',
    flex: 1.5,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  flexSaveResultContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  flexSaveResultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  flexSaveResultMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  flexSaveRemainingText: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 16,
  },
  brokenStreakNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  brokenStreakText: {
    fontSize: 13,
    color: '#EF5350',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  miniApplyButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginLeft: 8,
  },
  miniApplyText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexSaveLoadingText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  flexSaveRemainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(144, 202, 249, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  flexSaveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.2)',
  },
  flexSaveBannerTextContainer: {
    flex: 1,
  },
  flexSaveBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  flexSaveBannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  flexSaveBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexSaveBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default StreakDisplay; 
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as featureAccessUtils from '../../utils/featureAccessUtils';
import * as storageService from '../../services/storageService';

interface StatsOverviewProps {
  totalMinutes: number;
  currentStreak: number;
  totalRoutines: number;
  isTodayComplete?: boolean;
  theme?: any;
  isDark?: boolean;
  streakFreezeActive: boolean;
  userLevel: number;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalMinutes,
  currentStreak,
  totalRoutines,
  isTodayComplete = false,
  theme: propTheme,
  isDark: propIsDark,
  streakFreezeActive,
  userLevel = 1
}) => {
  // Use theme from props if provided, otherwise use theme context
  const themeContext = useTheme();
  const theme = propTheme || themeContext.theme;
  const isDark = propIsDark !== undefined ? propIsDark : themeContext.isDark;

  // Track if streak can be saved with a freeze
  const [streakAtRisk, setStreakAtRisk] = useState(false);
  const [isStreakBroken, setIsStreakBroken] = useState(false);
  const [validatedStreak, setValidatedStreak] = useState(currentStreak);
  
  // Get required level for streak freezes from feature access utils
  const requiredLevel = featureAccessUtils.getRequiredLevel('streak_freezes');
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const meetsLevelRequirement = userLevel >= requiredLevel;
  const canUseStreakFreeze = meetsLevelRequirement && isPremiumUser;
  
  // Animation values for the streak number glow effect
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  
  // Load premium status
  useEffect(() => {
    const loadPremiumStatus = async () => {
      try {
        const isPremium = await storageService.getIsPremium();
        setIsPremiumUser(isPremium);
      } catch (error) {
        console.error('Error loading premium status:', error);
        setIsPremiumUser(false);
      }
    };
    
    loadPremiumStatus();
  }, []);

  // Validate streak and listen for streak updates
  useEffect(() => {
    const validateStreak = async () => {
      try {
        // Initialize streak manager if needed
        if (!streakManager.streakCache.initialized) {
          await streakManager.initializeStreak();
        }
        
        // Check if streak is broken
        const isBroken = await streakManager.isStreakBroken();
        setIsStreakBroken(isBroken);
        
        // Get validated streak
        const streakStatus = await streakManager.getStreakStatus();
        // Only update to 0 if it's broken, otherwise use the passed value
        // This prevents flickering during transitions
        if (isBroken) {
          setValidatedStreak(0);
        } else {
          setValidatedStreak(currentStreak);
        }
        
        console.log('StatsOverview: Validated streak status', {
          isBroken,
          originalStreak: currentStreak,
          validatedStreak: isBroken ? 0 : currentStreak
        });
      } catch (error) {
        console.error('Error validating streak:', error);
        setValidatedStreak(currentStreak);
      }
    };
    
    validateStreak();
    
    // Listen for streak updates
    const handleStreakUpdate = () => {
      console.log('StatsOverview: Streak updated event received');
      validateStreak();
    };
    
    // Add event listener
    streakManager.streakEvents.on('streak_updated', handleStreakUpdate);
    
    // Clean up
    return () => {
      streakManager.streakEvents.off('streak_updated', handleStreakUpdate);
    };
  }, [currentStreak]);
  
  // Start pulse animation when streak is at risk
  useEffect(() => {
    if (meetsLevelRequirement && streakAtRisk) {
      // Create a pulsing glow effect on the text only
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin)
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200, 
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin)
          })
        ])
      ).start();
    }
  }, [meetsLevelRequirement, streakAtRisk, pulseAnim]);
  
  // Check if the streak is at risk and can be saved with a freeze
  useEffect(() => {
    const checkStreakStatus = async () => {
      // Only check if streak is meaningful (5+ days), not protected, and not completed today
      if (validatedStreak >= 5 && !streakFreezeActive && !isTodayComplete) {
        const status = await streakManager.checkStreakStatus();
        setStreakAtRisk(status.canSaveYesterdayStreak);
      } else {
        setStreakAtRisk(false);
      }
    };
    
    checkStreakStatus();
  }, [validatedStreak, streakFreezeActive, isTodayComplete]);

  // For streak of 5+ days, show a warning indicator if today's activity isn't done
  const showWarning = validatedStreak >= 5 && !isTodayComplete && !streakAtRisk && !streakFreezeActive;

  // Get the actual streak to display - use the validated streak value
  const displayStreak = isStreakBroken ? 0 : validatedStreak;

  return (
    <View style={{ backgroundColor: isDark ? theme.background : 'transparent' }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? theme.text : '#333' }]}>
          Your Progress
        </Text>
        <Text style={[styles.headerSubtitle, { color: isDark ? theme.textSecondary : '#666' }]}>
          Keep up the great work!
        </Text>
      </View>
      
      <View style={styles.statsGrid}>
        {/* Total Minutes Stat */}
        <View style={[styles.statCard, { 
          backgroundColor: isDark ? theme.cardBackground : '#FFF',
          shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
          borderWidth: isDark ? 1 : 0
        }]}>
          <View style={[styles.statIconContainer, { 
            backgroundColor: isDark ? 'rgba(76, 175, 80, 0.2)' : '#F0F0F0'
          }]}>
            <Ionicons name="time-outline" size={20} color="#4CAF50" />
          </View>
          <Text style={[styles.statValue, { color: isDark ? theme.text : '#333' }]}>
            {totalMinutes}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#666' }]}>
            Total Minutes
          </Text>
        </View>
        
        {/* Streak Stat */}
        <View style={[styles.statCard, { 
          backgroundColor: isDark ? theme.cardBackground : '#FFF',
          shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
          borderWidth: isDark ? 1 : 0,
          overflow: 'hidden'
        }]}>
          
          <View style={[styles.statIconContainer, { 
            backgroundColor: isDark ? 
              (streakFreezeActive ? 'rgba(33, 150, 243, 0.2)' : 
                (streakAtRisk ? 'rgba(255, 193, 7, 0.2)' :
                  (showWarning ? 'rgba(255, 87, 34, 0.2)' : 
                    (isStreakBroken ? 'rgba(255, 87, 34, 0.1)' :
                      (meetsLevelRequirement ? 'rgba(159, 217, 255, 0.15)' : 'rgba(255, 152, 0, 0.2)'))))) 
              : (streakFreezeActive ? 'rgba(33, 150, 243, 0.15)' : 
                 (streakAtRisk ? 'rgba(255, 193, 7, 0.15)' : 
                   (showWarning ? 'rgba(255, 87, 34, 0.1)' :
                     (isStreakBroken ? 'rgba(255, 87, 34, 0.05)' :
                       (meetsLevelRequirement ? 'rgba(159, 217, 255, 0.1)' : '#F0F0F0')))))
          }]}>
            <Ionicons 
              name={streakFreezeActive ? "snow" : 
                    (streakAtRisk ? "shield-outline" : 
                     (showWarning ? "warning-outline" : 
                      (isStreakBroken ? "refresh-outline" :
                        (meetsLevelRequirement && !streakAtRisk ? "flame" : "flame-outline"))))} 
              size={20} 
              color={streakFreezeActive ? "#2196F3" : 
                     (streakAtRisk ? "#FFC107" : 
                      (showWarning ? "#FF5722" : 
                       (isStreakBroken ? "#FF5722" :
                         (meetsLevelRequirement ? "#2196F3" : "#FF9800"))))} 
            />
          </View>
          
          {streakAtRisk && meetsLevelRequirement ? (
            <Animated.Text 
              style={[
                styles.statValue, 
                { 
                  color: isDark ? '#FFC107' : '#333', // Yellow in dark mode, dark in light mode
                  transform: [{ scale: pulseAnim }],
                  textShadowColor: isDark ? 'rgba(255, 193, 7, 0.6)' : 'rgba(0, 0, 0, 0.2)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: isDark ? 4 : 2,
                  fontWeight: 'bold'
                }
              ]}
            >
              {displayStreak}
            </Animated.Text>
          ) : (
            <Text style={[styles.statValue, { 
              color: isDark ? theme.text : '#333',
              opacity: isStreakBroken ? 0.7 : 1
            }]}>
              {displayStreak}
            </Text>
          )}
          
          <Text style={[styles.statLabel, { 
            color: isDark ? theme.textSecondary : '#666'
          }]}>
            {isStreakBroken ? "Streak Reset" :
             "Day Streak"
             + (streakFreezeActive ? " (Protected)" : 
                (streakAtRisk && canUseStreakFreeze ? " (At Risk)" : 
                 (showWarning ? " (at risk)" : 
                  (meetsLevelRequirement && !streakAtRisk ? " (Freeze Ready)" : ""))))}
          </Text>
          
          {isStreakBroken && (
            <View style={styles.streakResetIndicator}>
              <Ionicons name="refresh-outline" size={14} color="#FF5722" />
              <Text style={[styles.streakResetText, { color: '#FF5722' }]}>
                New streak starting today
              </Text>
            </View>
          )}
          
          {streakAtRisk && canUseStreakFreeze && (
            <View style={styles.streakRiskIndicator}>
              <Ionicons name="shield-outline" size={14} color="#FFC107" />
              <Text style={[styles.streakRiskText, { color: '#FFC107' }]}>
                Use Streak Freeze to save!
              </Text>
            </View>
          )}
          
          {meetsLevelRequirement && !streakFreezeActive && !streakAtRisk && !isStreakBroken && (
            <View style={styles.frostReadyIndicator}>
              <Ionicons name="snow" size={12} color="#2196F3" />
              <Text style={styles.frostReadyText}>Streak Freeze Available</Text>
            </View>
          )}
          
          {streakFreezeActive && (
            <View style={styles.streakFreezeIndicator}>
              <Ionicons name="snow-outline" size={14} color="#2196F3" />
              <Text style={[styles.streakFreezeText, { color: '#2196F3' }]}>
                Streak Freeze Applied
              </Text>
            </View>
          )}
        </View>
        
        {/* Routines Stat */}
        <View style={[styles.statCard, { 
          backgroundColor: isDark ? theme.cardBackground : '#FFF',
          shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
          borderWidth: isDark ? 1 : 0
        }]}>
          <View style={[styles.statIconContainer, { 
            backgroundColor: isDark ? 'rgba(33, 150, 243, 0.2)' : '#F0F0F0'
          }]}>
            <Ionicons name="fitness-outline" size={20} color="#2196F3" />
          </View>
          <Text style={[styles.statValue, { color: isDark ? theme.text : '#333' }]}>
            {totalRoutines}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#666' }]}>
            Routines
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    zIndex: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    zIndex: 2,
  },
  streakResetIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 2,
  },
  streakResetText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '500',
    zIndex: 2,
  },
  streakFreezeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    zIndex: 2,
  },
  streakFreezeText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '500',
    zIndex: 2,
  },
  streakRiskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    zIndex: 2,
  },
  streakRiskText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '500',
    zIndex: 2,
  },
  frostReadyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 2,
  },
  frostReadyText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '500',
    color: '#2196F3',
    zIndex: 2,
  },
});

export default StatsOverview;
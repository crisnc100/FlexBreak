import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import * as streakManager from '../../utils/progress/modules/streakManager';
import { useStreak } from '../../hooks/progress/useStreak';
import * as featureAccessUtils from '../../utils/featureAccessUtils';
import * as storageService from '../../services/storageService';


interface StatsOverviewProps {
  totalMinutes: number;
  currentStreak: number;
  totalRoutines: number;
  isTodayComplete?: boolean;
  theme?: any;
  isDark?: boolean;
  isSunset?: boolean;
  flexSaveActive: boolean;
  userLevel: number;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalMinutes,
  currentStreak,
  totalRoutines,
  isTodayComplete = false,
  theme: propTheme,
  isDark: propIsDark,
  isSunset: propIsSunset,
  flexSaveActive,
  userLevel = 1
}) => {
  // Use theme from props if provided, otherwise use theme context
  const themeContext = useTheme();
  const theme = propTheme || themeContext.theme;
  const isDark = propIsDark !== undefined ? propIsDark : themeContext.isDark;
  const isSunset = propIsSunset !== undefined ? propIsSunset : themeContext.isSunset;
  // Track if streak can be saved with a flexSave
  const [streakAtRisk, setStreakAtRisk] = useState(false);
  const [isStreakBroken, setIsStreakBroken] = useState(false);
  
  // Get required level for streak flexSaves from feature access utils
  const requiredLevel = featureAccessUtils.getRequiredLevel('flex_saves');
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const meetsLevelRequirement = userLevel >= requiredLevel;
  const canUseFlexSave = meetsLevelRequirement && isPremiumUser;
  
  // Add error handling for the streak hook
  let liveStreak = 0;
  try {
    liveStreak = useStreak({ forceRefresh: false }) || 0;
  } catch (error) {
    console.error('Error using streak hook:', error);
    liveStreak = currentStreak; // Fall back to the prop value
  }

  const [validatedStreak, setValidatedStreak] = useState(liveStreak);
  
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
    let cancelled = false;
  
    /** ask the manager if the current streak is broken */
    const checkBroken = async () => {
      try {
        const broken = await streakManager.isStreakBroken();
        const firstTime = streakManager.streakCache.routineDates.length === 0;
        if (!cancelled) {
          setIsStreakBroken(broken && !firstTime);
          setValidatedStreak(broken ? 0 : liveStreak);   // <-- NEW
        }
      } catch (e) {
        console.warn('StatsOverview: isStreakBroken()', e);
        if (!cancelled) setIsStreakBroken(false);
      }
    };
  
    checkBroken();                 // run once
  }, [liveStreak]);                // …and every time the li
  
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
  
  // Check if the streak is at risk and can be saved with a flexSave
  useEffect(() => {
    const checkStreakStatus = async () => {
      // Only check if streak is meaningful (5+ days), not protected, and not completed today
      if (validatedStreak >= 5 && !flexSaveActive && !isTodayComplete) {
        const status = await streakManager.checkStreakStatus();
        setStreakAtRisk(status.canSaveYesterdayStreak);
      } else {
        setStreakAtRisk(false);
      }
    };
    
    checkStreakStatus();
  }, [validatedStreak, flexSaveActive, isTodayComplete]);

  // For streak of 5+ days, show a warning indicator if today's activity isn't done
  const showWarning = validatedStreak >= 5 && !isTodayComplete && !streakAtRisk && !flexSaveActive;

  // Get the actual streak to display - use the validated streak value
  const displayStreak = isStreakBroken ? 0 : validatedStreak;

  return (
    <View style={{ backgroundColor: isDark || isSunset ? theme.background : 'transparent' }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>
          Your Progress
        </Text>
        <Text style={[styles.headerSubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
          Keep up the great work!
        </Text>
      </View>
      
      <View style={styles.statsGrid}>
        {/* Total Minutes Stat */}
        <View style={[styles.statCard, { 
          backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF',
          shadowColor: isDark || isSunset ? 'rgba(0,0,0,0.5)' : '#000',
          borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'transparent',
          borderWidth: isDark || isSunset ? 1 : 0
        }]}>
          <View style={[styles.statIconContainer, { 
            backgroundColor: isDark || isSunset ? 'rgba(76, 175, 80, 0.2)' : '#F0F0F0'
          }]}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#4CAF50" />
          </View>
          <Text style={[styles.statValue, { color: isDark || isSunset ? theme.text : '#333' }]}>
            {totalMinutes}
          </Text>
          <Text style={[styles.statLabel, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
            Total Minutes
          </Text>
        </View>
        
        {/* Streak Stat */}
        <View style={[styles.statCard, { 
          backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF',
          shadowColor: isDark || isSunset ? 'rgba(0,0,0,0.5)' : '#000',
          borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'transparent',
          borderWidth: isDark || isSunset ? 1 : 0,
          overflow: 'hidden'
        }]}>
          
          <View style={[styles.statIconContainer, { 
            backgroundColor: isDark || isSunset ? 
              (flexSaveActive ? 'rgba(33, 150, 243, 0.2)' : 
                (streakAtRisk ? 'rgba(255, 193, 7, 0.2)' :
                  (showWarning ? 'rgba(255, 87, 34, 0.2)' : 
                    (isStreakBroken ? 'rgba(255, 87, 34, 0.1)' :
                      (meetsLevelRequirement ? 'rgba(159, 217, 255, 0.15)' : 'rgba(255, 152, 0, 0.2)'))))) 
              : (flexSaveActive ? 'rgba(33, 150, 243, 0.15)' : 
                 (streakAtRisk ? 'rgba(255, 193, 7, 0.15)' : 
                   (showWarning ? 'rgba(255, 87, 34, 0.1)' :
                     (isStreakBroken ? 'rgba(255, 87, 34, 0.05)' :
                       (meetsLevelRequirement ? 'rgba(159, 217, 255, 0.1)' : '#F0F0F0')))))
          }]}>
            <MaterialCommunityIcons 
              name={
                flexSaveActive ? "timer-sand" : 
                streakAtRisk ? "shield" : 
                showWarning ? "alert" : 
                isStreakBroken ? "refresh" :
                meetsLevelRequirement ? "star" : "star-outline"
              } 
              size={20} 
              color={
                flexSaveActive ? "#2196F3" : 
                streakAtRisk ? "#FFC107" : 
                showWarning ? "#FF5722" : 
                isStreakBroken ? "#FF5722" :
                meetsLevelRequirement ? "#2196F3" : "#FF9800"
              } 
            />
          </View>
          
          {streakAtRisk && meetsLevelRequirement ? (
            <Animated.Text 
              style={[
                styles.statValue, 
                { 
                  color: isDark || isSunset ? '#FFC107' : '#333', // Yellow in dark mode, dark in light mode
                  transform: [{ scale: pulseAnim }],
                  textShadowColor: isDark || isSunset ? 'rgba(255, 193, 7, 0.6)' : 'rgba(0, 0, 0, 0.2)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: isDark || isSunset ? 4 : 2,
                  fontWeight: 'bold'
                }
              ]}
            >
              {displayStreak}
            </Animated.Text>
          ) : (
            <Text style={[styles.statValue, { 
              color: isDark || isSunset ? theme.text : '#333',
              opacity: isStreakBroken ? 0.7 : 1
            }]}>
              {displayStreak}
            </Text>
          )}
          
          <Text style={[styles.statLabel, { 
            color: isDark || isSunset ? theme.textSecondary : '#666'
          }]}>
            {isStreakBroken ? "Streak Reset" :
             "Day Streak"
             + (flexSaveActive ? " (Protected)" : 
                (streakAtRisk && canUseFlexSave ? " (At Risk)" : 
                 (showWarning ? " (at risk)" : 
                  "")))}
          </Text>
          
          {isStreakBroken && (
            <View style={styles.streakResetIndicator}>
              <MaterialCommunityIcons name="refresh" size={14} color="#FF5722" />
              <Text style={[styles.streakResetText, { color: '#FF5722' }]}>
                New streak starting today
              </Text>
            </View>
          )}
          
          {streakAtRisk && canUseFlexSave && (
            <View style={styles.streakRiskIndicator}>
              <MaterialCommunityIcons name="shield" size={14} color="#FFC107" />
              <Text style={[styles.streakRiskText, { color: '#FFC107' }]}>
                Use Flex Save to save!
              </Text>
            </View>
          )}
          
          {meetsLevelRequirement && !flexSaveActive && !streakAtRisk && !isStreakBroken && (
            <View style={styles.frostReadyIndicator}>
              <MaterialCommunityIcons name="timer-sand" size={12} color="#2196F3" />
              <Text style={styles.frostReadyText}>Flex Save Available</Text>
            </View>
          )}
          
          {flexSaveActive && (
            <View style={styles.flexSaveIndicator}>
              <MaterialCommunityIcons name="timer-sand" size={14} color="#2196F3" />
              <Text style={[styles.flexSaveText, { color: '#2196F3' }]}>
                Flex Save Applied
              </Text>
            </View>
          )}
        </View>
        
        {/* Routines Stat */}
        <View style={[styles.statCard, { 
          backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF',
          shadowColor: isDark || isSunset ? 'rgba(0,0,0,0.5)' : '#000',
          borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'transparent',
          borderWidth: isDark || isSunset ? 1 : 0
        }]}>
          <View style={[styles.statIconContainer, { 
            backgroundColor: isDark || isSunset ? 'rgba(33, 150, 243, 0.2)' : '#F0F0F0'
          }]}>
            <MaterialCommunityIcons name="weight-lifter" size={20} color="#2196F3" />
          </View>
          <Text style={[styles.statValue, { color: isDark || isSunset ? theme.text : '#333' }]}>
            {totalRoutines}
          </Text>
          <Text style={[styles.statLabel, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
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
  flexSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    zIndex: 2,
  },
  flexSaveText: {
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
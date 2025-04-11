import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import * as storageService from '../../services/storageService';

interface StreakDisplayProps {
  currentStreak: number;
  onPremiumPress?: () => void;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({ 
  currentStreak = 0,
  onPremiumPress
}) => {
  const { theme, isDark } = useTheme();
  const { isPremium } = usePremium();
  const [streak, setStreak] = useState(currentStreak);
  const [freezeCount, setFreezeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Load streak directly from storage - no complex calculations
  useEffect(() => {
    const loadStreak = async () => {
      try {
        setLoading(true);
        
        // Get direct value from storage
        const userProgress = await storageService.getUserProgress();
        
        // Use streak directly from storage
        const storedStreak = userProgress.statistics?.currentStreak || 0;
        setStreak(storedStreak);
        
        // Get freeze count if premium
        if (isPremium && userProgress.rewards?.streak_freezes?.uses !== undefined) {
          setFreezeCount(userProgress.rewards.streak_freezes.uses);
        }
      } catch (error) {
        console.error('Simple streak load error:', error);
        // Fall back to prop value
        setStreak(currentStreak);
      } finally {
        setLoading(false);
      }
    };
    
    loadStreak();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadStreak, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Show loading indicator while data is loading
  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: isDark ? theme.cardBackground : '#FFF'}]}>
        <ActivityIndicator size="small" color={isDark ? '#90CAF9' : '#2196F3'} />
        <Text style={[styles.loadingText, {color: theme.text}]}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, {backgroundColor: isDark ? theme.cardBackground : '#FFF'}]}>
      <View style={styles.upperContainer}>
        <View style={[
          styles.streakBadge,
          { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)' }
        ]}>
          <Ionicons 
            name="flame" 
            size={30} 
            color={isDark ? '#FFB74D' : '#FF9800'} 
            style={styles.fireIcon}
          />
          <View>
            <Text style={[styles.streakText, { color: theme.text }]}>
              {streak} Day{streak !== 1 ? 's' : ''} Streak
            </Text>
            <Text style={[styles.streakSubtext, { color: isDark ? theme.textSecondary : '#757575' }]}>
              Keep going strong!
            </Text>
          </View>
        </View>
        
        {/* Freeze count display for premium users */}
        {isPremium && (
          <View style={styles.freezeCountContainer}>
            <View style={[
              styles.freezeBadge,
              { backgroundColor: isDark ? 'rgba(144, 202, 249, 0.2)' : 'rgba(144, 202, 249, 0.1)' }
            ]}>
              <Ionicons name="snow" size={16} color={isDark ? '#90CAF9' : '#2196F3'} />
              <Text 
                style={[
                  styles.freezeCount, 
                  { color: freezeCount > 0 ? (isDark ? '#90CAF9' : '#2196F3') : (isDark ? '#EF5350' : '#F44336') }
                ]}
              >
                {freezeCount}
              </Text>
            </View>
          </View>
        )}
        
        {/* Premium button for non-premium users */}
        {!isPremium && (
          <TouchableOpacity 
            style={[
              styles.premiumButton,
              { backgroundColor: isDark ? 'rgba(144, 202, 249, 0.2)' : 'rgba(144, 202, 249, 0.1)' }
            ]}
            onPress={onPremiumPress}
          >
            <Text style={[styles.premiumText, { color: isDark ? '#90CAF9' : '#2196F3' }]}>
              Premium
            </Text>
            <Ionicons 
              name="lock-closed" 
              size={12} 
              color={isDark ? '#90CAF9' : '#2196F3'} 
              style={styles.lockIcon}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Simple streak visualization */}
      <View style={styles.streakCircleContainer}>
        {[...Array(7)].map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.streakCircle,
              { 
                backgroundColor: i < Math.min(streak, 7) 
                  ? (isDark ? '#81C784' : '#4CAF50') 
                  : (isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0')
              }
            ]}
          />
        ))}
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
  upperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  fireIcon: {
    marginRight: 10,
  },
  streakText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  streakSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  freezeCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freezeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  freezeCount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lockIcon: {
    marginLeft: 4,
  },
  streakCircleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  streakCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default StreakDisplay; 
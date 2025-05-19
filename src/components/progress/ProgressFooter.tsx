import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useGamification, gamificationEvents, XP_UPDATED_EVENT } from '../../hooks/progress/useGamification';

interface ProgressFooterProps {
  progressSystemData?: any; // Make this optional since we'll use the hook directly
  isDark: boolean;
  isSunset: boolean;
  onResetProgress?: () => void;
}

/**
 * Footer component for the Progress Screen
 */
export const ProgressFooter: React.FC<ProgressFooterProps> = ({ 
  progressSystemData, 
  isDark,
  isSunset,
  onResetProgress
}) => {
  // Use the gamification hook directly to get real-time XP and level data
  const { totalXP, level, refreshData } = useGamification();
  
  // Local state to force update when XP changes
  const [lastXpUpdate, setLastXpUpdate] = useState(Date.now());
  
  // Listen for XP update events, especially from challenge claims
  useEffect(() => {
    const handleXpUpdate = (data: any) => {
      console.log('XP Updated:', data);
      // Force a re-render
      setLastXpUpdate(Date.now());
      // Refresh gamification data to get the most current values
      refreshData();
    };
    
    // Subscribe to XP update events
    gamificationEvents.on(XP_UPDATED_EVENT, handleXpUpdate);
    
    // Cleanup listener on unmount
    return () => {
      gamificationEvents.off(XP_UPDATED_EVENT, handleXpUpdate);
    };
  }, [refreshData]);
  
  // Use the hook data first, fall back to props if needed
  const userLevel = level || progressSystemData?.user?.level || progressSystemData?.level || 1;
  const userXP = totalXP || progressSystemData?.user?.totalXP || progressSystemData?.totalXP || 0;
  
  if (isDark || isSunset) {
    return (
      <View style={styles.footer}>
        <LinearGradient
          colors={isSunset ? 
            ['rgba(50, 30, 64, 0.8)', 'rgba(32, 18, 41, 0.9)'] : 
            ['#111827', '#1F2937']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.darkFooterContent, 
            isSunset && styles.sunsetFooterContent
          ]}
        >
          <View style={[
            styles.darkLevelBadge,
            isSunset && styles.sunsetLevelBadge
          ]}>
            <Text style={[
              styles.darkLevelText,
              isSunset && styles.sunsetLevelText
            ]}>{userLevel}</Text>
          </View>
          <View style={styles.darkTextContainer}>
            <Text style={[
              styles.darkFooterTitle,
              isSunset && styles.sunsetFooterTitle
            ]}>
              FlexBreak Premium
            </Text>
            <Text style={[
              styles.darkFooterXP,
              isSunset && styles.sunsetFooterXP
            ]}>
              {userXP.toLocaleString()} XP
            </Text>
          </View>
          <View style={[
            styles.darkIconContainer,
            isSunset && styles.sunsetIconContainer
          ]}>
            <Ionicons name="trophy" size={20} color={isSunset ? "#FF8C5A" : "#F59E0B"} />
          </View>
        </LinearGradient>
      </View>
    );
  }
  
  return (
    <View style={styles.footer}>
      <Text style={[styles.footerText, { color: isDark || isSunset ? '#FFFFFF' : '#666' }]}>
        FlexBreak Premium • Level {userLevel} • {userXP.toLocaleString()} XP
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  darkFooterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    width: '100%',
  },
  darkLevelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  darkLevelText: {
    color: '#F59E0B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  darkTextContainer: {
    flex: 1,
  },
  darkFooterTitle: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
  },
  darkFooterXP: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  darkIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devTools: {
    marginTop: 12,
    alignItems: 'center',
  },
  testingButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  testingButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  sunsetFooterContent: {
    // Add sunset-specific styles here
  },
  sunsetLevelBadge: {
    // Add sunset-specific styles here
  },
  sunsetLevelText: {
    // Add sunset-specific styles here
  },
  sunsetFooterTitle: {
    // Add sunset-specific styles here
  },
  sunsetFooterXP: {
    // Add sunset-specific styles here
  },
  sunsetIconContainer: {
    // Add sunset-specific styles here
  },
});

export default ProgressFooter; 
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useGamification, gamificationEvents, XP_UPDATED_EVENT } from '../../hooks/progress/useGamification';

interface ProgressFooterProps {
  progressSystemData?: any; // Make this optional since we'll use the hook directly
  isDark: boolean;
  onResetProgress?: () => void;
}

/**
 * Footer component for the Progress Screen
 */
export const ProgressFooter: React.FC<ProgressFooterProps> = ({ 
  progressSystemData, 
  isDark,
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
  
  if (isDark) {
    return (
      <View style={styles.footer}>
        <LinearGradient
          colors={['#111827', '#1F2937']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.darkFooterContent}
        >
          <View style={styles.darkLevelBadge}>
            <Text style={styles.darkLevelText}>{userLevel}</Text>
          </View>
          <View style={styles.darkTextContainer}>
            <Text style={styles.darkFooterTitle}>
              FlexBreak Premium
            </Text>
            <Text style={styles.darkFooterXP}>
              {userXP.toLocaleString()} XP
            </Text>
          </View>
          <View style={styles.darkIconContainer}>
            <Ionicons name="trophy" size={20} color="#F59E0B" />
          </View>
        </LinearGradient>
      </View>
    );
  }
  
  return (
    <View style={styles.footer}>
      <Text style={[styles.footerText, { color: isDark ? '#FFFFFF' : '#666' }]}>
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
});

export default ProgressFooter; 
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
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
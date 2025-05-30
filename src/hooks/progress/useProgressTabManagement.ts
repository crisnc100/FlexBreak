import React, { useState, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

// Tab types
export type TabType = 'stats' | 'achievements' | 'challenges' | 'rewards';

/**
 * Custom hook to manage tab state and animations in the ProgressScreen
 */
export function useProgressTabManagement(onTabChange?: (tab: TabType) => void) {
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Handle tab change with animation
  const handleTabChange = useCallback((tab: TabType) => {
    if (tab === activeTab) return; // Skip if same tab
    
    console.log(`Tab changed to: ${tab}`);
    
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true
    }).start(() => {
      // Change tab
      setActiveTab(tab);
      
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      }).start();
      
      // Call optional callback
      if (onTabChange) {
        setTimeout(() => {
          onTabChange(tab);
        }, 200);
      }
    });
  }, [activeTab, fadeAnim, onTabChange]);
  
  return { 
    activeTab, 
    fadeAnim, 
    handleTabChange
  };
} 
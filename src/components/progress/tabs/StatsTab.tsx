import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressStats } from '../../../hooks/progress/useProgressData';
import StatsOverview from '../StatsOverview';
import ConsistencyInsights from '../ConsistencyInsights';
import WeeklyActivity from '../WeeklyActivity';
import FocusAreas from '../FocusAreas';
import StretchingPatterns from '../StretchingPatterns';
import TipSection from '../TipSection';
import FlexSaveCard from '../FlexSaveCard';

interface StatsTabProps {
  hasHiddenRoutinesOnly: boolean;
  stats: ProgressStats;
  orderedDayNames: string[];
  mostActiveDay: string;
  isPremium: boolean;
  canAccessFeature: (feature: string) => boolean;
  theme: any;
  isDark: boolean;
  isSunset: boolean;
  flexSaveActive?: boolean;
  userLevel?: number;
}

/**
 * Stats tab content component for the Progress Screen
 */
export const StatsTab: React.FC<StatsTabProps> = ({
  hasHiddenRoutinesOnly,
  stats,
  orderedDayNames,
  mostActiveDay,
  isPremium,
  canAccessFeature,
  theme,
  isDark,
  isSunset,
  flexSaveActive = false,
  userLevel = 1
}) => {
  return (
    <>
      <StatsOverview
        totalMinutes={stats.totalMinutes}
        currentStreak={stats.currentStreak}
        totalRoutines={stats.totalRoutines}
        isTodayComplete={stats.isTodayComplete}
        theme={theme}
        isDark={isDark}
        isSunset={isSunset}
        flexSaveActive={flexSaveActive}
        userLevel={userLevel}
      />
      
      {/* Only show streak flexSave card for premium users with level 6+ */}
      {isPremium && canAccessFeature('flex_saves') && (
        <FlexSaveCard 
          currentStreak={stats.currentStreak} 
          isDark={isDark}
          isSunset={isSunset}
        />
      )}
      
      <ConsistencyInsights
        activeRoutineDays={stats.activeRoutineDays}
        mostActiveDay={mostActiveDay}
      />
      
      <WeeklyActivity
        weeklyActivity={stats.weeklyActivity}
        orderedDayNames={orderedDayNames}
      />
      
      <FocusAreas
        areaBreakdown={stats.areaBreakdown}
        totalRoutines={stats.totalRoutines}
      />
      
      <StretchingPatterns
        dayOfWeekBreakdown={stats.dayOfWeekBreakdown}
        dayNames={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
        mostActiveDay={mostActiveDay}
      />
      
      <TipSection
        currentStreak={stats.currentStreak}
        isDark={isDark}
        isSunset={isSunset}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // Styles removed as they were for the hidden routines notice that's been removed
});

export default StatsTab; 
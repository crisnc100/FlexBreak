import React from 'react';
import { ProgressStats } from '../../../hooks/progress/useProgressData';
import Achievements from '../Achievements';

interface AchievementsTabProps {
  stats: ProgressStats;
  progressSystemData: any;
}

/**
 * Achievements tab content component for the Progress Screen
 */
export const AchievementsTab: React.FC<AchievementsTabProps> = ({
  stats,
  progressSystemData
}) => {
  return (
    <Achievements
      totalRoutines={stats.totalRoutines}
      currentStreak={stats.currentStreak}
      areaBreakdown={stats.areaBreakdown}
      totalXP={progressSystemData?.totalXP || 0}
      level={progressSystemData?.level || 1}
      totalMinutes={stats.totalMinutes}
      completedAchievements={progressSystemData?.achievements ? 
        Object.values(progressSystemData.achievements || {})
          .filter((a: any) => a.completed)
          .map((a: any) => ({
            id: a.id,
            title: a.title,
            xp: a.xp,
            dateCompleted: a.dateCompleted || new Date().toISOString()
          })) : 
        []}
    />
  );
};

export default AchievementsTab; 
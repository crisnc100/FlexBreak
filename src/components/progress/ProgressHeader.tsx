import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../hooks/progress/useGamification';
import LevelProgressBar from '../progress/LevelProgressBar';

interface ProgressHeaderProps {
  title?: string;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({ title = 'Your Progress' }) => {
  const { theme, isDark, isSunset } = useTheme();
  const { totalXP, level, xpToNextLevel, percentToNextLevel, gamificationSummary } = useGamification();
  
  // Get level info from gamification summary
  const currentLevelInfo = React.useMemo(() => {
    return gamificationSummary?.levelInfo?.currentLevel || { title: `Level ${level}` };
  }, [gamificationSummary, level]);
  
  const nextLevelInfo = React.useMemo(() => {
    return gamificationSummary?.levelInfo?.nextLevel || { title: `Level ${level + 1}` };
  }, [gamificationSummary, level]);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      
      <LevelProgressBar
        currentLevel={level}
        levelTitle={currentLevelInfo?.title}
        totalXP={totalXP}
        xpProgress={percentToNextLevel}
        xpToNextLevel={xpToNextLevel}
        nextLevelTitle={nextLevelInfo?.title}
        compact={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
});

export default ProgressHeader; 
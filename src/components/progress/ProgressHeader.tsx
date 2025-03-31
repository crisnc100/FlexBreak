import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../hooks/progress/useGamification';
import LevelProgressBar from '../progress/LevelProgressBar';

interface ProgressHeaderProps {
  title?: string;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({ title = 'Your Progress' }) => {
  const { theme, isDark } = useTheme();
  const { totalXP, level, getLevelInfo, getXpToNextLevel, getLevelProgress } = useGamification();
  
  // Uses eager loading approach for better UX
  const [currentLevelInfo, setCurrentLevelInfo] = React.useState<any>(null);
  const [nextLevelInfo, setNextLevelInfo] = React.useState<any>(null);
  const [xpProgress, setXpProgress] = React.useState<number>(0);
  const [xpToNext, setXpToNext] = React.useState<number>(0);
  
  React.useEffect(() => {
    async function loadData() {
      try {
        // Get current level info
        const currentInfo = await getLevelInfo(level);
        setCurrentLevelInfo(currentInfo);
        
        // Get next level info
        const nextInfo = await getLevelInfo(level + 1);
        setNextLevelInfo(nextInfo);
        
        // Get XP to next level
        const xpToNextLevel = await getXpToNextLevel();
        setXpToNext(xpToNextLevel);
        
        // Get progress percentage
        const progress = await getLevelProgress(totalXP, level);
        setXpProgress(progress);
      } catch (error) {
        console.error('Error loading level data:', error);
      }
    }
    
    loadData();
  }, [level, totalXP, getLevelInfo, getXpToNextLevel, getLevelProgress]);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      
      {currentLevelInfo && (
        <LevelProgressBar
          currentLevel={level}
          levelTitle={currentLevelInfo?.title}
          totalXP={totalXP}
          xpProgress={xpProgress}
          xpToNextLevel={xpToNext}
          nextLevelTitle={nextLevelInfo?.title}
          compact={true}
        />
      )}
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
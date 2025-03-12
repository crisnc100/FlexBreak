import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Enhanced achievement definitions with categories, XP rewards, and levels
const ACHIEVEMENTS = [
  // Beginner achievements
  {
    id: 'first_stretch',
    title: 'First Stretch!',
    description: 'Completed your first stretching routine',
    icon: 'star-outline',
    requirement: 1,
    xp: 50,
    category: 'beginner'
  },
  {
    id: 'three_day_streak',
    title: 'Getting Into It',
    description: '3-day streak achieved',
    icon: 'flame-outline',
    requirement: 3,
    xp: 100,
    category: 'beginner'
  },
  {
    id: 'week_streak',
    title: 'Weekly Warrior',
    description: '7-day streak achieved',
    icon: 'calendar-outline',
    requirement: 7,
    xp: 200,
    category: 'beginner'
  },
  
  // Intermediate achievements
  {
    id: 'variety_master',
    title: 'Variety Master',
    description: 'Tried all body areas',
    icon: 'body-outline',
    requirement: 6, // number of different areas
    xp: 150,
    category: 'intermediate'
  },
  {
    id: 'dedication',
    title: 'Dedication',
    description: 'Completed 10 routines',
    icon: 'trophy-outline',
    requirement: 10,
    xp: 200,
    category: 'intermediate'
  },
  {
    id: 'consistency_champion',
    title: 'Consistency Champion',
    description: 'Completed a routine 5 days in a row',
    icon: 'checkmark-circle-outline',
    requirement: 5,
    xp: 250,
    category: 'intermediate'
  },
  
  // Advanced achievements
  {
    id: 'stretch_master',
    title: 'Stretch Master',
    description: 'Completed 30 routines',
    icon: 'ribbon-outline',
    requirement: 30,
    xp: 300,
    category: 'advanced'
  },
  {
    id: 'month_streak',
    title: 'Monthly Milestone',
    description: '30-day streak achieved',
    icon: 'calendar-number-outline',
    requirement: 30,
    xp: 500,
    category: 'advanced'
  },
  {
    id: 'area_expert',
    title: 'Area Expert',
    description: 'Completed 15 routines in one body area',
    icon: 'fitness-outline',
    requirement: 15,
    xp: 350,
    category: 'advanced'
  },
  
  // Elite achievements
  {
    id: 'stretch_guru',
    title: 'Stretch Guru',
    description: 'Completed 100 routines',
    icon: 'medal-outline',
    requirement: 100,
    xp: 1000,
    category: 'elite'
  },
  {
    id: 'iron_flexibility',
    title: 'Iron Flexibility',
    description: '60-day streak achieved',
    icon: 'infinite-outline',
    requirement: 60,
    xp: 1500,
    category: 'elite'
  }
];

// Level definitions
const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Stretching Novice' },
  { level: 2, xpRequired: 200, title: 'Flexibility Enthusiast' },
  { level: 3, xpRequired: 500, title: 'Stretching Regular' },
  { level: 4, xpRequired: 1000, title: 'Flexibility Pro' },
  { level: 5, xpRequired: 2000, title: 'Stretching Expert' },
  { level: 6, xpRequired: 3500, title: 'Flexibility Master' },
  { level: 7, xpRequired: 5000, title: 'Stretching Guru' },
  { level: 8, xpRequired: 7500, title: 'Flexibility Champion' },
  { level: 9, xpRequired: 10000, title: 'Stretching Legend' },
  { level: 10, xpRequired: 15000, title: 'Ultimate Flexibility Master' }
];

// Achievement card component
const AchievementCard = ({ achievement, isUnlocked, onPress }) => (
  <TouchableOpacity 
    style={[styles.achievementCard, !isUnlocked && styles.achievementLocked]}
    onPress={() => onPress(achievement)}
  >
    <View style={[styles.achievementIconContainer, isUnlocked && styles.achievementIconContainerUnlocked]}>
      <Ionicons 
        name={achievement.icon} 
        size={24} 
        color={isUnlocked ? '#FFFFFF' : '#999'} 
      />
    </View>
    <Text style={[styles.achievementTitle, !isUnlocked && styles.achievementLockedText]}>
      {achievement.title}
    </Text>
    <Text style={styles.achievementDescription}>
      {achievement.description}
    </Text>
    {isUnlocked && (
      <View style={styles.xpBadge}>
        <Text style={styles.xpText}>+{achievement.xp} XP</Text>
      </View>
    )}
  </TouchableOpacity>
);

interface AchievementsProps {
  achievements: any[];
  completedAchievements: any[];
  upcomingAchievements: any[];
}

const Achievements: React.FC<AchievementsProps> = ({
  achievements,
  completedAchievements,
  upcomingAchievements
}) => {
  // Calculate which achievements are unlocked
  const unlockedAchievements = ACHIEVEMENTS.map(achievement => {
    // Check if this achievement is in the completed list
    const isUnlocked = completedAchievements.some(a => a.id === achievement.id);
    
    return { ...achievement, isUnlocked };
  });
  
  // Calculate total XP
  const totalXP = completedAchievements
    .reduce((sum, a) => sum + (a.xpReward || 0), 0);
  
  // Determine current level
  const currentLevel = LEVELS.reduce((highest, level) => {
    if (totalXP >= level.xpRequired && level.level > highest.level) {
      return level;
    }
    return highest;
  }, LEVELS[0]);
  
  // Calculate XP for next level
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
  const xpForNextLevel = nextLevel ? nextLevel.xpRequired : currentLevel.xpRequired;
  const xpProgress = nextLevel ? (totalXP - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired) : 1;
  
  // Handle achievement press
  const handleAchievementPress = (achievement) => {
    // In the future, this could show a detailed modal with more info about the achievement
    console.log('Achievement pressed:', achievement.title);
  };
  
  return (
    <View style={styles.container}>
      {/* Level progress section */}
      <View style={styles.levelSection}>
        <View style={styles.levelHeader}>
          <View>
            <Text style={styles.levelTitle}>Level {currentLevel.level}</Text>
            <Text style={styles.levelSubtitle}>{currentLevel.title}</Text>
          </View>
          <View style={styles.xpContainer}>
            <Ionicons name="flash" size={16} color="#FFD700" />
            <Text style={styles.xpTotal}>{totalXP} XP</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <LinearGradient
            colors={['#4CAF50', '#8BC34A']}
            style={[styles.progressBar, { width: `${xpProgress * 100}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        
        {nextLevel && (
          <Text style={styles.nextLevelText}>
            {xpForNextLevel - totalXP} XP to Level {nextLevel.level}: {nextLevel.title}
          </Text>
        )}
      </View>
      
      {/* Achievements section */}
      <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        
        {/* Beginner achievements */}
        <Text style={styles.categoryTitle}>Beginner</Text>
        <View style={styles.achievementsContainer}>
          {unlockedAchievements
            .filter(a => a.category === 'beginner')
            .map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isUnlocked={achievement.isUnlocked}
                onPress={handleAchievementPress}
              />
            ))
          }
        </View>
        
        {/* Intermediate achievements */}
        <Text style={styles.categoryTitle}>Intermediate</Text>
        <View style={styles.achievementsContainer}>
          {unlockedAchievements
            .filter(a => a.category === 'intermediate')
            .map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isUnlocked={achievement.isUnlocked}
                onPress={handleAchievementPress}
              />
            ))
          }
        </View>
        
        {/* Advanced achievements */}
        <Text style={styles.categoryTitle}>Advanced</Text>
        <View style={styles.achievementsContainer}>
          {unlockedAchievements
            .filter(a => a.category === 'advanced')
            .map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isUnlocked={achievement.isUnlocked}
                onPress={handleAchievementPress}
              />
            ))
          }
        </View>
        
        {/* Elite achievements */}
        <Text style={styles.categoryTitle}>Elite</Text>
        <View style={styles.achievementsContainer}>
          {unlockedAchievements
            .filter(a => a.category === 'elite')
            .map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isUnlocked={achievement.isUnlocked}
                onPress={handleAchievementPress}
              />
            ))
          }
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  levelSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  levelSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  xpTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  progressContainer: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  nextLevelText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  achievementsSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  achievementLocked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIconContainerUnlocked: {
    backgroundColor: '#4CAF50',
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementLockedText: {
    color: '#999',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  xpBadge: {
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD600',
  },
  xpText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF8F00',
  },
});

export default Achievements; 
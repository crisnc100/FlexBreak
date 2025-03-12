import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Enhanced achievement definitions with categories, XP rewards, and levels
const ACHIEVEMENTS = [
  // Beginner achievements (0-500 XP)
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
  {
    id: 'five_routines',
    title: 'Getting Started',
    description: 'Completed 5 stretching routines',
    icon: 'checkmark-done-outline',
    requirement: 5,
    xp: 100,
    category: 'beginner'
  },
  {
    id: 'time_investment',
    title: 'Time Investment',
    description: 'Spent 60+ minutes stretching',
    icon: 'time-outline',
    requirement: 60,
    xp: 100,
    category: 'beginner'
  },
  
  // Intermediate achievements (600-2000 XP)
  {
    id: 'variety_master',
    title: 'Variety Master',
    description: 'Tried all 6 body areas',
    icon: 'body-outline',
    requirement: 6,
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
  {
    id: 'dedicated_stretcher',
    title: 'Dedicated Stretcher',
    description: 'Spent 300+ minutes stretching',
    icon: 'hourglass-outline',
    requirement: 300,
    xp: 250,
    category: 'intermediate'
  },
  {
    id: 'two_week_streak',
    title: 'Fortnight Flexer',
    description: '14-day streak achieved',
    icon: 'flame-outline',
    requirement: 14,
    xp: 300,
    category: 'intermediate'
  },
  {
    id: 'twenty_routines',
    title: 'Regular Stretcher',
    description: 'Completed 20 routines',
    icon: 'ribbon-outline',
    requirement: 20,
    xp: 250,
    category: 'intermediate'
  },
  
  // Advanced achievements (2000-5000 XP)
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
  {
    id: 'advanced_stretcher',
    title: 'Advanced Stretcher',
    description: 'Completed 10 advanced routines',
    icon: 'trending-up-outline',
    requirement: 10,
    xp: 400,
    category: 'advanced'
  },
  {
    id: 'thousand_minutes',
    title: 'Time Dedication',
    description: 'Spent 1000+ minutes stretching',
    icon: 'timer-outline',
    requirement: 1000,
    xp: 500,
    category: 'advanced'
  },
  {
    id: 'fifty_routines',
    title: 'Flexibility Devotee',
    description: 'Completed 50 routines',
    icon: 'medal-outline',
    requirement: 50,
    xp: 450,
    category: 'advanced'
  },
  
  // Elite achievements (5000+ XP)
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
  },
  {
    id: 'yearly_flexibility',
    title: 'Year of Flexibility',
    description: '365-day streak achieved',
    icon: 'calendar-outline',
    requirement: 365,
    xp: 2000,
    category: 'elite'
  },
  {
    id: 'master_of_all_areas',
    title: 'Master of All Areas',
    description: 'Complete 30 routines in each body area',
    icon: 'grid-outline',
    requirement: 30,
    xp: 1200,
    category: 'elite'
  },
  {
    id: 'flexibility_legend',
    title: 'Flexibility Legend',
    description: 'Complete 200 routines',
    icon: 'star-outline',
    requirement: 200,
    xp: 1800,
    category: 'elite'
  }
];

// Expanded level definitions (20 levels)
const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Stretching Novice' },
  { level: 2, xpRequired: 100, title: 'Flexibility Beginner' },
  { level: 3, xpRequired: 250, title: 'Stretching Enthusiast' },
  { level: 4, xpRequired: 400, title: 'Flexibility Starter' },
  { level: 5, xpRequired: 500, title: 'Stretching Rookie' },
  { level: 6, xpRequired: 750, title: 'Flexibility Student' },
  { level: 7, xpRequired: 1000, title: 'Stretching Regular' },
  { level: 8, xpRequired: 1250, title: 'Flexibility Adept' },
  { level: 9, xpRequired: 1500, title: 'Stretching Practitioner' },
  { level: 10, xpRequired: 2000, title: 'Flexibility Pro' },
  { level: 11, xpRequired: 2500, title: 'Stretching Specialist' },
  { level: 12, xpRequired: 3000, title: 'Flexibility Expert' },
  { level: 13, xpRequired: 3500, title: 'Stretching Veteran' },
  { level: 14, xpRequired: 4000, title: 'Flexibility Virtuoso' },
  { level: 15, xpRequired: 5000, title: 'Stretching Master' },
  { level: 16, xpRequired: 7000, title: 'Flexibility Champion' },
  { level: 17, xpRequired: 9000, title: 'Stretching Elite' },
  { level: 18, xpRequired: 11000, title: 'Flexibility Guru' },
  { level: 19, xpRequired: 13000, title: 'Stretching Grandmaster' },
  { level: 20, xpRequired: 15000, title: 'Ultimate Flexibility Legend' }
];

// Calculate XP for a completed routine
export const calculateRoutineXP = (
  stretchCount: number, 
  hasAdvancedStretch: boolean, 
  extendsStreak: boolean,
  streakLength: number
): number => {
  // Base XP: 10 XP per stretch
  let totalXP = stretchCount * 10;
  
  // Advanced stretch bonus (Premium perk)
  if (hasAdvancedStretch) {
    totalXP += 20;
  }
  
  // Streak bonus: +10 XP per day in streak if extending
  if (extendsStreak && streakLength > 1) {
    totalXP += 10;
  }
  
  return totalXP;
};

// Calculate total XP from achievements
export const calculateTotalXP = (achievements: Array<{id: string; xp: number}>): number => {
  return achievements.reduce((total, achievement) => total + achievement.xp, 0);
};

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

// Define the props interface
interface AchievementsProps {
  totalRoutines: number;
  currentStreak: number;
  areaBreakdown: Record<string, number>;
  totalXP?: number;
  level?: number;
  completedAchievements?: Array<{id: string; title: string; xp: number; dateCompleted: string}>;
}

const Achievements: React.FC<AchievementsProps> = ({
  totalRoutines,
  currentStreak,
  areaBreakdown,
  totalXP = 0,
  level = 1,
  completedAchievements = []
}) => {
  // Log the stats for debugging
  console.log(`Achievements received: ${totalRoutines} routines, streak: ${currentStreak}, areas: ${Object.keys(areaBreakdown).length}`);
  
  // Check if an achievement is already completed
  const isAchievementCompleted = (achievementId) => {
    return completedAchievements.some(a => a.id === achievementId);
  };
  
  // Calculate which achievements are unlocked
  const unlockedAchievements = ACHIEVEMENTS.map(achievement => {
    // First check if it's in the completed list
    if (isAchievementCompleted(achievement.id)) {
      return { ...achievement, isUnlocked: true };
    }
    
    // Otherwise check if it should be unlocked based on the stats
    let isUnlocked = false;
    
    switch (achievement.id) {
      case 'first_stretch':
        isUnlocked = totalRoutines >= achievement.requirement;
        break;
      case 'three_day_streak':
      case 'week_streak':
      case 'consistency_champion':
      case 'month_streak':
      case 'iron_flexibility':
        // All streak-based achievements
        isUnlocked = currentStreak >= achievement.requirement;
        break;
      case 'variety_master':
        // Area variety achievements
        isUnlocked = Object.keys(areaBreakdown).length >= achievement.requirement;
        break;
      case 'dedication':
      case 'stretch_master':
      case 'stretch_guru':
        // Routine count achievements
        isUnlocked = totalRoutines >= achievement.requirement;
        break;
      case 'area_expert':
        // Check if any area has at least the required number of routines
        isUnlocked = Object.values(areaBreakdown).some(count => count >= achievement.requirement);
        break;
      default:
        break;
    }
    
    return { ...achievement, isUnlocked };
  });
  
  // Calculate total XP from unlocked achievements if not provided
  const calculatedTotalXP = totalXP || unlockedAchievements
    .filter(a => a.isUnlocked)
    .reduce((sum, a) => sum + (a.xp || 0), 0);
  
  // Determine current level if not provided
  const currentLevel = level ? 
    LEVELS.find(l => l.level === level) || LEVELS[0] :
    LEVELS.reduce((highest, level) => {
      if (calculatedTotalXP >= level.xpRequired && level.level > highest.level) {
        return level;
      }
      return highest;
    }, LEVELS[0]);
  
  // Calculate XP for next level
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
  const xpForNextLevel = nextLevel ? nextLevel.xpRequired : currentLevel.xpRequired;
  const xpProgress = nextLevel ? 
    (calculatedTotalXP - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired) : 1;
  
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
            <Text style={styles.xpTotal}>{calculatedTotalXP} XP</Text>
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
            {xpForNextLevel - calculatedTotalXP} XP to Level {nextLevel.level}: {nextLevel.title}
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
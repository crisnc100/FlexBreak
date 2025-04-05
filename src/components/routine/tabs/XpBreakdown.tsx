import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { XpBreakdownItem, Achievement } from './types/completedRoutine.types';
import { Theme } from '../../context/ThemeContext';

type XpBreakdownProps = {
  xpBreakdown: XpBreakdownItem[];
  unlockedAchievements: Achievement[];
  hasXpBoost: boolean;
  showAnyLevelUp: boolean;
  theme: Theme;
  animValues: {
    shineAnim: Animated.Value;
  };
};

const XpBreakdown: React.FC<XpBreakdownProps> = ({
  xpBreakdown,
  unlockedAchievements,
  hasXpBoost,
  showAnyLevelUp,
  theme,
  animValues
}) => {
  // Find achievement-related XP in breakdown
  const achievementXp = xpBreakdown.filter(item => 
    item.source === 'achievement' || 
    item.description.includes('Achievement')
  );

  // Define a mapping of achievement sources to icon names
  const getIconForXpSource = (source: string, description: string): string => {
    switch (source) {
      case 'achievement':
        return 'trophy-outline';
      case 'routine':
        return 'fitness-outline';
      case 'first_ever':
        return 'gift-outline';
      case 'streak':
        return 'flame-outline';
      case 'challenge':
        return 'flag-outline';
      default:
        // Try to infer from description
        if (description.includes('Achievement')) return 'trophy-outline';
        if (description.includes('Streak')) return 'flame-outline';
        if (description.includes('Challenge')) return 'flag-outline';
        if (description.includes('First')) return 'gift-outline';
        return 'star-outline';
    }
  };

  // Render a single XP breakdown item
  const renderXpBreakdownItem = (item: XpBreakdownItem, index: number | string) => {
    let iconName = getIconForXpSource(item.source, item.description);
    
    // Check if this specific item has XP boost applied
    const itemHasBoost = item.description.includes('XP Boost Applied') || 
                        item.description.includes('2x XP');

    // Check if this is an achievement-related item
    const isAchievement = item.source === 'achievement' || 
                          item.description.includes('Achievement');
    
    return (
      <View key={`${item.source}-${index}`} style={[
        styles.xpBreakdownItem,
        // Add highlight background for boosted items in light mode
        itemHasBoost && { 
          backgroundColor: 'rgba(255, 193, 7, 0.05)',
          borderRadius: 6,
          padding: 6,
          marginVertical: 2,
          borderLeftWidth: 2,
          borderLeftColor: '#FF8F00'
        },
        // Add special styling for achievement items
        isAchievement && {
          backgroundColor: 'rgba(121, 134, 203, 0.1)',
          borderRadius: 6,
          padding: 6,
          marginVertical: 2,
          borderLeftWidth: 2,
          borderLeftColor: '#3F51B5',
          marginBottom: 4
        }
      ]}>
        {itemHasBoost && (
          <View style={styles.boostBadgeSmall}>
            <Ionicons 
              name="flash" 
              size={showAnyLevelUp ? 10 : 12} 
              color="#FFFFFF" 
            />
            <Text style={styles.boostBadgeTextSmall}>2x</Text>
          </View>
        )}
        
        {/* Achievement badge */}
        {isAchievement && (
          <View style={styles.achievementBadge}>
            <Ionicons 
              name="trophy" 
              size={showAnyLevelUp ? 10 : 12} 
              color="#FFFFFF" 
            />
          </View>
        )}
        
        <Ionicons 
          name={iconName as any} 
          size={showAnyLevelUp ? 14 : 16} 
          color={
            item.amount > 0 
              ? (isAchievement 
                  ? "#3F51B5" 
                  : (itemHasBoost ? "#FF8F00" : "#FF9800")) 
              : theme.textSecondary
          } 
        />
        <Text 
          style={[
            styles.xpAmount, 
            { color: theme.text },
            itemHasBoost && { 
              color: '#FF8F00', 
              textShadowColor: 'rgba(255, 143, 0, 0.4)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 4
            },
            isAchievement && {
              color: '#3F51B5',
              fontWeight: 'bold'
            }
          ]}
        >
          {item.amount > 0 ? (
            <Text>
              <Text style={[
                styles.xpBreakdownValue, 
                itemHasBoost && styles.xpBoostValue,
                isAchievement && styles.achievementXpValue
              ]}>+{item.amount} XP</Text>
              {itemHasBoost && (
                <Text style={[styles.originalXpText, { color: theme.textSecondary }]}> (was +{Math.floor(item.amount / 2)})</Text>
              )}
            </Text>
          ) : (
            <Text style={[styles.xpBreakdownZero, { color: theme.textSecondary }]}>+0 XP</Text>
          )}
          {" "}{item.description.replace(' (2x XP Boost Applied)', '')}
        </Text>
      </View>
    );
  };

  return (
    <View style={[
      styles.xpBreakdownContainer,
      { backgroundColor: theme.backgroundLight },
      showAnyLevelUp && styles.xpBreakdownCompact,
      // Add a subtle border when XP boost is active for better light mode visibility
      hasXpBoost && {
        borderWidth: 1, 
        borderColor: 'rgba(255, 193, 7, 0.5)'
      }
    ]}>
      {hasXpBoost && (
        <View style={styles.xpBoostHeader}>
          <Ionicons name="flash" size={18} color="#FF8F00" />
          <Text style={styles.xpBoostHeaderText}>XP BOOST APPLIED</Text>
          <Animated.View 
            style={[
              styles.shineEffect,
              {
                transform: [{ translateX: animValues.shineAnim }]
              }
            ]} 
          />
        </View>
      )}
      
      {/* First show achievement XP at the top if any */}
      {(achievementXp.length > 0 || unlockedAchievements.length > 0) && (
        <View style={styles.achievementSection}>
          <Text style={styles.achievementSectionTitle}>
            <Ionicons name="trophy" size={16} color="#3F51B5" /> Achievement Bonus XP
          </Text>
          
          {/* Show unlocked achievements first */}
          {unlockedAchievements.map((achievement, index) => (
            <View key={`unlocked-${achievement.id}`} style={[
              styles.xpBreakdownItem,
              {
                backgroundColor: 'rgba(121, 134, 203, 0.1)',
                borderRadius: 6,
                padding: 6,
                marginVertical: 2,
                borderLeftWidth: 2,
                borderLeftColor: '#3F51B5',
                marginBottom: 4
              }
            ]}>
              <View style={styles.achievementBadge}>
                <Ionicons name="trophy" size={showAnyLevelUp ? 10 : 12} color="#FFFFFF" />
              </View>
              <Ionicons 
                name={(achievement.icon as any) || "trophy-outline"} 
                size={showAnyLevelUp ? 14 : 16} 
                color="#3F51B5" 
              />
              <Text style={{
                fontSize: 13,
                fontWeight: 'bold',
                color: '#3F51B5',
              }}>
                <Text style={styles.achievementXpValue}>+{achievement.xp} XP</Text>
                {" "}{achievement.title}
              </Text>
            </View>
          ))}
          
          {/* Then show other achievement XP */}
          {achievementXp
            .filter(item => !unlockedAchievements.some(a => 
              item.description.includes(a.title) || item.description.includes(a.id)
            ))
            .map((item, index) => renderXpBreakdownItem(item, `achievement-${index}`))}
        </View>
      )}
      
      {/* Then show other XP sources */}
      {xpBreakdown
        .filter(item => item.source !== 'achievement' && !item.description.includes('Achievement'))
        .map((item, index) => renderXpBreakdownItem(item, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  xpBreakdownContainer: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  xpBreakdownCompact: {
    padding: 8,
    marginBottom: 15,
  },
  xpBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  xpBreakdownValue: {
    fontWeight: 'bold',
    color: '#FF9800',
  },
  xpBreakdownZero: {
    fontWeight: 'bold',
  },
  xpAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  xpBoostValue: {
    color: '#FF8F00',
    fontWeight: 'bold',
  },
  achievementXpValue: {
    color: '#3F51B5',
    fontWeight: 'bold',
  },
  originalXpText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  xpBoostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  xpBoostHeaderText: {
    color: '#FF8F00',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  shineEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
    overflow: 'hidden'
  },
  boostBadgeSmall: {
    backgroundColor: '#FFC107',
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  boostBadgeTextSmall: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 8,
    marginLeft: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 0.5,
  },
  achievementBadge: {
    backgroundColor: '#3F51B5',
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  achievementSection: {
    marginBottom: 8,
    backgroundColor: 'rgba(121, 134, 203, 0.05)',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(121, 134, 203, 0.2)',
  },
  achievementSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3F51B5',
    marginBottom: 4,
    textAlign: 'center',
  },
});

export default XpBreakdown; 
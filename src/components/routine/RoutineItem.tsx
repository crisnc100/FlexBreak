import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ProgressEntry } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface RoutineItemProps {
  item: ProgressEntry;
  onPress: () => void;
  onDelete: () => void;
  hideLabel?: string; // Optional prop to customize the action label
  theme?: any; // Optional theme prop passed from parent
  isDark?: boolean; // Optional isDark flag passed from parent
  favorite?: boolean; // Whether the routine is favorited
  isCustom?: boolean; // Whether this is a custom routine
}

// Helper function to format dates in a more readable format
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  // Check if it's today
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Check if it's yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Format for other dates
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const RoutineItem: React.FC<RoutineItemProps> = ({ 
  item, 
  onPress, 
  onDelete, 
  hideLabel = 'Delete', // Default to "Delete" for backward compatibility
  theme: propTheme,
  isDark: propIsDark,
  favorite = false,
  isCustom = false
}) => {
  // Use theme from props if provided, otherwise use theme context
  // This allows the component to work both when used standalone and when included in RoutineDashboard
  const themeContext = useTheme();
  const theme = propTheme || themeContext.theme;
  const isDark = propIsDark !== undefined ? propIsDark : themeContext.isDark;

  // Get the formatted date
  const formattedDate = formatDate(item.date);

  // Calculate stretches and breaks if there are customStretches
  let stretchesInfo = '';
  if (item.customStretches) {
    const stretchCount = item.customStretches.filter(s => !s.isRest).length;
    const breakCount = item.customStretches.filter(s => s.isRest).length;
    
    if (stretchCount > 0 && breakCount > 0) {
      stretchesInfo = `${stretchCount} stretches, ${breakCount} breaks`;
    } else if (stretchCount > 0) {
      stretchesInfo = `${stretchCount} stretches`;
    }
  }

  // Render the right swipe actions (hide/delete)
  const renderRightActions = () => (
    <TouchableOpacity 
      style={[styles.actionButton, {
        backgroundColor: hideLabel === 'Hide' ? '#FF9800' : '#F44336'
      }]}
      onPress={onDelete}
    >
      <Ionicons 
        name={hideLabel === 'Hide' ? 'eye-off-outline' : 'trash-outline'} 
        size={24} 
        color="#FFF" 
      />
      <Text style={styles.actionText}>{hideLabel}</Text>
    </TouchableOpacity>
  );

  // Get area icon based on the body area
  const getAreaIcon = (area: string) => {
    switch(area.toLowerCase()) {
      case 'neck': return 'body-outline';
      case 'shoulders': return 'body-outline';
      case 'upper back': return 'body-outline';
      case 'lower back': return 'body-outline';
      case 'arms': return 'body-outline';
      case 'wrists': return 'hand-left-outline';
      case 'legs': return 'body-outline';
      case 'full body': return 'body-outline';
      default: return 'fitness-outline';
    }
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity 
        style={[
          styles.routineItem, 
          { 
            backgroundColor: isDark ? theme.cardBackground : '#FFF',
            borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEE'
          }
        ]}
        onPress={onPress}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.areaIconBackground, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5'
          }]}>
            <Ionicons 
              name={getAreaIcon(item.area)} 
              size={24} 
              color={isDark ? theme.accent : "#4CAF50"} 
            />
          </View>
        </View>
        <View style={styles.routineInfo}>
          <View style={styles.topRow}>
            <Text style={[
              styles.routineArea, 
              { color: isDark ? theme.text : '#333' }
            ]}>
              {item.area}
            </Text>
            <View style={styles.indicatorContainer}>
              {favorite && (
                <Ionicons 
                  name="star" 
                  size={16} 
                  color="#FFD700" 
                  style={styles.favoriteIcon}
                />
              )}
              {isCustom && (
                <Ionicons 
                  name="create-outline" 
                  size={16} 
                  color={isDark ? theme.accent : "#4CAF50"}
                  style={styles.customIcon}
                />
              )}
            </View>
          </View>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons 
                name="time-outline" 
                size={14} 
                color={isDark ? theme.textSecondary : '#666'} 
              />
              <Text style={[
                styles.routineDetail, 
                { color: isDark ? theme.textSecondary : '#666' }
              ]}>
                {item.duration} min
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons 
                name="calendar-outline" 
                size={14} 
                color={isDark ? theme.textSecondary : '#666'} 
              />
              <Text style={[
                styles.routineDetail, 
                { color: isDark ? theme.textSecondary : '#666' }
              ]}>
                {formattedDate}
              </Text>
            </View>
            {stretchesInfo && (
              <View style={styles.detailItem}>
                <Ionicons 
                  name="fitness-outline" 
                  size={14} 
                  color={isDark ? theme.textSecondary : '#666'} 
                />
                <Text style={[
                  styles.routineDetail, 
                  { color: isDark ? theme.textSecondary : '#666' }
                ]}>
                  {stretchesInfo}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons 
          name="play-circle" 
          size={32} 
          color={isDark ? theme.accent : "#4CAF50"} 
        />
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  iconContainer: {
    marginRight: 12,
  },
  areaIconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routineInfo: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineArea: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteIcon: {
    marginLeft: 6,
  },
  customIcon: {
    marginLeft: 6,
  },
  detailsRow: {
    flexDirection: 'column',
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  routineDetail: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  actionButton: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    flexDirection: 'column',
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
  }
});

export default RoutineItem;
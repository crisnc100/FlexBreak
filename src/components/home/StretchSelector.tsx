import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Image,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BodyArea, Stretch, StretchLevel } from '../../types';
import stretches from '../../data/stretches';

interface StretchSelectorProps {
  area: BodyArea;
  duration: string;
  selectedStretches: Stretch[];
  onStretchesSelected: (stretches: Stretch[]) => void;
  onClose: () => void;
}

const StretchSelector: React.FC<StretchSelectorProps> = ({
  area,
  duration,
  selectedStretches,
  onStretchesSelected,
  onClose
}) => {
  const { theme, isDark } = useTheme();
  const [availableStretches, setAvailableStretches] = useState<Stretch[]>([]);
  const [filters, setFilters] = useState<{
    level: StretchLevel | 'all';
  }>({
    level: 'all'
  });

  // Calculate total time based on selected stretches (in seconds)
  const selectedTotalTime = selectedStretches.reduce((total, stretch) => 
    total + (stretch.bilateral ? stretch.duration * 2 : stretch.duration), 0);
  
  // Convert duration string to seconds
  const targetDuration = parseInt(duration) * 60;
  
  // Calculate how much time is left to fill
  const remainingTime = targetDuration - selectedTotalTime;

  // Load available stretches for the selected body area
  useEffect(() => {
    const filtered = stretches.filter(stretch => 
      stretch.tags.includes(area) && 
      (filters.level === 'all' || stretch.level === filters.level)
    );
    setAvailableStretches(filtered);
  }, [area, filters]);

  // Toggle stretch selection
  const toggleStretch = (stretch: Stretch) => {
    const isSelected = selectedStretches.some(s => s.id === stretch.id);
    
    if (isSelected) {
      // Remove from selection
      onStretchesSelected(selectedStretches.filter(s => s.id !== stretch.id));
    } else {
      // Add to selection
      const stretchDuration = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
      
      // Only allow adding if there's enough time left
      if (stretchDuration <= remainingTime || remainingTime >= 0) {
        onStretchesSelected([...selectedStretches, stretch]);
      }
    }
  };

  // Auto-complete the routine with random stretches that fit
  const autoCompleteRoutine = () => {
    if (remainingTime <= 0) return;
    
    // Start with current selection
    const result = [...selectedStretches];
    let timeLeft = remainingTime;
    
    // Create a pool of stretches not already selected
    const stretchPool = [...availableStretches].filter(
      stretch => !selectedStretches.some(s => s.id === stretch.id)
    );
    
    // Randomize the pool
    stretchPool.sort(() => Math.random() - 0.5);
    
    // Add stretches until we can't fit any more
    while (timeLeft > 0 && stretchPool.length > 0) {
      // Find a stretch that fits in the remaining time
      const stretchIndex = stretchPool.findIndex(stretch => {
        const duration = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
        return duration <= timeLeft;
      });
      
      if (stretchIndex === -1) break; // No stretches fit
      
      const selectedStretch = stretchPool[stretchIndex];
      result.push(selectedStretch);
      
      // Update remaining time
      timeLeft -= selectedStretch.bilateral ? 
        selectedStretch.duration * 2 : selectedStretch.duration;
      
      // Remove from pool
      stretchPool.splice(stretchIndex, 1);
    }
    
    onStretchesSelected(result);
  };

  // Format seconds to minutes and seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Render a stretch item
  const renderStretchItem = ({ item }: { item: Stretch }) => {
    const isSelected = selectedStretches.some(s => s.id === item.id);
    const itemDuration = item.bilateral ? item.duration * 2 : item.duration;
    
    return (
      <TouchableOpacity
        style={[
          styles.stretchItem,
          { 
            backgroundColor: isDark ? 
              (isSelected ? theme.accent + '30' : theme.backgroundLight) : 
              (isSelected ? theme.accent + '15' : '#fff')
          }
        ]}
        onPress={() => toggleStretch(item)}
        disabled={!isSelected && itemDuration > remainingTime && remainingTime < 0}
      >
        <View style={styles.stretchInfo}>
          <Text style={[styles.stretchName, { color: theme.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.stretchDetails, { color: theme.textSecondary }]}>
            {item.level.charAt(0).toUpperCase() + item.level.slice(1)} • 
            {item.bilateral ? ` ${formatTime(item.duration)} (each side)` : ` ${formatTime(item.duration)}`}
          </Text>
        </View>
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
          ) : (
            <Ionicons name="add-circle-outline" size={24} color={theme.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#f5f5f5' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Select Stretches
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.progressBar, { backgroundColor: isDark ? theme.backgroundLight : '#eee' }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              backgroundColor: theme.accent,
              width: `${Math.min(100, (selectedTotalTime / targetDuration) * 100)}%`
            }
          ]} 
        />
      </View>
      
      <View style={styles.timeInfo}>
        <Text style={[styles.timeText, { color: theme.text }]}>
          {formatTime(selectedTotalTime)} / {formatTime(targetDuration)}
        </Text>
        <Text style={[styles.remainingText, { color: remainingTime < 0 ? '#FF5252' : theme.textSecondary }]}>
          {remainingTime < 0 ? 
            `Over by ${formatTime(Math.abs(remainingTime))}` : 
            `${formatTime(remainingTime)} remaining`}
        </Text>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { 
                backgroundColor: filters.level === 'all' ? 
                  theme.accent : (isDark ? theme.backgroundLight : '#eee') 
              }
            ]}
            onPress={() => setFilters({...filters, level: 'all'})}
          >
            <Text style={{ 
              color: filters.level === 'all' ? '#fff' : theme.text 
            }}>
              All Levels
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { 
                backgroundColor: filters.level === 'beginner' ? 
                  theme.accent : (isDark ? theme.backgroundLight : '#eee') 
              }
            ]}
            onPress={() => setFilters({...filters, level: 'beginner'})}
          >
            <Text style={{ 
              color: filters.level === 'beginner' ? '#fff' : theme.text 
            }}>
              Beginner
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { 
                backgroundColor: filters.level === 'intermediate' ? 
                  theme.accent : (isDark ? theme.backgroundLight : '#eee') 
              }
            ]}
            onPress={() => setFilters({...filters, level: 'intermediate'})}
          >
            <Text style={{ 
              color: filters.level === 'intermediate' ? '#fff' : theme.text 
            }}>
              Intermediate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { 
                backgroundColor: filters.level === 'advanced' ? 
                  theme.accent : (isDark ? theme.backgroundLight : '#eee') 
              }
            ]}
            onPress={() => setFilters({...filters, level: 'advanced'})}
          >
            <Text style={{ 
              color: filters.level === 'advanced' ? '#fff' : theme.text 
            }}>
              Advanced
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.selectedInfo}>
        <Text style={[styles.selectedText, { color: theme.text }]}>
          {selectedStretches.length} stretches selected
        </Text>
        {remainingTime > 0 && (
          <TouchableOpacity 
            style={[styles.autoCompleteButton, { backgroundColor: theme.accent }]}
            onPress={autoCompleteRoutine}
          >
            <Text style={styles.autoCompleteText}>Auto-Complete</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={availableStretches}
        renderItem={renderStretchItem}
        keyExtractor={item => item.id.toString()}
        style={styles.stretchList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 16,
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  timeText: {
    fontSize: 14,
  },
  remainingText: {
    fontSize: 14,
  },
  filters: {
    padding: 8,
    paddingBottom: 0,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  selectedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedText: {
    fontSize: 14,
  },
  autoCompleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
  },
  autoCompleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stretchList: {
    flex: 1,
    padding: 8,
  },
  stretchItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  stretchInfo: {
    flex: 1,
  },
  stretchName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  stretchDetails: {
    fontSize: 14,
    color: '#666',
  },
  checkboxContainer: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
});

export default StretchSelector; 
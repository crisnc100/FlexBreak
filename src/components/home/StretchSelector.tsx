import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BodyArea, Stretch, StretchLevel, RestPeriod } from '../../types';
import stretches from '../../data/stretches';

interface StretchSelectorProps {
  area: BodyArea;
  duration: string;
  selectedStretches: (Stretch | RestPeriod)[];
  onStretchesSelected: (stretches: (Stretch | RestPeriod)[]) => void;
  onClose: () => void;
}

// Available body areas for multi-selection
const BODY_AREAS: BodyArea[] = [
  'Full Body', 'Lower Back', 'Upper Back & Chest', 'Neck', 'Hips & Legs', 'Shoulders & Arms'
];

const StretchSelector: React.FC<StretchSelectorProps> = ({
  area,
  duration,
  selectedStretches,
  onStretchesSelected,
  onClose
}) => {
  const { theme, isDark } = useTheme();
  const [availableStretches, setAvailableStretches] = useState<Stretch[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<BodyArea[]>([area]);
  const [filters, setFilters] = useState<{
    level: StretchLevel | 'all';
  }>({
    level: 'all'
  });
  const [activeTab, setActiveTab] = useState<'stretches' | 'areas'>('stretches');

  // Calculate total time based on selected stretches (in seconds)
  const selectedTotalTime = selectedStretches.reduce((total, stretch) => {
    if ('isRest' in stretch) {
      return total + stretch.duration;
    }
    return total + (stretch.bilateral ? stretch.duration * 2 : stretch.duration);
  }, 0);
  
  // Convert duration string to seconds
  const targetDuration = parseInt(duration) * 60;
  
  // Calculate how much time is left to fill
  const remainingTime = targetDuration - selectedTotalTime;

  // Get minimum time requirement based on duration
  const getMinimumTimeRequirement = () => {
    const durationValue = parseInt(duration);
    
    // Set minimum required minutes based on selected duration
    let minimumMinutes = 1.5;  // Default for 5-minute routines
    
    if (durationValue === 10) {
      minimumMinutes = 6;
    } else if (durationValue === 15) {
      minimumMinutes = 11;
    }
    
    return minimumMinutes * 60; // Convert to seconds
  };

  // Get minimum time requirement in seconds
  const minimumTimeRequired = getMinimumTimeRequirement();
  
  // Check if current selection meets minimum requirement
  const meetsMinimumRequirement = selectedTotalTime >= minimumTimeRequired;

  // Load available stretches for the selected body areas
  useEffect(() => {
    const filtered = stretches.filter(stretch => 
      // Match any of the selected areas
      selectedAreas.some(selectedArea => 
        stretch.tags.includes(selectedArea)
      ) && 
      // Match the level filter if specified
      (filters.level === 'all' || stretch.level === filters.level)
    );
    
    setAvailableStretches(filtered);
  }, [selectedAreas, filters]);

  // Toggle body area selection
  const toggleArea = (bodyArea: BodyArea) => {
    if (selectedAreas.includes(bodyArea)) {
      // Don't allow removing the last area
      if (selectedAreas.length === 1) return;
      setSelectedAreas(selectedAreas.filter(a => a !== bodyArea));
    } else {
      setSelectedAreas([...selectedAreas, bodyArea]);
    }
  };

  // Toggle stretch selection
  const toggleStretch = (stretch: Stretch) => {
    const isSelected = selectedStretches.some(s => 
      !('isRest' in s) && s.id === stretch.id
    );
    
    if (isSelected) {
      // Remove from selection
      onStretchesSelected(selectedStretches.filter(s => 
        ('isRest' in s) || s.id !== stretch.id
      ));
    } else {
      // Add to selection
      const stretchDuration = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
      
      // Only allow adding if there's enough time left or we're already over
      if (stretchDuration <= remainingTime || remainingTime <= 0) {
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
    const selectedIds = selectedStretches
      .filter(s => !('isRest' in s))
      .map(s => (s as Stretch).id);
    
    const stretchPool = [...availableStretches].filter(
      stretch => !selectedIds.includes(stretch.id)
    );
    
    // Randomize the pool
    stretchPool.sort(() => Math.random() - 0.5);
    
    // Add stretches until we can't fit any more or reach target time
    let attempts = 0;  // Prevent infinite loops
    const maxAttempts = 100;
    
    while (timeLeft > 0 && stretchPool.length > 0 && attempts < maxAttempts) {
      attempts++;
      
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
    const isSelected = selectedStretches.some(s => 
      !('isRest' in s) && s.id === item.id
    );
    
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
          <Text style={[
            styles.stretchName, 
            { color: theme.text }
          ]}>
            {item.name}
          </Text>
          <Text style={[
            styles.stretchDetails, 
            { color: theme.textSecondary }
          ]}>
            {`${item.level.charAt(0).toUpperCase() + item.level.slice(1)} • ${
              item.bilateral ? `${formatTime(item.duration)} (each side)` : formatTime(item.duration)
            }`}
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
        {minimumTimeRequired > 0 && (
          <View 
            style={[
              styles.minimumMarker,
              { 
                left: `${Math.min(100, (minimumTimeRequired / targetDuration) * 100)}%`,
                backgroundColor: meetsMinimumRequirement ? '#4CAF50' : '#FF5252'
              }
            ]} 
          />
        )}
      </View>
      
      <View style={styles.timeInfo}>
        <Text style={[styles.timeText, { color: theme.text }]}>
          {formatTime(selectedTotalTime)} total
        </Text>
        <Text style={[
          styles.remainingText, 
          { color: meetsMinimumRequirement ? theme.textSecondary : '#FF5252' }
        ]}>
          {meetsMinimumRequirement 
            ? `Target: ${formatTime(targetDuration)}` 
            : `Min: ${formatTime(minimumTimeRequired)} required`}
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#eee' }]}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'stretches' && [styles.activeTab, { borderBottomColor: theme.accent }]
          ]}
          onPress={() => setActiveTab('stretches')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'stretches' ? theme.accent : theme.textSecondary }
          ]}>
            Stretches
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'areas' && [styles.activeTab, { borderBottomColor: theme.accent }]
          ]}
          onPress={() => setActiveTab('areas')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'areas' ? theme.accent : theme.textSecondary }
          ]}>
            Body Areas ({selectedAreas.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'areas' && (
        <View style={styles.areasContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Select Body Areas
          </Text>
          <View style={styles.areasGrid}>
            {BODY_AREAS.map(bodyArea => (
              <TouchableOpacity
                key={bodyArea}
                style={[
                  styles.areaChip,
                  { 
                    backgroundColor: selectedAreas.includes(bodyArea) ? 
                      theme.accent : (isDark ? theme.backgroundLight : '#eee') 
                  }
                ]}
                onPress={() => toggleArea(bodyArea)}
              >
                <Text style={{ 
                  color: selectedAreas.includes(bodyArea) ? '#fff' : theme.text 
                }}>
                  {bodyArea}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.helpText, { color: theme.textSecondary }]}>
            Select areas to view stretches from multiple body parts. Your routine can include a mix of different areas.
          </Text>
        </View>
      )}

      {activeTab === 'stretches' && (
        <>
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
              {selectedStretches.filter(s => !('isRest' in s)).length} stretches selected
            </Text>
            {remainingTime > 0 && (
              <TouchableOpacity 
                style={[
                  styles.autoCompleteButton, 
                  { backgroundColor: meetsMinimumRequirement ? theme.accent : '#FF5252' }
                ]}
                onPress={autoCompleteRoutine}
              >
                <Text style={styles.autoCompleteText}>
                  {meetsMinimumRequirement 
                    ? "Add More Stretches" 
                    : "Add Required Stretches"}
                </Text>
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
        </>
      )}
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  areasContainer: {
    padding: 16,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  areaChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    margin: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    marginTop: 16,
    fontStyle: 'italic',
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
  minimumMarker: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: 2,
    backgroundColor: '#FF5252',
  },
});

export default StretchSelector; 
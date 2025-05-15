import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  SectionList,
  ScrollView,
  TextInput,
  SafeAreaView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BodyArea, Stretch, Position, CustomRestPeriod } from '../../types';
import stretches from '../../data/stretches';
import * as rewardManager from '../../utils/progress/modules/rewardManager';
import { isPremiumStretch, filterStretchesByLevel } from '../../utils/generators/premiumUtils';

// Define a section structure for the SectionList
type StretchSectionData = {
  title: 'filters' | 'stretches';
  data: Stretch[] | { id: string }[];
  renderItem?: () => React.ReactElement;
};

// Define a helper type for the filter section item
interface FilterSectionItem {
  id: string;
}

interface StretchSelectorProps {
  area: BodyArea;
  duration: string;
  selectedStretches: (Stretch | CustomRestPeriod)[];
  onStretchesSelected: (stretches: (Stretch | CustomRestPeriod)[]) => void;
  onClose: () => void;
}

// Available body areas for multi-selection
const BODY_AREAS: BodyArea[] = [
  'Dynamic Flow', 'Lower Back', 'Upper Back & Chest', 'Neck', 'Hips & Legs', 'Shoulders & Arms'
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
    position: Position | 'All';
  }>({
    position: 'All'
  });
  const [activeTab, setActiveTab] = useState<'stretches' | 'areas'>('stretches');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStretches, setFilteredStretches] = useState<Stretch[]>([]);
  const [selectedItems, setSelectedItems] = useState<(Stretch | CustomRestPeriod)[]>(selectedStretches || []);
  const [premiumUnlocked, setPremiumUnlocked] = useState(false);

  // Calculate total time based on selected stretches (in seconds)
  const selectedTotalTime = selectedItems.reduce((total, stretch) => {
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

  // Check if premium stretches are unlocked
  useEffect(() => {
    const checkPremiumAccess = async () => {
      const hasPremiumAccess = await rewardManager.isRewardUnlocked('premium_stretches');
      setPremiumUnlocked(hasPremiumAccess);
    };
    
    checkPremiumAccess();
  }, []);

  // Load available stretches for the selected body areas
  useEffect(() => {
    const filtered = stretches.filter(stretch => 
      // Match any of the selected areas
      selectedAreas.some(selectedArea => 
        stretch.tags.includes(selectedArea)
      )
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
    const isSelected = selectedItems.some(s => 
      !('isRest' in s) && s.id === stretch.id
    );
    
    if (isSelected) {
      // Remove from selection
      setSelectedItems(selectedItems.filter(s => 
        ('isRest' in s) || s.id !== stretch.id
      ));
    } else {
      // Add to selection
      const stretchDuration = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
      
      // Only allow adding if there's enough time left
      if (stretchDuration <= remainingTime) {
        setSelectedItems([...selectedItems, stretch]);
      } else {
        // Could add a toast/alert here to inform user they're over time limit
        console.log("Cannot add stretch - exceeds time limit");
      }
    }
  };

  // Auto-complete the routine with random stretches that fit
  const autoCompleteRoutine = () => {
    if (remainingTime <= 0) return;
    
    // Start with current selection
    const result = [...selectedItems];
    let timeLeft = remainingTime;
    
    // Create a pool of stretches not already selected
    const selectedIds = selectedItems
      .filter(s => !('isRest' in s))
      .map(s => (s as Stretch).id);
    
    const stretchPool = filteredStretches.filter(
      stretch => !selectedIds.includes(stretch.id)
    );
    
    // Randomize the pool thoroughly
    for (let i = 0; i < 3; i++) {
      stretchPool.sort(() => Math.random() - 0.5);
    }
    
    // Add stretches until we reach at least the minimum required time or can't fit any more
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
      
      // If we've reached the minimum required time, we can stop
      const newTotalTime = result.reduce((total, item) => {
        if ('isRest' in item) {
          return total + item.duration;
        }
        return total + (item.bilateral ? item.duration * 2 : item.duration);
      }, 0);
      
      if (newTotalTime >= minimumTimeRequired && Math.random() > 0.7) {
        break;
      }
    }
    
    setSelectedItems(result);
  };

  // Clear all selected stretches
  const clearAllStretches = () => {
    setSelectedItems([]);
  };

  // Format seconds to minutes and seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Filter stretches based on search query and selected areas
  useEffect(() => {
    let filtered = stretches.filter(stretch => {
      // Only include stretches with hasDemo: true
      if (!stretch.hasDemo) {
        return false;
      }
      
      // Filter by selected areas
      const matchesAreas = selectedAreas.some(selectedArea => 
        stretch.tags.includes(selectedArea)
      );
      
      // Filter by search query (case insensitive)
      const matchesSearch = searchQuery === '' || 
        stretch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stretch.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stretch.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by position if specified
      const matchesPosition = filters.position === 'All' || 
                             String(stretch.position).includes(String(filters.position)) ||
                             stretch.position === 'All';
      
      return matchesAreas && matchesSearch && matchesPosition;
    });
    
    // Remove premium stretches if not unlocked
    if (!premiumUnlocked) {
      filtered = filtered.filter(stretch => !stretch.premium);
    }
    
    setFilteredStretches(filtered);
  }, [searchQuery, selectedAreas, filters.position, premiumUnlocked]);

  // Define the filterStretches function for backward compatibility
  const filterStretches = () => {
    // The filtering is now handled in the useEffect
  };

  // Render a stretch item
  const renderStretchItem = ({ item }: { item: Stretch }) => {
    const isSelected = selectedItems.some(s => 
      !('isRest' in s) && s.id === item.id
    );
    const isPremium = item.premium;
    
    // Add premium badge information
    const vipBadgeColor = isPremium ? '#FFD700' : undefined; // Gold color for premium
    
    return (
      <TouchableOpacity
        style={[
          styles.stretchItem,
          { 
            backgroundColor: isDark ? theme.cardBackground : '#fff',
            borderColor: isSelected ? theme.accent : isDark ? theme.border : '#e0e0e0',
            borderWidth: isSelected ? 2 : 1
          }
        ]}
        onPress={() => toggleStretch(item)}
      >
        <View style={styles.stretchContent}>
          <View style={styles.stretchHeader}>
            <Text style={[styles.stretchName, { color: theme.text }]}>
              {item.name}
            </Text>
            
            <View style={styles.badges}>
              {item.bilateral && (
                <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.badgeText}>Both Sides</Text>
                </View>
              )}
              
              {isPremium && premiumUnlocked && (
                <View style={[styles.badge, { backgroundColor: vipBadgeColor }]}>
                  <Ionicons name="star" size={12} color="#FFF" />
                  <Text style={styles.badgeText}>VIP</Text>
                </View>
              )}
              
              <View style={[
                styles.levelBadge, 
                
              ]}>
                
              </View>
            </View>
          </View>
          
          <View style={styles.stretchDetails}>
            <Text 
              style={[styles.stretchDescription, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
            
            <View style={styles.tagContainer}>
              {item.tags.map((tag, index) => (
                <View 
                  key={index} 
                  style={[styles.tag, { backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5' }]}
                >
                  <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        
        <View style={styles.selectIndicator}>
          {isSelected ? (
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={theme.accent} 
            />
          ) : (
            <Ionicons 
              name="add-circle-outline" 
              size={24} 
              color={isDark ? theme.textSecondary : '#757575'} 
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? theme.background : '#f5f5f5' }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onClose}
          style={styles.closeButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: theme.text }]}>
          Select Stretches
        </Text>
        
        <TouchableOpacity 
          onPress={() => {
            console.log('Done button pressed. Meets minimum requirement:', meetsMinimumRequirement);
            console.log('Selected items length:', selectedItems.length);
            console.log('Total time:', selectedTotalTime, 'Minimum required:', minimumTimeRequired);
            onStretchesSelected(selectedItems);
            onClose();
          }}
          style={[
            styles.saveButton, 
            { 
              backgroundColor: meetsMinimumRequirement ? theme.accent : isDark ? '#555' : '#ccc',
              opacity: meetsMinimumRequirement ? 1 : 0.7
            }
          ]}
          disabled={!meetsMinimumRequirement}
        >
          <Text style={styles.saveButtonText}>{meetsMinimumRequirement ? 'Done' : 'Add More Stretches'}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={[
          styles.searchInputContainer,
          { backgroundColor: isDark ? theme.backgroundLight : '#fff' }
        ]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search stretches..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'stretches' ? 
              { borderBottomColor: theme.accent, borderBottomWidth: 2 } : 
              {}
          ]}
          onPress={() => setActiveTab('stretches')}
        >
          <Text 
            style={[
              styles.tabText, 
              { 
                color: activeTab === 'stretches' ? theme.accent : theme.textSecondary,
                fontWeight: activeTab === 'stretches' ? 'bold' : 'normal'
              }
            ]}
          >
            Stretches
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'areas' ? 
              { borderBottomColor: theme.accent, borderBottomWidth: 2 } : 
              {}
          ]}
          onPress={() => setActiveTab('areas')}
        >
          <Text 
            style={[
              styles.tabText, 
              { 
                color: activeTab === 'areas' ? theme.accent : theme.textSecondary,
                fontWeight: activeTab === 'areas' ? 'bold' : 'normal'
              }
            ]}
          >
            Body Areas
          </Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'areas' ? (
        <ScrollView style={styles.contentContainer}>
          <View style={styles.areasContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Select Body Areas
            </Text>
            <View style={styles.areaGrid}>
              {BODY_AREAS.map((bodyArea) => (
                <TouchableOpacity
                  key={bodyArea}
                  style={[
                    styles.areaItem,
                    { 
                      backgroundColor: selectedAreas.includes(bodyArea) 
                        ? theme.accent 
                        : isDark ? theme.backgroundLight : '#fff',
                      borderColor: isDark ? theme.border : '#e0e0e0'
                    }
                  ]}
                  onPress={() => toggleArea(bodyArea)}
                >
                  <Text 
                    style={[
                      styles.areaText, 
                      { 
                        color: selectedAreas.includes(bodyArea) 
                          ? '#fff' 
                          : theme.text
                      }
                    ]}
                  >
                    {bodyArea}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.contentContainer}>
          {/* Filters Section */}
          <View style={styles.filters}>
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Filter by:</Text>
            <View style={styles.levelFilters}>
              <TouchableOpacity
                style={[
                  styles.levelFilter,
                  { 
                    backgroundColor: filters.position === 'All' 
                      ? theme.accent 
                      : isDark ? theme.backgroundLight : '#fff'
                  }
                ]}
                onPress={() => setFilters({...filters, position: 'All'})}
              >
                <Text 
                  style={[
                    styles.levelFilterText, 
                    { color: filters.position === 'All' ? '#fff' : theme.text }
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.levelFilter,
                  { 
                    backgroundColor: filters.position === 'Sitting' 
                      ? '#4CAF50' 
                      : isDark ? theme.backgroundLight : '#fff'
                  }
                ]}
                onPress={() => setFilters({...filters, position: 'Sitting'})}
              >
                <Text 
                  style={[
                    styles.levelFilterText, 
                    { color: filters.position === 'Sitting' ? '#fff' : theme.text }
                  ]}
                >
                  Sitting
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.levelFilter,
                  { 
                    backgroundColor: filters.position === 'Lying' 
                      ? '#FF9800' 
                      : isDark ? theme.backgroundLight : '#fff'
                  }
                ]}
                onPress={() => setFilters({...filters, position: 'Lying'})}
              >
                <Text 
                  style={[
                    styles.levelFilterText, 
                    { color: filters.position === 'Lying' ? '#fff' : theme.text }
                  ]}
                >
                  Lying
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.levelFilter,
                  { 
                    backgroundColor: filters.position === 'Standing' 
                      ? '#F44336' 
                      : isDark ? theme.backgroundLight : '#fff'
                  }
                ]}
                onPress={() => setFilters({...filters, position: 'Standing'})}
              >
                <Text 
                  style={[
                    styles.levelFilterText, 
                    { color: filters.position === 'Standing' ? '#fff' : theme.text }
                  ]}
                >
                  Standing
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.timeInfoContainer}>
            <View style={[styles.timeInfo, { backgroundColor: isDark ? theme.backgroundLight : '#e3f2fd' }]}>
              <View style={styles.timeRow}>
                <Text style={[styles.timeLabel, { color: theme.text }]}>
                  Target Time:
                </Text>
                <Text style={[styles.timeValue, { color: theme.text }]}>
                  {formatTime(targetDuration)}
                </Text>
              </View>
              <View style={styles.timeRow}>
                <Text style={[styles.timeLabel, { color: theme.text }]}>
                  Selected Time:
                </Text>
                <Text style={[
                  styles.timeValue, 
                  { 
                    color: selectedTotalTime > targetDuration ? '#F44336' : 
                           selectedTotalTime < minimumTimeRequired ? '#FF9800' : 
                           '#4CAF50' 
                  }
                ]}>
                  {formatTime(selectedTotalTime)}
                </Text>
              </View>
              <View style={styles.timeRow}>
                <Text style={[styles.timeLabel, { color: theme.text }]}>
                  Remaining:
                </Text>
                <Text style={[
                  styles.timeValue, 
                  { 
                    color: remainingTime < 0 ? '#F44336' : theme.text 
                  }
                ]}>
                  {formatTime(Math.abs(remainingTime))} {remainingTime < 0 ? '(over)' : ''}
                </Text>
              </View>
              {!meetsMinimumRequirement && (
                <Text style={[styles.minTimeWarning, { color: '#FF9800' }]}>
                  Minimum time required: {formatTime(minimumTimeRequired)}
                </Text>
              )}
              {meetsMinimumRequirement && (
                <Text style={[styles.minTimeSuccess, { color: '#4CAF50' }]}>
                  ✓ Minimum time requirement met
                </Text>
              )}
            </View>
            
            <View style={styles.timeActionButtons}>
              <TouchableOpacity
                style={[
                  styles.clearButton,
                  { 
                    backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                    borderColor: isDark ? theme.border : '#ddd',
                  }
                ]}
                onPress={clearAllStretches}
              >
                <Text style={[styles.clearButtonText, { color: theme.text }]}>Clear All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.autoCompleteButton,
                  { 
                    backgroundColor: remainingTime <= 0 ? 
                      isDark ? '#555' : '#ccc' : 
                      theme.accent,
                    opacity: remainingTime <= 0 ? 0.7 : 1
                  }
                ]}
                onPress={autoCompleteRoutine}
                disabled={remainingTime <= 0}
              >
                <Text style={styles.autoCompleteText}>Auto Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.selectedCount}>
            <Text style={[styles.selectedCountText, { color: theme.text }]}>
              {selectedItems.filter(item => !('isRest' in item)).length} stretches selected
            </Text>
          </View>
          
          {!premiumUnlocked && (
            <View style={[styles.premiumInfo, { backgroundColor: isDark ? theme.backgroundLight : '#FFF9E5' }]}>
              <Ionicons name="lock-closed" size={20} color="#FFD700" />
              <Text style={[styles.premiumInfoText, { color: isDark ? theme.textSecondary : '#5D4037' }]}>
                Premium stretches will be available at level 7
              </Text>
            </View>
          )}
          
          {/* Stretches List */}
          {filteredStretches.length > 0 ? (
            filteredStretches.map(item => (
              <React.Fragment key={item.id.toString()}>
                {renderStretchItem({ item })}
              </React.Fragment>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No stretches found for your search criteria.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
  },
  stretchesContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  filters: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  levelFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  levelFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectedCount: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  stretchItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stretchContent: {
    flex: 1,
  },
  stretchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stretchName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
    marginBottom: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
    marginBottom: 4,
  },
  stretchDetails: {
    flex: 1,
  },
  stretchDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
    backgroundColor: '#f5f5f5',
  },
  tagText: {
    fontSize: 10,
  },
  selectIndicator: {
    justifyContent: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  premiumInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E5',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  premiumInfoText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#5D4037',
    flex: 1,
  },
  areaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  areaItem: {
    width: '48%',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  areaText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
  },
  areasContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flex: 1,
  },
  timeInfoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  timeInfo: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  minTimeWarning: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  minTimeSuccess: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  timeActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
  },
  clearButtonText: {
    fontWeight: 'bold',
  },
  autoCompleteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  autoCompleteText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default StretchSelector; 
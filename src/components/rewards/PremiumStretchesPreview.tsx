import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stretch } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { getPremiumStretchesPreview } from '../../utils/generators/premiumUtils';
import { Video, ResizeMode } from 'expo-av';

interface PremiumStretchesPreviewProps {
  onClose?: () => void;
  isModal?: boolean;
}

const { width } = Dimensions.get('window');
const PREVIEW_COUNT = 14; // Show 14 premium stretches

const PremiumStretchesPreview: React.FC<PremiumStretchesPreviewProps> = ({ 
  onClose,
  isModal = true // Default to true when used as a modal
}) => {
  const { theme, isDark } = useTheme();
  const [premiumStretches, setPremiumStretches] = useState<(Stretch & { isPremium: boolean; vipBadgeColor: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoLoadingStates, setVideoLoadingStates] = useState<Record<string, boolean>>({});
  const [videoErrorStates, setVideoErrorStates] = useState<Record<string, boolean>>({});
  
  // Track visible items for optimizing video playback
  const [visibleItems, setVisibleItems] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  
  // Track retry attempts for videos
  const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({});
  const MAX_RETRIES = 2;

  useEffect(() => {
    const loadPremiumStretches = async () => {
      setLoading(true);
      try {
        const stretches = await getPremiumStretchesPreview(PREVIEW_COUNT);
        setPremiumStretches(stretches);
        
        // Initialize loading states, error states and retry counts
        const initialLoadingStates: Record<string, boolean> = {};
        const initialErrorStates: Record<string, boolean> = {};
        const initialRetryAttempts: Record<string, number> = {};
        
        stretches.forEach(stretch => {
          if (isVideoSource(stretch)) {
            initialLoadingStates[stretch.id.toString()] = true;
            initialErrorStates[stretch.id.toString()] = false;
            initialRetryAttempts[stretch.id.toString()] = 0;
          }
        });
        
        setVideoLoadingStates(initialLoadingStates);
        setVideoErrorStates(initialErrorStates);
        setRetryAttempts(initialRetryAttempts);
      } catch (error) {
        // Silent error handling
      } finally {
        setLoading(false);
      }
    };

    loadPremiumStretches();
  }, []);

  // Check if a stretch has video content
  const isVideoSource = (item: Stretch): boolean => {
    if (!item.image) return false;
    
    // Check for the __video flag
    if (typeof item.image === 'object' && 
        item.image !== null && 
        (item.image as any).__video === true) {
      return true;
    }
    
    // Check for .mp4 extension in uri
    if (typeof item.image === 'object' && 
        item.image !== null && 
        'uri' in item.image && 
        typeof item.image.uri === 'string' && 
        (item.image.uri.toLowerCase().endsWith('.mp4') || 
         item.image.uri.toLowerCase().endsWith('.mov'))) {
      return true;
    }
    
    // Check for require asset with MP4 reference
    if (typeof item.image === 'object' && 
        (item.image as any).__asset) {
      return true;
    }
    
    return false;
  };
  
  // Format video source for Video component
  const formatVideoSource = (source: any) => {
    try {
      // If it's a number (direct asset), use it directly
      if (typeof source === 'number') {
        return source;
      } 
      // If it has __asset property, use that asset number directly
      else if (source && typeof source === 'object' && '__asset' in source) {
        return (source as any).__asset; 
      }
      // Regular URI object
      else if (source && typeof source === 'object' && 'uri' in source) {
        return source;
      }
      
      return source;
    } catch (error) {
      return null;
    }
  };

  // Handle video load complete
  const handleVideoLoad = (stretchId: string | number) => {
    setVideoLoadingStates(prev => ({
      ...prev,
      [stretchId.toString()]: false
    }));
  };

  // Handle video load error
  const handleVideoError = (stretchId: string | number, error: string) => {
    // Check if we should retry
    const currentRetries = retryAttempts[stretchId.toString()] || 0;
    
    if (currentRetries < MAX_RETRIES) {
      // Increment retry count
      setRetryAttempts(prev => ({
        ...prev,
        [stretchId.toString()]: currentRetries + 1
      }));
      
      // Keep in loading state for retry
      setVideoLoadingStates(prev => ({
        ...prev,
        [stretchId.toString()]: true
      }));
      
      // Force component update to retry loading
      setPremiumStretches(prev => [...prev]);
    } else {
      // Max retries reached, show error state
      setVideoLoadingStates(prev => ({
        ...prev,
        [stretchId.toString()]: false
      }));
      setVideoErrorStates(prev => ({
        ...prev,
        [stretchId.toString()]: true
      }));
    }
  };

  // Track which items are visible on screen
  const handleViewableItemsChanged = React.useCallback(({ viewableItems }) => {
    const visibleIds = viewableItems.map(item => item.key);
    setVisibleItems(visibleIds);
  }, []);

  // Setup viewability config for FlatList
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50, // Item is considered visible when 50% is visible
    minimumViewTime: 300 // Item must be visible for at least 300ms
  };

  const renderStretchItem = ({ item }: { item: Stretch & { isPremium: boolean; vipBadgeColor: string } }) => {
    const shouldRenderVideo = isVideoSource(item);
    const isVideoLoading = shouldRenderVideo && videoLoadingStates[item.id.toString()];
    const hasVideoError = shouldRenderVideo && videoErrorStates[item.id.toString()];
    const isVisible = visibleItems.includes(item.id.toString());
    
    return (
      <View style={[styles.stretchCard, { backgroundColor: isDark ? theme.cardBackground : '#FFF' }]}>
        <View style={styles.stretchHeader}>
          <Text style={[styles.stretchName, { color: isDark ? theme.text : '#333' }]}>
            {item.name}
          </Text>
          <View style={[styles.premiumBadge, { backgroundColor: item.vipBadgeColor }]}>
            <Ionicons name="star" size={14} color="#FFF" />
            <Text style={styles.premiumText}>VIP</Text>
          </View>
        </View>

        <View style={styles.mainContent}>
          <View style={[styles.imageContainer, { borderColor: item.vipBadgeColor }]}>
            {shouldRenderVideo && !hasVideoError ? (
              <>
                <Video
                  source={formatVideoSource(item.image)}
                  style={styles.stretchImage}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={isVisible}
                  isLooping={true}
                  isMuted={true}
                  useNativeControls={false}
                  onReadyForDisplay={() => handleVideoLoad(item.id)}
                  onLoad={() => handleVideoLoad(item.id)}
                  onError={(error) => handleVideoError(item.id, error.toString())}
                  // Set a timeout for video loading
                  onLoadStart={() => {
                    // Set a 10-second timeout for video loading
                    setTimeout(() => {
                      setVideoLoadingStates(prev => {
                        // Only update if still loading after timeout
                        if (prev[item.id.toString()]) {
                          return {
                            ...prev,
                            [item.id.toString()]: false
                          };
                        }
                        return prev;
                      });
                      setVideoErrorStates(prev => {
                        // Mark as error if still loading after timeout
                        if (videoLoadingStates[item.id.toString()]) {
                          return {
                            ...prev,
                            [item.id.toString()]: true
                          };
                        }
                        return prev;
                      });
                    }, 10000); // 10-second timeout
                  }}
                />
                {isVideoLoading && (
                  <View style={styles.videoLoadingContainer}>
                    <ActivityIndicator size="small" color={item.vipBadgeColor} />
                    <Text style={styles.videoLoadingText}>Loading</Text>
                  </View>
                )}
              </>
            ) : (
              <Image
                source={hasVideoError ? 
                  { uri: `https://via.placeholder.com/350x350/${item.vipBadgeColor.replace('#', '')}/FFFFFF?text=${encodeURIComponent(item.name)}` } : 
                  typeof item.image === 'object' && item.image && '__asset' in item.image ? 
                    (item.image as any).__asset : item.image}
                style={styles.stretchImage}
                resizeMode="contain"
              />
            )}
            
            {/* Play button overlay for videos that are paused */}
            {shouldRenderVideo && !isVideoLoading && !hasVideoError && !isVisible && (
              <View style={styles.pausedVideoOverlay}>
                <Ionicons name="play-circle" size={40} color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <Text style={[styles.description, { color: isDark ? theme.textSecondary : '#666' }]}>
              {item.description}
            </Text>

            <View style={styles.infoSection}>
              <View style={styles.tagContainer}>
                {item.tags.slice(0, 2).map((tag, index) => (
                  <View 
                    key={index} 
                    style={[styles.tag, { backgroundColor: isDark ? theme.backgroundLight : '#E0F7FA' }]}
                  >
                    <Text style={[styles.tagText, { color: isDark ? theme.accent : '#00838F' }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
              
              <View style={[styles.levelBadge, {
                backgroundColor: 
                  item.level === 'beginner' ? '#4CAF5020' : 
                  item.level === 'intermediate' ? '#FF980020' : 
                  '#F4433620'
              }]}>
                <Text style={[styles.levelText, { 
                  color: item.level === 'beginner' ? '#4CAF50' : 
                        item.level === 'intermediate' ? '#FF9800' : '#F44336'
                }]}>
                  {item.level.charAt(0).toUpperCase() + item.level.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? theme.background : '#F5F5F5' }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons 
            name="star" 
            size={24} 
            color={isDark ? '#FFD700' : '#FFD700'} 
            style={styles.titleIcon}
          />
          <Text style={[styles.title, { color: isDark ? theme.text : '#333' }]}>
            {isModal ? 'Premium VIP Stretches' : 'Premium Stretches Preview'}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons 
            name="close-circle" 
            size={28} 
            color={isDark ? theme.text : '#333'} 
          />
        </TouchableOpacity>
      </View>

      <Text style={[styles.subtitle, { color: isDark ? theme.textSecondary : '#666' }]}>
        {isModal ? 
          "You've unlocked 14 premium VIP stretches! These are available in all your routines." : 
          "Unlock these 14 premium stretches when you reach Level 7!"}
      </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: isDark ? theme.textSecondary : '#666' }]}>
            Loading premium stretches...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={premiumStretches}
          renderItem={renderStretchItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={true}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialNumToRender={3}
          maxToRenderPerBatch={2}
          windowSize={5}
          updateCellsBatchingPeriod={100}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={60} color={isDark ? theme.textSecondary : '#ccc'} />
              <Text style={[styles.emptyText, { color: isDark ? theme.textSecondary : '#666' }]}>
                No premium stretches available for preview.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    fontStyle: 'italic',
    marginHorizontal: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  closeButton: {
    padding: 8,
  },
  listContainer: {
    paddingBottom: 24,
    paddingHorizontal: 4,
  },
  stretchCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stretchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stretchName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 10,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 8,
  },
  premiumText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '700',
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    position: 'relative',
  },
  stretchImage: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  tag: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  levelBadge: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 16,
  },
  videoLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
  },
  videoLoadingText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 8,
    fontWeight: 'bold',
  },
  pausedVideoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  }
});

export default PremiumStretchesPreview; 
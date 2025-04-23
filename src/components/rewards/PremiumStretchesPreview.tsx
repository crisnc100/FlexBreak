import React, { useState, useEffect } from 'react';
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

interface PremiumStretchesPreviewProps {
  onClose?: () => void;
  isModal?: boolean;
}

const { width } = Dimensions.get('window');
const PREVIEW_COUNT = 15; // Show 15 premium stretches

const PremiumStretchesPreview: React.FC<PremiumStretchesPreviewProps> = ({ 
  onClose,
  isModal = true // Default to true when used as a modal
}) => {
  const { theme, isDark } = useTheme();
  const [premiumStretches, setPremiumStretches] = useState<(Stretch & { isPremium: boolean; vipBadgeColor: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPremiumStretches = async () => {
      setLoading(true);
      try {
        const stretches = await getPremiumStretchesPreview(PREVIEW_COUNT);
        setPremiumStretches(stretches);
      } catch (error) {
        console.error('Error loading premium stretches preview:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPremiumStretches();
  }, []);

  const renderStretchItem = ({ item }: { item: Stretch & { isPremium: boolean; vipBadgeColor: string } }) => {
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
            <Image
              source={item.image}
              style={styles.stretchImage}
              resizeMode="contain"
            />
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
          "You've unlocked 15 premium VIP stretches! These are available in all your routines." : 
          "Unlock these 15 premium stretches when you reach Level 7!"}
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
          data={premiumStretches}
          renderItem={renderStretchItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={true}
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
});

export default PremiumStretchesPreview; 
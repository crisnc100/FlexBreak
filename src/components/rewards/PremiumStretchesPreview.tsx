import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stretch } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { getPremiumStretchesPreview } from '../../utils/premiumUtils';

interface PremiumStretchesPreviewProps {
  onClose?: () => void;
}

const { width } = Dimensions.get('window');
const PREVIEW_COUNT = 5;

const PremiumStretchesPreview: React.FC<PremiumStretchesPreviewProps> = ({ onClose }) => {
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

        <View style={[styles.imageContainer, { borderColor: item.vipBadgeColor }]}>
          <Image
            source={item.image}
            style={styles.stretchImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.tagContainer}>
            {item.tags.map((tag, index) => (
              <View 
                key={index} 
                style={[styles.tag, { backgroundColor: isDark ? theme.accent + '40' : '#E0F7FA' }]}
              >
                <Text style={[styles.tagText, { color: isDark ? theme.accent : '#00838F' }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
          
          <View style={styles.levelBadge}>
            <Text style={[styles.levelText, { 
              color: item.level === 'beginner' ? '#4CAF50' : 
                    item.level === 'intermediate' ? '#FF9800' : '#F44336'
            }]}>
              {item.level.charAt(0).toUpperCase() + item.level.slice(1)}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: isDark ? theme.textSecondary : '#666' }]}>
          {item.description}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F5F5F5' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? theme.text : '#333' }]}>
          Premium Stretches Preview
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons 
            name="close-circle" 
            size={24} 
            color={isDark ? theme.text : '#333'} 
          />
        </TouchableOpacity>
      </View>

      <Text style={[styles.subtitle, { color: isDark ? theme.textSecondary : '#666' }]}>
        Unlock these and more premium stretches at Level 7!
      </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
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
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: isDark ? theme.textSecondary : '#666' }]}>
              No premium stretches available for preview.
            </Text>
          }
        />
      )}
    </View>
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
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 4,
  },
  listContainer: {
    paddingBottom: 24,
  },
  stretchCard: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stretchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stretchName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 8,
  },
  premiumText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  imageContainer: {
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
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
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  tag: {
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
  },
  levelBadge: {
    marginLeft: 8,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 24,
  },
});

export default PremiumStretchesPreview; 
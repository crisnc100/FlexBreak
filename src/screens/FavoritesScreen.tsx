import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { getIsPremium, getFavorites } from '../services/storageService';
import stretches from '../data/stretches';
import { Stretch } from '../types';
import SubscriptionModal from '../components/SubscriptionModal';
import { usePremium } from '../context/PremiumContext';
import { useRefresh } from '../context/RefreshContext';
import { RefreshableFlatList } from '../components/common';
import { useTheme } from '../context/ThemeContext';

export default function FavoritesScreen() {
  const { isPremium } = usePremium();
  const { isRefreshing, refreshFavorites } = useRefresh();
  const { theme, isDark } = useTheme();
  
  const [favorites, setFavorites] = useState<Stretch[]>([]);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isPremium) {
          await loadFavorites();
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [isPremium]);

  const loadFavorites = async () => {
    const favoriteIds = await getFavorites();
    const favoriteStretches = stretches.filter(stretch => 
      favoriteIds.includes(stretch.id)
    );
    setFavorites(favoriteStretches);
  };

  const handleRefresh = async () => {
    console.log('Refreshing favorites...');
    await loadFavorites();
    await refreshFavorites();
  };

  const renderFavoriteItem = ({ item }: { item: Stretch }) => (
    <View style={[
      styles.favoriteItem, 
      { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }
    ]}>
      <Image source={item.image} style={styles.stretchImage} />
      <View style={styles.stretchInfo}>
        <Text style={[
          styles.stretchName,
          { color: isDark ? theme.text : '#333' }
        ]}>
          {item.name}
        </Text>
        <Text style={[
          styles.stretchDescription,
          { color: isDark ? theme.textSecondary : '#666' }
        ]}>
          {item.description}
        </Text>
        <Text style={styles.stretchDuration}>{item.duration}s</Text>
      </View>
    </View>
  );

  if (!isPremium) {
    return (
      <View style={[
        styles.container,
        { backgroundColor: isDark ? theme.background : '#fff' }
      ]}>
        <Text style={[
          styles.text,
          { color: isDark ? theme.text : '#000' }
        ]}>
          Favorites Screen
        </Text>
        <Text style={[
          styles.subtext,
          { color: isDark ? theme.textSecondary : '#666' }
        ]}>
          Unlock favorites with Premium!
        </Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setSubscriptionModalVisible(true)}
        >
          <Text style={styles.buttonText}>Go Premium</Text>
        </TouchableOpacity>

        <SubscriptionModal 
          visible={subscriptionModalVisible}
          onClose={() => setSubscriptionModalVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? theme.background : '#fff' }
    ]}>
      <Text style={[
        styles.header,
        { color: isDark ? theme.text : '#333' }
      ]}>
        Favorites
      </Text>
      
      {favorites.length === 0 ? (
        <Text style={[
          styles.emptyText,
          { color: isDark ? theme.textSecondary : '#666' }
        ]}>
          No favorites yet. Star stretches during your routine to save them here!
        </Text>
      ) : (
        <RefreshableFlatList
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={(item: Stretch) => item.id.toString()}
          style={styles.favoritesList}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          showRefreshingFeedback={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  favoritesList: {
    flex: 1,
  },
  favoriteItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stretchImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  stretchInfo: {
    flex: 1,
  },
  stretchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stretchDescription: {
    fontSize: 12,
    color: '#666',
  },
  stretchDuration: {
    fontSize: 12,
    color: '#4CAF50',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
});
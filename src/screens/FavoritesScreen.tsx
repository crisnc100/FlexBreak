import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { getFavoriteRoutines, deleteFavoriteRoutine } from '../services/storageService';
import { BodyArea, Duration } from '../types';
import SubscriptionModal from '../components/SubscriptionModal';
import { usePremium } from '../context/PremiumContext';
import { useRefresh } from '../context/RefreshContext';
import { RefreshableFlatList } from '../components/common';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../types';

// Define the favorite routine type
interface FavoriteRoutine {
  id: string;
  area: BodyArea;
  duration: Duration;
  name?: string;
  timestamp: string;
}

export default function FavoritesScreen() {
  const { isPremium } = usePremium();
  const { isRefreshing, refreshFavorites } = useRefresh();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  
  const [favoriteRoutines, setFavoriteRoutines] = useState<FavoriteRoutine[]>([]);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isPremium) {
          await loadFavoriteRoutines();
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [isPremium]);

  const loadFavoriteRoutines = async () => {
    // Load favorite routines
    const routines = await getFavoriteRoutines();
    setFavoriteRoutines(routines);
  };

  const handleRefresh = async () => {
    console.log('Refreshing favorites...');
    await loadFavoriteRoutines();
    await refreshFavorites();
  };

  const handleDeleteRoutine = (routineId: string) => {
    Alert.alert(
      'Delete Favorite',
      'Are you sure you want to delete this routine from your favorites?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const success = await deleteFavoriteRoutine(routineId);
            if (success) {
              // Update the state to reflect the deletion
              setFavoriteRoutines(prev => prev.filter(routine => routine.id !== routineId));
            } else {
              Alert.alert('Error', 'Failed to delete the routine. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleStartRoutine = (routine: FavoriteRoutine) => {
    navigation.navigate('Routine', {
      area: routine.area,
      duration: routine.duration,
      level: 'beginner'
    });
  };

  const renderFavoriteRoutine = ({ item }: { item: FavoriteRoutine }) => {
    // Format the timestamp into a readable date
    const formattedDate = new Date(item.timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return (
      <View style={[
        styles.favoriteRoutineItem, 
        { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8f8f8',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0' 
        }
      ]}>
        <View style={styles.routineHeader}>
          <View style={styles.routineTypeTag}>
            <Text style={styles.routineTypeText}>{item.area}</Text>
          </View>
          <Text style={[
            styles.routineDate,
            { color: isDark ? theme.textSecondary : '#888' }
          ]}>
            Saved on {formattedDate}
          </Text>
        </View>
        
        <View style={styles.routineContent}>
          <View style={styles.routineInfo}>
            <Text style={[
              styles.routineName,
              { color: isDark ? theme.text : '#333' }
            ]}>
              {item.name || `${item.area} ${item.duration} min routine`}
            </Text>
            <Text style={[
              styles.routineDuration,
              { color: isDark ? theme.textSecondary : '#666' }
            ]}>
              Duration: {item.duration} minutes
            </Text>
          </View>
          
          <View style={styles.routineActions}>
            <TouchableOpacity 
              style={[styles.routineButton, styles.startButton]} 
              onPress={() => handleStartRoutine(item)}
            >
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.routineButton, styles.deleteButton]}
              onPress={() => handleDeleteRoutine(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#f44336" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

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
          Favorite Routines
        </Text>
        <Text style={[
          styles.subtext,
          { color: isDark ? theme.textSecondary : '#666' }
        ]}>
          Unlock favorite routines with Premium!
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
      <View style={styles.header}>
        <Text style={[
          styles.headerTitle,
          { color: isDark ? theme.text : '#333' }
        ]}>
          Favorite Routines
        </Text>
        
        <View style={styles.limitInfo}>
          <Text style={[
            styles.limitText,
            { color: isDark ? theme.textSecondary : '#666' }
          ]}>
            {favoriteRoutines.length}/15 Routines
          </Text>
        </View>
      </View>
      
      {favoriteRoutines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name="bookmark-outline" 
            size={48} 
            color={isDark ? 'rgba(255,255,255,0.2)' : '#ccc'} 
          />
          <Text style={[
            styles.emptyText,
            { color: isDark ? theme.textSecondary : '#666' }
          ]}>
            No favorite routines yet. When you complete a routine, tap "Save to Favorites" to save it here!
          </Text>
        </View>
      ) : (
        <RefreshableFlatList
          data={favoriteRoutines}
          renderItem={renderFavoriteRoutine as any}
          keyExtractor={(item: FavoriteRoutine) => item.id}
          style={styles.favoritesList}
          contentContainerStyle={styles.favoritesListContent}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  limitInfo: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  limitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  favoritesList: {
    flex: 1,
  },
  favoritesListContent: {
    paddingBottom: 20,
  },
  favoriteRoutineItem: {
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  routineTypeTag: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  routineTypeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  routineDate: {
    fontSize: 12,
    color: '#888',
  },
  routineContent: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  routineDuration: {
    fontSize: 14,
    color: '#666',
  },
  routineActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routineButton: {
    borderRadius: 4,
    padding: 8,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  }
});
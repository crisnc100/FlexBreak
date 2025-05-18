import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp, Playlist, Stretch, RestPeriod, TransitionPeriod } from '../types';
import playlists from '../data/playlists';
import stretches from '../data/stretches';
import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';
import { RefreshableScrollView } from '../components/common';

export default function PlaylistsScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { theme, isDark, isSunset } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simple loading simulation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handlePlaylistPress = (playlist: Playlist) => {
    // Get the stretches for the playlist
    const selectedStretches = playlist.stretchIds.map(id => {
      const stretch = stretches.find(s => s.id === id);
      
      if (stretch) {
        // Override duration with custom duration from playlist if provided
        const customDuration = playlist.stretchDurations[id] || stretch.duration;
        return {
          ...stretch,
          duration: customDuration
        };
      }
      return null;
    }).filter(Boolean) as Stretch[];
    
    // Default transition duration (in seconds)
    const transitionDuration = 3; // 3 seconds between stretches
    
    // Add transition periods between stretches
    const routineWithTransitions: (Stretch | RestPeriod | TransitionPeriod)[] = [];
    
    // Add stretches with transitions in between
    selectedStretches.forEach((stretch, index) => {
      // Add the stretch
      routineWithTransitions.push(stretch);
      
      // Add a transition after each stretch except the last one
      if (index < selectedStretches.length - 1) {
        const transition: TransitionPeriod = {
          id: `transition-${index}`,
          name: "Transition",
          description: "Get ready for the next stretch",
          duration: transitionDuration,
          isTransition: true
        };
        
        routineWithTransitions.push(transition);
      }
    });
    
    // Convert number to string for the duration parameter
    const durationStr = playlist.duration.toString() as '5' | '10' | '15';
    
    // Navigate to Routine screen with custom stretches including transitions
    navigation.navigate('Routine', {
      area: playlist.focusArea as any,
      duration: durationStr,
      position: 'All', // Default to all positions
      customStretches: routineWithTransitions,
      transitionDuration: transitionDuration
    });
  };
  
  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity 
      style={[
        styles.playlistCard, 
        { backgroundColor: isDark || isSunset ? theme.cardBackground : '#fff' }
      ]}
      onPress={() => handlePlaylistPress(item)}
    >
      <Image source={item.image} style={styles.playlistImage} />
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistTitle, { color: theme.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.playlistDescription, { color: theme.textSecondary }]}>
          {item.description}
        </Text>
        <View style={styles.playlistDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color={theme.accent} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              {item.duration} min
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="fitness-outline" size={16} color={theme.accent} />
            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
              {item.stretchIds.length} stretches
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.arrowContainer}>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={theme.accent} 
        />
      </View>
    </TouchableOpacity>
  );
  
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.screenTitle, { color: theme.text }]}>
        Stretch Playlists
      </Text>
      <Text style={[styles.screenDescription, { color: theme.textSecondary }]}>
        Tailored stretch routines for specific needs
      </Text>
      
      <FlatList
        data={playlists}
        renderItem={renderPlaylistItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.playlistList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  screenDescription: {
    fontSize: 16,
    marginBottom: 24,
  },
  playlistList: {
    paddingBottom: 16,
  },
  playlistCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  playlistImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  playlistDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 12,
    marginLeft: 4,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  }
}); 
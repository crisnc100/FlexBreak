import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RoutineParams, Stretch } from '../types';
import { generateRoutine } from '../utils/routineGenerator';
import * as Sharing from 'expo-sharing';

export default function RoutineScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [routine, setRoutine] = useState<Stretch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    // Check if we have params from the HomeScreen
    if (route.params) {
      const params = route.params as RoutineParams;
      const generatedRoutine = generateRoutine(params);
      setRoutine(generatedRoutine);
      
      if (generatedRoutine.length > 0) {
        setTimeLeft(generatedRoutine[0].duration);
      }
    }
  }, [route.params]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // Move to next stretch
      if (currentIndex < routine.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setTimeLeft(routine[currentIndex + 1].duration);
      } else {
        // Routine complete
        setIsActive(false);
        Alert.alert('Routine Complete', 'Great job! You finished your stretching routine.');
      }
    }
    
    return () => clearInterval(interval);
  }, [isActive, timeLeft, currentIndex, routine]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const skipStretch = () => {
    if (currentIndex < routine.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeLeft(routine[currentIndex + 1].duration);
      setIsActive(false);
    }
  };

  const handleFavorite = (stretchId: number) => {
    if (!isPremium) {
      Alert.alert('Premium Feature', 'Upgrade to premium to save favorites');
    } else {
      // Save to favorites logic would go here
      Alert.alert('Added to Favorites', 'This stretch has been added to your favorites');
    }
  };

  const handleDone = () => {
    if (!isPremium) {
      Alert.alert('Premium Feature', 'Upgrade to premium to track your progress');
    } else {
      // Save progress logic would go here
      Alert.alert('Progress Saved', 'Your routine has been saved to your progress');
    }
    navigation.navigate('Home', {});
  };

  const handleShare = async () => {
    try {
      // Create a text summary of the routine
      let routineText = `My ${routine.length > 0 ? routine[0].tags[0] : ''} stretching routine:\n\n`;
      
      routine.forEach((stretch, index) => {
        routineText += `${index + 1}. ${stretch.name} - ${formatTime(stretch.duration)}\n`;
      });
      
      routineText += '\nCreated with DeskStretch app';
      
      // Share the text
      const shareResult = await Sharing.shareAsync(
        // Since we can't create a file directly, we'll use a dummy URL
        // In a real app, you would create a temporary file with the text
        'file://dummy.txt',
        { dialogTitle: 'Share your stretching routine', mimeType: 'text/plain', UTI: 'public.plain-text' }
      );
      
      if (shareResult.action === Sharing.SharedAction.SHARED) {
        console.log('Shared successfully');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Sharing Error', 'Could not share your routine');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStretchItem = ({ item, index }: { item: Stretch; index: number }) => (
    <View style={[styles.stretchItem, currentIndex === index && styles.activeStretch]}>
      <Image source={item.image} style={styles.stretchImage} />
      <View style={styles.stretchInfo}>
        <Text style={styles.stretchName}>{item.name}</Text>
        <Text style={styles.stretchDescription}>{item.description}</Text>
        <Text style={styles.stretchDuration}>{formatTime(item.duration)}</Text>
      </View>
      <TouchableOpacity onPress={() => handleFavorite(item.id)}>
        <Ionicons name="star-outline" size={24} color="#FFD700" />
      </TouchableOpacity>
    </View>
  );

  if (routine.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Routine Screen</Text>
        <Text style={styles.subtext}>Generate a routine from the Home screen to get started</Text>
      </View>
    );
  }

  const currentStretch = routine[currentIndex];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Routine</Text>
      
      <FlatList
        data={routine}
        renderItem={renderStretchItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.stretchList}
      />
      
      <View style={styles.timerSection}>
        <Text style={styles.currentStretchName}>{currentStretch.name}</Text>
        <Image source={currentStretch.image} style={styles.currentStretchImage} />
        <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
        
        <View style={styles.controls}>
          <TouchableOpacity onPress={toggleTimer} style={styles.controlButton}>
            <Ionicons 
              name={isActive ? 'pause' : 'play'} 
              size={32} 
              color="#4CAF50" 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={skipStretch} style={styles.controlButton}>
            <Ionicons name="arrow-forward" size={32} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Text style={styles.buttonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
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
  },
  stretchList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  stretchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeStretch: {
    backgroundColor: '#f0f8ff',
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
  timerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  currentStretchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  currentStretchImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 16,
  },
  timer: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  controlButton: {
    marginHorizontal: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shareButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
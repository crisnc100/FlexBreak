import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { getIsPremium, getProgress } from '../utils/storage';
import { ProgressEntry } from '../types';

export default function ProgressScreen() {
  const [isPremium, setIsPremium] = useState(false);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const premium = await getIsPremium();
      setIsPremium(premium);
      
      if (premium) {
        const progressData = await getProgress();
        setProgress(progressData);
      }
    };
    
    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderProgressItem = ({ item }: { item: ProgressEntry }) => (
    <View style={styles.progressItem}>
      <Text style={styles.progressDate}>{formatDate(item.date)}</Text>
      <Text style={styles.progressDetails}>{item.area} - {item.duration} min</Text>
    </View>
  );

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Progress Screen</Text>
        <Text style={styles.subtext}>Upgrade to track your progress!</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Go Premium</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Progress</Text>
      
      {progress.length === 0 ? (
        <Text style={styles.emptyText}>No progress recorded yet. Complete a routine to see it here!</Text>
      ) : (
        <FlatList
          data={progress}
          renderItem={renderProgressItem}
          keyExtractor={(item, index) => index.toString()}
          style={styles.progressList}
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
  progressList: {
    flex: 1,
  },
  progressItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  progressDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  progressDetails: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
}); 
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../types';
import { BodyArea, Duration, RoutineParams } from '../../types';
import { generateRoutine } from '../../utils/routineGenerator';
import { saveFavoriteRoutine } from '../../services/storageService';
import XpNotificationManager from '../XpNotificationManager';

export interface CompletedRoutineProps {
  area: BodyArea;
  duration: Duration;
  isPremium: boolean;
  xpEarned?: number;
  xpBreakdown?: Array<{ source: string; amount: number; description: string }>;
  onShowDashboard: () => void;
  onNavigateHome: () => void;
  onOpenSubscription: () => void;
}

const CompletedRoutine: React.FC<CompletedRoutineProps> = ({
  area,
  duration,
  isPremium,
  xpEarned = 0,
  xpBreakdown = [],
  onShowDashboard,
  onNavigateHome,
  onOpenSubscription
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  
  // Generate the routine to get the number of stretches
  const routine = generateRoutine(area, duration, 'beginner');
  
  // Handle share
  const handleShare = async () => {
    try {
      const message = `I just completed a ${duration}-minute beginner ${area} stretching routine with DeskStretch! 💪 Earned ${xpEarned} XP!`;
      
      await Share.share({
        message,
        title: 'My DeskStretch Routine'
      });
      
      // Show dashboard first, then navigate home
      onShowDashboard();
      onNavigateHome();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // Save routine to favorites
  const saveToFavorites = async () => {
    if (!isPremium) {
      // Show subscription modal instead of alert
      onOpenSubscription();
      return;
    }
    
    try {
      // Create a routine params object
      const routineParams: RoutineParams = {
        area: area,
        duration: duration,
        level: 'beginner'
      };
      
      await saveFavoriteRoutine(routineParams);
      
      // Show dashboard first, then navigate home (no alert)
      onShowDashboard();
      onNavigateHome();
    } catch (error) {
      console.error('Error saving to favorites:', error);
    }
  };
  
  // Start a smart pick routine
  const startSmartPick = () => {
    if (!isPremium) {
      onOpenSubscription();
      return;
    }
    
    // Show dashboard first to reset state
    onShowDashboard();
    
    // Navigate home first to reset navigation state
    onNavigateHome();
    
    // Wait a moment for the navigation to complete, then navigate to the routine
    setTimeout(() => {
      // Navigate to a routine (this would be a smart pick in the full implementation)
      try {
        navigation.navigate('Routine', {
          area: 'Neck' as BodyArea,
          duration: '5' as Duration,
          level: 'beginner'
        });
      } catch (error) {
        console.error('Error navigating to smart pick routine:', error);
      }
    }, 100);
  };
  
  // Handle new routine button
  const handleNewRoutine = () => {
    console.log('New routine button pressed');
    
    // Show dashboard first to reset state
    onShowDashboard();
    
    // Then navigate home
    onNavigateHome();
  };
  
  return (
    <View style={styles.container}>
      <XpNotificationManager />
      
      <TouchableOpacity 
        style={styles.completedContainer} 
        activeOpacity={1}
        onPress={onShowDashboard}
      >
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.completedTitle}>Routine Complete!</Text>
        <Text style={styles.completedSubtitle}>Great job on your stretching routine</Text>
        
        {/* XP Display - Show either breakdown or simple display */}
        {xpBreakdown && xpBreakdown.length > 0 ? (
          <View style={styles.xpBreakdownContainer}>
            <View style={styles.xpTotalRow}>
              <Ionicons name="star" size={24} color="#FF9800" />
              <Text style={styles.xpTotalText}>
                <Text style={styles.xpValue}>{xpEarned}</Text> XP {xpEarned > 0 ? 'Earned' : 'Earned from Previous Stretch'}
              </Text>
            </View>
            
            <View style={styles.xpSeparator} />
            
            {xpBreakdown.map((item, index) => {
              // Get appropriate icon based on source
              let iconName = 'star-outline';
              switch (item.source) {
                case 'routine':
                  iconName = 'fitness-outline';
                  break;
                case 'achievement':
                  iconName = 'trophy-outline';
                  break;
                case 'first_ever':
                  iconName = 'gift-outline';
                  break;
                case 'streak':
                  iconName = 'flame-outline';
                  break;
                case 'challenge':
                  iconName = 'flag-outline';
                  break;
              }
              
              return (
                <View key={`${item.source}-${index}`} style={styles.xpBreakdownItem}>
                  <Ionicons name={iconName} size={16} color={item.amount > 0 ? "#FF9800" : "#999"} />
                  <Text style={[
                    styles.xpBreakdownText, 
                    item.amount === 0 && styles.xpBreakdownZero
                  ]}>
                    {item.amount > 0 ? (
                      <Text style={styles.xpBreakdownValue}>+{item.amount} XP</Text>
                    ) : (
                      <Text style={styles.xpBreakdownZero}>+0 XP</Text>
                    )}
                    {" "}{item.description}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          // Simple XP display when no breakdown is available
          <View style={styles.xpContainer}>
            <Ionicons name="star" size={24} color="#FF9800" />
            <Text style={styles.xpText}>
              <Text style={styles.xpValue}>{xpEarned}</Text> XP Earned
            </Text>
          </View>
        )}
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={24} color="#666" />
            <Text style={styles.statValue}>{duration} mins</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="fitness-outline" size={24} color="#666" />
            <Text style={styles.statValue}>{routine.length}</Text>
            <Text style={styles.statLabel}>Stretches</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="body-outline" size={24} color="#666" />
            <Text style={styles.statValue}>{area}</Text>
            <Text style={styles.statLabel}>Focus Area</Text>
          </View>
        </View>
        
        <Text style={styles.nextStepsText}>What would you like to do next?</Text>
        
        <View style={styles.buttonContainer}>
          {isPremium ? (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.favoriteButton]} 
                onPress={saveToFavorites}
              >
                <Ionicons name="star" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.shareButton]} 
                onPress={handleShare}
              >
                <Ionicons name="share-social-outline" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.smartPickButton]} 
                onPress={startSmartPick}
              >
                <Ionicons name="bulb" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Smart Pick</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.newRoutineButton]} 
                onPress={handleNewRoutine}
              >
                <Ionicons name="home-outline" size={20} color="#FFF" />
                <Text style={styles.buttonText}>New Routine</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.premiumButton]} 
                onPress={onOpenSubscription}
              >
                <Ionicons name="lock-closed" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.shareButton]} 
                onPress={handleShare}
              >
                <Ionicons name="share-social-outline" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.newRoutineButton]} 
                onPress={handleNewRoutine}
              >
                <Ionicons name="home-outline" size={20} color="#FFF" />
                <Text style={styles.buttonText}>New Routine</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        
        <Text style={styles.hintText}>Tap anywhere to view your routine history</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  completedSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  // New XP container styling
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  xpText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  xpValue: {
    fontWeight: 'bold',
    color: '#FF9800',
    fontSize: 18,
  },
  xpBreakdownContainer: {
    marginVertical: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  xpTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpTotalText: {
    fontSize: 18,
    color: '#333',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  xpSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
    marginVertical: 8,
  },
  xpBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 4,
  },
  xpBreakdownText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  xpBreakdownValue: {
    fontWeight: 'bold',
    color: '#FF9800',
  },
  xpBreakdownZero: {
    fontWeight: 'bold',
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  nextStepsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    margin: 8,
    minWidth: 120,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  favoriteButton: {
    backgroundColor: '#4CAF50',
  },
  shareButton: {
    backgroundColor: '#2196F3',
  },
  newRoutineButton: {
    backgroundColor: '#9C27B0',
  },
  premiumButton: {
    backgroundColor: '#FF9800',
  },
  smartPickButton: {
    backgroundColor: '#FF9800',
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  }
});

export default CompletedRoutine;
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { styles } from './styles';

interface MenuScreenProps {
  onStartTutorial: () => void;
  onStartGame: () => void;
  onSkip: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ onStartTutorial, onStartGame, onSkip }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.menuContainer}>
        <Text style={[styles.title, { color: theme.text }]}>Balance Drop</Text>
        
        <View style={[styles.instructionCard, { backgroundColor: theme.cardBackground }]}>
          <Ionicons name="scale" size={48} color={theme.accent} />
          <Text style={[styles.instructionText, { color: theme.text }]}>
            Life is about balance! Manage work, family, wellness, hobbies, goals, and social life.
          </Text>
          <Text style={[styles.strategyHint, { color: theme.textSecondary }]}>
            ⚖️ Pro tip: Sometimes saying no (discarding) is the healthiest choice!
          </Text>
        </View>
        
        <View style={styles.gameFeatures}>
          <View style={[styles.featureItem, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.weightDots}>
              <View style={[styles.dot, { backgroundColor: theme.accent }]} />
              <View style={[styles.dot, { backgroundColor: theme.accent }]} />
              <View style={[styles.dot, { backgroundColor: theme.accent }]} />
            </View>
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Heavier items = More impact
            </Text>
          </View>
          
          <View style={[styles.featureItem, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="flash" size={20} color="#FFA500" />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Manage your daily energy
            </Text>
          </View>
          
          <View style={[styles.featureItem, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="warning" size={20} color="#FF6B6B" />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Handle urgent items quickly
            </Text>
          </View>
        </View>
        
        <View style={styles.sideInfo}>
          <View style={[styles.sideCard, { backgroundColor: '#FF6B6B20' }]}>
            <Ionicons name="briefcase" size={24} color="#FF6B6B" />
            <Text style={[styles.sideLabel, { color: theme.text }]}>WORK</Text>
            <Text style={[styles.sideText, { color: theme.textSecondary }]}>Left Side</Text>
          </View>
          
          <View style={[styles.sideCard, { backgroundColor: '#4CAF5020' }]}>
            <Ionicons name="heart" size={24} color="#4CAF50" />
            <Text style={[styles.sideLabel, { color: theme.text }]}>WELLNESS</Text>
            <Text style={[styles.sideText, { color: theme.textSecondary }]}>Right Side</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.accent }]}
          onPress={onStartGame}
        >
          <Text style={styles.startButtonText}>Start Game</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.border, marginTop: -8 }]}
          onPress={onStartTutorial}
        >
          <Text style={[styles.startButtonText, { color: theme.text }]}>Play Tutorial</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onSkip}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip Game</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../context/ThemeContext';

type ActionButtonsProps = {
  isPremium: boolean;
  showAnyLevelUp: boolean;
  theme: Theme;
  onSaveToFavorites: () => void;
  onSmartPick: () => void;
  onNewRoutine: () => void;
  onOpenSubscription: () => void;
};

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isPremium,
  showAnyLevelUp,
  theme,
  onSaveToFavorites,
  onSmartPick,
  onNewRoutine,
  onOpenSubscription
}) => {
  return (
    <View style={[
      styles.buttonContainer,
      showAnyLevelUp && styles.buttonContainerCompact
    ]}>
      {isPremium ? (
        <>
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.favoriteButton,
              showAnyLevelUp && styles.buttonCompact
            ]} 
            onPress={onSaveToFavorites}
          >
            <Ionicons name="star" size={showAnyLevelUp ? 16 : 20} color="#FFF" />
            <Text style={[
              styles.buttonText,
              showAnyLevelUp && styles.buttonTextCompact
            ]}>Save</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.smartPickButton,
              showAnyLevelUp && styles.buttonCompact
            ]} 
            onPress={onSmartPick}
          >
            <Ionicons name="bulb" size={showAnyLevelUp ? 16 : 20} color="#FFF" />
            <Text style={[
              styles.buttonText,
              showAnyLevelUp && styles.buttonTextCompact
            ]}>Smart Pick</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity 
          style={[styles.button, styles.premiumButton]} 
          onPress={onOpenSubscription}
        >
          <Ionicons name="star" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Get Premium</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        style={[
          styles.button, 
          styles.newRoutineButton,
          { backgroundColor: theme.accent },
          showAnyLevelUp && styles.buttonCompact
        ]} 
        onPress={onNewRoutine}
      >
        <Ionicons name="home-outline" size={showAnyLevelUp ? 16 : 20} color="#FFF" />
        <Text style={[
          styles.buttonText,
          showAnyLevelUp && styles.buttonTextCompact
        ]}>New Routine</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  buttonContainerCompact: {
    marginTop: 0,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 6,
    marginBottom: 12,
    minWidth: 120,
  },
  buttonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
    marginBottom: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  buttonTextCompact: {
    fontSize: 12,
  },
  favoriteButton: {
    backgroundColor: '#FF9800',
  },
  smartPickButton: {
    backgroundColor: '#9C27B0',
  },
  premiumButton: {
    backgroundColor: '#FF9800',
    minWidth: 150,
  },
  newRoutineButton: {
    minWidth: 150,
  },
});

export default ActionButtons; 
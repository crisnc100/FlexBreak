import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { PostureFigure } from './types';

export type ActionType = 'neck' | 'upper_back_chest' | 'lower_back' | 'hips_legs' | 'full_body' | 'dynamic_flow';

interface SimpleActionButtonsProps {
  selectedFigure: PostureFigure | null;
  onActionSelect: (action: ActionType) => void;
  fullBodyCooldown: number;
  dynamicFlowCooldown: number;
}

export const SimpleActionButtons: React.FC<SimpleActionButtonsProps> = ({
  selectedFigure,
  onActionSelect,
  fullBodyCooldown,
  dynamicFlowCooldown,
}) => {
  const { theme } = useTheme();

  const getCorrectAction = (monsterType: string): ActionType => {
    switch (monsterType) {
      case 'tech_neck': return 'neck';
      case 'desk_hunch': return 'upper_back_chest';
      case 'slouch_slump': return 'lower_back';
      case 'lean_twist': return 'hips_legs';
      default: return 'neck';
    }
  };

  const mainActions = [
    {
      id: 'neck' as ActionType,
      icon: 'body-outline',
      label: 'NECK',
      color: '#FF6B6B',
    },
    {
      id: 'upper_back_chest' as ActionType,
      icon: 'fitness-outline',
      label: 'UPPER BACK\n& CHEST', 
      color: '#4ECDC4',
    },
    {
      id: 'lower_back' as ActionType,
      icon: 'walk-outline',
      label: 'LOWER\nBACK',
      color: '#45B7D1',
    },
    {
      id: 'hips_legs' as ActionType,
      icon: 'walk',
      label: 'HIPS &\nLEGS',
      color: '#96CEB4',
    },
  ];

  const specialActions = [
    {
      id: 'full_body' as ActionType,
      icon: 'body',
      label: 'FULL BODY',
      color: '#9B59B6',
      cooldown: fullBodyCooldown,
      description: 'Works on any monster',
    },
    {
      id: 'dynamic_flow' as ActionType,
      icon: 'flash',
      label: 'DYNAMIC\nFLOW',
      color: '#E67E22',
      cooldown: dynamicFlowCooldown,
      description: 'Works on any monster + bonus',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: (theme.cardBackground || '#FFFFFF') + 'EE' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text || '#000000' }]}>
          {selectedFigure ? 'Choose Your Stretch!' : 'Tap a Monster First'}
        </Text>
        {selectedFigure && (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Target: {selectedFigure.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        )}
      </View>
      
      {/* Main Action Buttons */}
      <View style={styles.mainButtonsContainer}>
        {mainActions.map((action) => {
          const isCorrect = selectedFigure && getCorrectAction(selectedFigure.type) === action.id;
          const isSelected = selectedFigure !== null;
          
          return (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.mainActionButton,
                {
                  backgroundColor: isCorrect ? '#4CAF50' : action.color,
                  opacity: isSelected ? 1 : 0.6,
                  borderColor: isCorrect ? '#2E7D32' : 'transparent',
                  borderWidth: isCorrect ? 3 : 0,
                }
              ]}
              onPress={() => onActionSelect(action.id)}
              disabled={!selectedFigure}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={action.icon as any} 
                size={24} 
                color="#FFFFFF" 
              />
              <Text style={styles.mainActionLabel}>
                {action.label}
              </Text>
              {isCorrect && (
                <View style={styles.correctIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Special Action Buttons */}
      <View style={styles.specialButtonsContainer}>
        {specialActions.map((action) => {
          const isOnCooldown = action.cooldown > 0;
          const isSelected = selectedFigure !== null;
          
          return (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.specialActionButton,
                {
                  backgroundColor: action.color,
                  opacity: isOnCooldown ? 0.4 : (isSelected ? 1 : 0.6),
                }
              ]}
              onPress={() => onActionSelect(action.id)}
              disabled={!selectedFigure || isOnCooldown}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={action.icon as any} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.specialActionLabel}>
                {action.label}
              </Text>
              
              {/* Cooldown overlay */}
              {isOnCooldown && (
                <View style={styles.cooldownOverlay}>
                  <Text style={styles.cooldownText}>
                    {Math.ceil(action.cooldown)}s
                  </Text>
                </View>
              )}
              
              {/* Universal indicator */}
              {!isOnCooldown && (
                <View style={styles.universalIndicator}>
                  <Ionicons name="star" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  
  // Main action buttons (4 stretch categories)
  mainButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  mainActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 65,
  },
  mainActionLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 11,
  },
  
  // Special action buttons (Full Body, Dynamic Flow)
  specialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  specialActionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 50,
  },
  specialActionLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 10,
  },
  
  // Indicators and overlays
  correctIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  universalIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  cooldownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cooldownText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
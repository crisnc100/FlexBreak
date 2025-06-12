import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';

const { width } = Dimensions.get('window');

export interface BuildSlot {
  id: number;
  padType: string | null;
  level: number;
}

interface BuildSlotGridProps {
  slots: BuildSlot[];
  onSlotPress: (slotId: number) => void;
  onSlotDrop: (slotId: number, padType: string) => void;
}

export const BuildSlotGrid: React.FC<BuildSlotGridProps> = ({
  slots,
  onSlotPress,
  onSlotDrop,
}) => {
  const { theme } = useTheme();

  const getPadIcon = (padType: string | null) => {
    switch (padType) {
      case 'headspace_halo': return 'radio-button-on';
      case 'hip_hop_platform': return 'square';
      case 'chest_quest_pad': return 'shield';
      case 'armory_arc': return 'triangle';
      default: return 'add';
    }
  };

  const getPadColor = (padType: string | null) => {
    switch (padType) {
      case 'headspace_halo': return '#FF6B6B';
      case 'hip_hop_platform': return '#96CEB4';
      case 'chest_quest_pad': return '#4ECDC4';
      case 'armory_arc': return '#9B59B6';
      default: return theme.textSecondary || '#999999';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        BUILD SLOTS
      </Text>
      
      <View style={styles.grid}>
        {slots.map((slot) => (
          <TouchableOpacity
            key={slot.id}
            style={[
              styles.slot,
              {
                backgroundColor: theme.cardBackground,
                borderColor: slot.padType ? getPadColor(slot.padType) : theme.border,
                borderWidth: slot.padType ? 2 : 1,
              }
            ]}
            onPress={() => onSlotPress(slot.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={getPadIcon(slot.padType) as any}
              size={32}
              color={getPadColor(slot.padType)}
            />
            
            {slot.padType && (
              <View style={styles.levelIndicator}>
                <Text style={styles.levelText}>
                  Lv.{slot.level}
                </Text>
              </View>
            )}
            
            {!slot.padType && (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                TAP TO BUILD
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  slot: {
    width: (width - 32 - 36) / 2, // Account for padding and gap
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  levelIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
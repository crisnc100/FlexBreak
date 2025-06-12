import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';

export interface PadType {
  id: string;
  name: string;
  icon: string;
  color: string;
  cost: number;
  unlocked: boolean;
  description: string;
}

interface PadInventoryProps {
  pads: PadType[];
  energy: number;
  onPadSelect: (padType: string) => void;
  selectedPad: string | null;
}

export const PadInventory: React.FC<PadInventoryProps> = ({
  pads,
  energy,
  onPadSelect,
  selectedPad,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        STRETCH PADS
      </Text>
      
      <View style={styles.padsList}>
        {pads.map((pad) => {
          const canAfford = energy >= pad.cost;
          const isSelected = selectedPad === pad.id;
          const isAvailable = pad.unlocked && canAfford;
          
          return (
            <TouchableOpacity
              key={pad.id}
              style={[
                styles.padButton,
                {
                  backgroundColor: isSelected ? pad.color : 'transparent',
                  borderColor: pad.color,
                  opacity: pad.unlocked ? (canAfford ? 1 : 0.5) : 0.3,
                }
              ]}
              onPress={() => isAvailable && onPadSelect(pad.id)}
              disabled={!isAvailable}
              activeOpacity={0.7}
            >
              <Ionicons
                name={pad.icon as any}
                size={24}
                color={isSelected ? '#FFFFFF' : pad.color}
              />
              
              <View style={styles.padInfo}>
                <Text style={[
                  styles.padName,
                  { color: isSelected ? '#FFFFFF' : theme.text }
                ]}>
                  {pad.name}
                </Text>
                
                <View style={styles.costContainer}>
                  <Ionicons
                    name="battery-charging"
                    size={12}
                    color={isSelected ? '#FFFFFF' : '#FFD700'}
                  />
                  <Text style={[
                    styles.costText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary }
                  ]}>
                    {pad.cost}
                  </Text>
                </View>
              </View>
              
              {!pad.unlocked && (
                <View style={styles.lockOverlay}>
                  <Ionicons name="lock-closed" size={16} color="#666666" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {selectedPad && (
        <View style={styles.description}>
          <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
            {pads.find(p => p.id === selectedPad)?.description}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    margin: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  padsList: {
    gap: 8,
  },
  padButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  padInfo: {
    flex: 1,
    marginLeft: 12,
  },
  padName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costText: {
    fontSize: 12,
    fontWeight: '500',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  descriptionText: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
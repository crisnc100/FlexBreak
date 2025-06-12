import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { PAD_CONFIG } from './constants';

interface PadInventoryComponentProps {
  theme: any;
  unlockedPads: Set<string>;
  selectedPadType: string | null;
  energy: number;
  onPadSelect: (padType: string) => void;
}

export const PadInventoryComponent: React.FC<PadInventoryComponentProps> = ({
  theme,
  unlockedPads,
  selectedPadType,
  energy,
  onPadSelect
}) => {
  return (
    <View style={styles.padInventory}>
      {Object.values(PAD_CONFIG).map(pad => {
        const isUnlocked = unlockedPads.has(pad.id);
        const canAfford = energy >= pad.cost;
        const isSelected = selectedPadType === pad.id;
        
        return (
          <TouchableOpacity
            key={pad.id}
            style={[
              styles.padButton,
              {
                backgroundColor: isSelected ? pad.color + '40' : theme.cardBackground,
                borderColor: isSelected ? pad.color : theme.border,
                opacity: isUnlocked && canAfford ? 1 : 0.5,
              }
            ]}
            onPress={() => {
              if (isUnlocked && canAfford) {
                onPadSelect(pad.id);
              }
            }}
            disabled={!isUnlocked || !canAfford}
          >
            <Image source={pad.image} style={styles.padIcon} resizeMode="contain" />
            <Text style={[styles.padCost, { color: theme.text }]}>
              {pad.cost}⚡
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  padInventory: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 8,
  },
  padButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padIcon: {
    width: 40,
    height: 40,
  },
  padCost: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
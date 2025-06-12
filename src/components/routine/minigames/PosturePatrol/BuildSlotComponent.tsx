import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { PlacedPad } from './types';
import { PAD_CONFIG, BUILD_SLOTS, POSITIONS, GAME_GRID } from './constants';
import { gridToPixel } from './utils';

const { width } = Dimensions.get('window');

interface BuildSlotComponentProps {
  slot: typeof BUILD_SLOTS[0];
  placedPad: PlacedPad | undefined;
  theme: any;
  onPress: (slotId: number) => void;
}

// Cache calculations outside component for performance
const gameWidth = GAME_GRID.COLS * GAME_GRID.CELL_SIZE;
const offsetX = (width - gameWidth) / 2;
const offsetY = 120;

export const BuildSlotComponent: React.FC<BuildSlotComponentProps> = React.memo(({
  slot,
  placedPad,
  theme,
  onPress
}) => {
  const pixelPos = gridToPixel(slot.gridX, slot.gridY);
  
  return (
    <TouchableOpacity
      style={[
        styles.buildSlot,
        {
          left: offsetX + pixelPos.x - POSITIONS.BUILD_SLOT_SIZE / 2,
          top: offsetY + pixelPos.y - POSITIONS.BUILD_SLOT_SIZE / 2,
          backgroundColor: placedPad ? PAD_CONFIG[placedPad.padType].color + '40' : 'rgba(255,255,255,0.1)',
          borderColor: placedPad ? PAD_CONFIG[placedPad.padType].color : theme.accent,
        }
      ]}
      onPress={() => onPress(slot.id)}
    >
      {placedPad ? (
        <>
          <Image 
            source={PAD_CONFIG[placedPad.padType].image}
            style={styles.padImage}
            resizeMode="contain"
          />
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv.{placedPad.level}</Text>
          </View>
        </>
      ) : (
        <Text style={[styles.slotLabel, { color: theme.accent }]}>
          {slot.label}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  buildSlot: {
    position: 'absolute',
    width: POSITIONS.BUILD_SLOT_SIZE,
    height: POSITIONS.BUILD_SLOT_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padImage: {
    width: POSITIONS.PAD_SIZE,
    height: POSITIONS.PAD_SIZE,
  },
  levelBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  slotLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
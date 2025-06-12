import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

interface DamageNumberProps {
  damage: number;
  x: number;
  y: number;
  color: string;
}

export const DamageNumber: React.FC<DamageNumberProps> = ({
  damage,
  x,
  y,
  color
}) => {
  return (
    <View
      style={[
        styles.damageNumber,
        {
          left: x - 20,
          top: y - 20,
        }
      ]}
    >
      <Text style={[styles.damageText, { color }]}>
        {damage}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  damageNumber: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 100,
  },
  damageText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
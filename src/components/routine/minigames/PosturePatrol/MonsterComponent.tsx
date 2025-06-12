import React from 'react';
import {
  View,
  Image,
  StyleSheet,
} from 'react-native';
import { Monster, MonsterType } from './types';
import { gridToPixel } from './utils';
import { POSITIONS, GAME_GRID } from './constants';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface MonsterComponentProps {
  monster: Monster;
  theme: any;
}

const getFigureImage = (type: MonsterType) => {
  const images = {
    tech_neck: require('../../../../../assets/images/miniGames/techNeck.png'),
    desk_hunch: require('../../../../../assets/images/miniGames/deskHunch2.png'),
    slouch_slump: require('../../../../../assets/images/miniGames/slouchSlump.png'),
    lean_twist: require('../../../../../assets/images/miniGames/leanTwist.png'),
    boss_posture: require('../../../../../assets/images/miniGames/deskHunch1.png'),
  };
  return images[type];
};

// Cache calculations outside component for performance
const gameWidth = GAME_GRID.COLS * GAME_GRID.CELL_SIZE;
const offsetX = (width - gameWidth) / 2;
const offsetY = 120;

export const MonsterComponent: React.FC<MonsterComponentProps> = React.memo(({
  monster,
  theme
}) => {
  const pixelPos = gridToPixel(monster.position.x, monster.position.y);
  
  return (
    <View
      style={[
        styles.monster,
        {
          left: offsetX + pixelPos.x - POSITIONS.MONSTER_SIZE / 2,
          top: offsetY + pixelPos.y - POSITIONS.MONSTER_SIZE / 2,
        }
      ]}
    >
      <Image 
        source={getFigureImage(monster.type)}
        style={styles.monsterImage}
        resizeMode="contain"
      />
      {/* HP Bar */}
      <View style={styles.hpBarContainer}>
        <View 
          style={[
            styles.hpBar, 
            { 
              width: `${(monster.hp / monster.maxHp) * 100}%`,
              backgroundColor: monster.isBoss ? '#FF4444' : theme.accent
            }
          ]} 
        />
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.monster.position.x === nextProps.monster.position.x &&
    prevProps.monster.position.y === nextProps.monster.position.y &&
    prevProps.monster.hp === nextProps.monster.hp &&
    prevProps.theme === nextProps.theme
  );
});

const styles = StyleSheet.create({
  monster: {
    position: 'absolute',
    width: POSITIONS.MONSTER_SIZE,
    height: POSITIONS.MONSTER_SIZE,
    alignItems: 'center',
  },
  monsterImage: {
    width: POSITIONS.MONSTER_SIZE,
    height: POSITIONS.MONSTER_SIZE,
  },
  hpBarContainer: {
    width: POSITIONS.MONSTER_SIZE,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 2,
  },
  hpBar: {
    height: '100%',
    borderRadius: 2,
  },
});
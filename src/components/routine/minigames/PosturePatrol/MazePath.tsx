import React from 'react';
import { View, StyleSheet, Dimensions, Text, Image } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { PATH_WAYPOINTS, BUILD_SLOTS, GAME_GRID } from './constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MazePathProps {
  showGrid?: boolean;
}

export const MazePath: React.FC<MazePathProps> = ({ showGrid = false }) => {
  const { theme } = useTheme();
  
  // Calculate game area dimensions  
  const gameWidth = GAME_GRID.COLS * GAME_GRID.CELL_SIZE;
  const gameHeight = GAME_GRID.ROWS * GAME_GRID.CELL_SIZE;
  const offsetX = (screenWidth - gameWidth) / 2;
  const offsetY = 170; // Move game area much lower for better positioning
  
  // Create path segments with direction
  const renderPathSegments = () => {
    const segments = [];
    
    for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
      const current = PATH_WAYPOINTS[i];
      const next = PATH_WAYPOINTS[i + 1];
      
      const startX = current.x * GAME_GRID.CELL_SIZE + GAME_GRID.CELL_SIZE / 2;
      const startY = current.y * GAME_GRID.CELL_SIZE + GAME_GRID.CELL_SIZE / 2;
      const endX = next.x * GAME_GRID.CELL_SIZE + GAME_GRID.CELL_SIZE / 2;
      const endY = next.y * GAME_GRID.CELL_SIZE + GAME_GRID.CELL_SIZE / 2;
      
      // Calculate segment properties
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      
      // Create path segment
      segments.push(
        <View
          key={`segment-${i}`}
          style={[
            styles.pathSegment,
            {
              left: startX - 10,
              top: startY - 10,
              width: length,
              height: 20,
              backgroundColor: theme.accent + '40',
              transform: [{ rotate: `${angle}deg` }],
            }
          ]}
        />
      );
      
      // Add directional arrow every few segments
      if (i % 3 === 0) {
        const midX = startX + deltaX * 0.7;
        const midY = startY + deltaY * 0.7;
        
        segments.push(
          <View
            key={`arrow-${i}`}
            style={[
              styles.directionArrow,
              {
                left: midX - 8,
                top: midY - 8,
                transform: [{ rotate: `${angle}deg` }],
              }
            ]}
          >
            <Text style={[styles.arrowText, { color: theme.accent }]}>➤</Text>
          </View>
        );
      }
    }
    
    return segments;
  };
  
  // Render build slot indicators
  const renderBuildSlots = () => {
    const slotIcons = ['🏗️', '⚡', '🛡️', '🎯']; // Icons representing strategic positions
    const slotNames = [
      'First Line',
      'Corner Guard', 
      'Mid Defense',
      'Last Stand'
    ];
    
    return BUILD_SLOTS.map((slot, index) => {
      const slotX = slot.gridX * GAME_GRID.CELL_SIZE + GAME_GRID.CELL_SIZE / 2 - 30;
      const slotY = slot.gridY * GAME_GRID.CELL_SIZE + GAME_GRID.CELL_SIZE / 2 - 30;
      
      return (
        <View
          key={`build-slot-${slot.id}`}
          style={[
            styles.buildSlotIndicator,
            {
              left: slotX,
              top: slotY,
              borderColor: theme.accent + '80',
              backgroundColor: theme.cardBackground + '20',
            }
          ]}
        >
          <Text style={styles.buildSlotIcon}>
            {slotIcons[index]}
          </Text>
          <Text style={[styles.buildSlotName, { color: theme.accent }]}>
            {slotNames[index]}
          </Text>
        </View>
      );
    });
  };
  
  return (
    <View style={[
      StyleSheet.absoluteFillObject,
      {
        backgroundColor: theme.background,
      }
    ]}>
      {/* Game board area */}
      <View style={[
        styles.gameBoard,
        {
          left: offsetX,
          top: offsetY,
          width: gameWidth,
          height: gameHeight,
          backgroundColor: theme.cardBackground + '20',
          borderColor: theme.border,
        }
      ]}>
        {/* Grid background (optional) */}
        {showGrid && (
          <View style={styles.gridContainer}>
            {Array.from({ length: GAME_GRID.ROWS + 1 }, (_, row) => (
              <View
                key={`h-line-${row}`}
                style={[
                  styles.gridLineHorizontal,
                  {
                    top: row * GAME_GRID.CELL_SIZE,
                    backgroundColor: theme.border + '30',
                  }
                ]}
              />
            ))}
            {Array.from({ length: GAME_GRID.COLS + 1 }, (_, col) => (
              <View
                key={`v-line-${col}`}
                style={[
                  styles.gridLineVertical,
                  {
                    left: col * GAME_GRID.CELL_SIZE,
                    backgroundColor: theme.border + '30',
                  }
                ]}
              />
            ))}
          </View>
        )}
        
        {/* Path segments with direction */}
        {renderPathSegments()}
        
        {/* Build slot indicators */}
        {renderBuildSlots()}
        
        {/* Spawn indicator */}
        <View style={[
          styles.spawnPoint,
          {
            backgroundColor: '#FF4444',
            left: PATH_WAYPOINTS[0].x * GAME_GRID.CELL_SIZE - 25,
            top: PATH_WAYPOINTS[0].y * GAME_GRID.CELL_SIZE - 25,
            borderColor: '#FFFFFF',
            borderWidth: 3,
            elevation: 8,
            shadowColor: '#FF4444',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.6,
            shadowRadius: 8,
          }
        ]}>
          <Text style={styles.spawnText}>⚠️ SPAWN</Text>
          <Text style={styles.spawnSubtext}>Monsters Enter</Text>
        </View>
        
        {/* Defender position with actual image */}
        <View style={[
          styles.defenderPoint,
          {
            left: PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1].x * GAME_GRID.CELL_SIZE - 30,
            top: PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1].y * GAME_GRID.CELL_SIZE - 30,
          }
        ]}>
          <Image 
            source={require('../../../../../assets/images/miniGames/defendingFigure2.png')}
            style={styles.defenderImage}
            resizeMode="contain"
          />
          <Text style={[styles.defenderLabel, { color: theme.success }]}>DEFEND</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gameBoard: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 8,
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  pathSegment: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  directionArrow: {
    position: 'absolute',
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  buildSlotIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  buildSlotIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  buildSlotName: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  spawnPoint: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spawnText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  spawnSubtext: {
    color: 'white',
    fontSize: 8,
    textAlign: 'center',
  },
  defenderPoint: {
    position: 'absolute',
    width: 60,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defenderImage: {
    width: 50,
    height: 50,
  },
  defenderLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
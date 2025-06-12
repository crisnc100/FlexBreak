import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';

// Import components
import { TutorialScreen } from './TutorialScreen';
import { ExitAlert } from './ExitAlert';
import { GameHUD } from './GameHUD';
import { MonsterComponent } from './MonsterComponent';
import { BuildSlotComponent } from './BuildSlotComponent';
import { DamageNumber } from './DamageNumber';
import { PadInventoryComponent } from './PadInventoryComponent';
import { MazePath } from './MazePath';
import { StretchEffects } from './StretchEffects';
import { WaveAnnouncementComponent } from './WaveAnnouncementComponent';
import { UpgradeMenu } from './UpgradeMenu';
import { GameResultsScreen } from './GameResultsScreen';

import { GameState } from './types';
import { BUILD_SLOTS, GAME_GRID } from './constants';
import { gridToPixel } from './utils';

const { width } = Dimensions.get('window');

interface GameRendererProps {
  // State props
  gameState: GameState;
  selectedPadType: string | null;
  selectedSlot: number | null;
  showTutorial: boolean;
  showUpgradeMenu: boolean;
  gamePaused: boolean;
  showExitAlert: boolean;
  showWaveAnnouncement: boolean;
  showQuickStartGuide: boolean;
  showResultsScreen: boolean;
  gameResults: {
    finalScore: number;
    xpEarned: number;
    isVictory: boolean;
  } | null;
  unlockedPads: Set<string>;
  stretchEffects: Array<{
    id: string;
    type: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    onComplete: () => void;
  }>;
  damageNumbers: Array<{
    id: string;
    x: number;
    y: number;
    damage: number;
    color: string;
    effectiveness: string;
  }>;
  showRangeIndicator: {
    slotId: number;
    padType: string;
    range: number;
  } | null;
  gameStats: {
    totalKills: number;
    padsBuilt: number;
    upgradesMade: number;
    energyEarned: number;
  };

  // Event handlers
  onStart: () => void;
  onSmartSkip: () => void;
  onSkip: () => void;
  onSlotPress: (slotId: number) => void;
  onPadSelect: (padType: string) => void;
  onPadUpgrade: (slotId: number) => void;
  onPadSell: (slotId: number) => void;
  onSkipPress: () => void;
  onConfirmExit: () => void;
  onCancelExit: () => void;
  onWaveAnnouncementComplete: () => void;
  onResultsContinue: () => void;
  onUpgradeMenuClose: () => void;
}

export const GameRenderer: React.FC<GameRendererProps> = ({
  // State props
  gameState,
  selectedPadType,
  selectedSlot,
  showTutorial,
  showUpgradeMenu,
  gamePaused,
  showExitAlert,
  showWaveAnnouncement,
  showQuickStartGuide,
  showResultsScreen,
  gameResults,
  unlockedPads,
  stretchEffects,
  damageNumbers,
  showRangeIndicator,
  gameStats,

  // Event handlers
  onStart,
  onSmartSkip,
  onSkip,
  onSlotPress,
  onPadSelect,
  onPadUpgrade,
  onPadSell,
  onSkipPress,
  onConfirmExit,
  onCancelExit,
  onWaveAnnouncementComplete,
  onResultsContinue,
  onUpgradeMenuClose,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {showTutorial ? (
        <TutorialScreen
          theme={theme}
          onSkip={onSkip}
          onStart={onStart}
          onSmartSkip={onSmartSkip}
        />
      ) : showResultsScreen && gameResults ? (
        // Game Results Screen
        <GameResultsScreen
          gameState={gameState}
          gameStats={gameStats}
          finalScore={gameResults.finalScore}
          xpEarned={gameResults.xpEarned}
          isVictory={gameResults.isVictory}
          theme={theme}
          onContinue={onResultsContinue}
        />
      ) : (
        // Tower Defense Game Screen
        <View style={styles.gameScreen}>
          {/* Maze Path Background */}
          <MazePath />

          {/* Game HUD */}
          <GameHUD gameState={gameState} theme={theme} />

          {/* Monsters */}
          {gameState.monsters.map((monster) => (
            <MonsterComponent
              key={monster.id}
              monster={monster}
              theme={theme}
            />
          ))}

          {/* Build Slots with Placed Pads */}
          {BUILD_SLOTS.map(slot => {
            const placedPad = gameState.placedPads.find(p => p.slotId === slot.id);
            
            return (
              <BuildSlotComponent
                key={slot.id}
                slot={slot}
                placedPad={placedPad}
                theme={theme}
                onPress={onSlotPress}
              />
            );
          })}

          {/* Pad Inventory */}
          <PadInventoryComponent
            theme={theme}
            unlockedPads={unlockedPads}
            selectedPadType={selectedPadType}
            energy={gameState.energy}
            onPadSelect={onPadSelect}
          />

          {/* Damage Numbers */}
          {damageNumbers.map((damageNumber) => (
            <DamageNumber
              key={damageNumber.id}
              damage={damageNumber.damage}
              x={damageNumber.x}
              y={damageNumber.y}
              color={damageNumber.color}
            />
          ))}

          {/* Range Indicator */}
          {showRangeIndicator && (
            (() => {
              const slot = BUILD_SLOTS.find(s => s.id === showRangeIndicator.slotId);
              if (!slot) return null;
              
              const gameWidth = GAME_GRID.COLS * GAME_GRID.CELL_SIZE;
              const offsetX = (width - gameWidth) / 2;
              const offsetY = 120;
              const pixelPos = gridToPixel(slot.gridX, slot.gridY);
              const rangePixels = showRangeIndicator.range;
              
              return (
                <View
                  style={[
                    styles.rangeIndicator,
                    {
                      left: offsetX + pixelPos.x - rangePixels,
                      top: offsetY + pixelPos.y - rangePixels,
                      width: rangePixels * 2,
                      height: rangePixels * 2,
                    }
                  ]}
                />
              );
            })()
          )}

          {/* Stretch Effects */}
          <StretchEffects effects={stretchEffects} />

          {/* Skip Button during game */}
          <TouchableOpacity 
            style={[styles.skipGameButton, { backgroundColor: theme.cardBackground }]}
            onPress={onSkipPress}
          >
            <Text style={[styles.skipGameButtonText, { color: theme.textSecondary }]}>
              Skip Game
            </Text>
          </TouchableOpacity>

          {/* Quick Start Guide Overlay */}
          {showQuickStartGuide && (
            <View style={styles.quickStartOverlay}>
              <View style={[styles.quickStartCard, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.quickStartTitle, { color: theme.accent }]}>
                  🚀 Quick Start!
                </Text>
                <Text style={[styles.quickStartText, { color: theme.text }]}>
                  • Extra energy to start!{"\n"}
                  • Tap inventory to select pads{"\n"}
                  • Tap empty slots to build{"\n"}
                  • Defend your posture!
                </Text>
              </View>
            </View>
          )}

          {/* Wave Announcement */}
          {showWaveAnnouncement && (
            <WaveAnnouncementComponent
              wave={gameState.currentWave}
              phase={gameState.gamePhase}
              theme={theme}
              onComplete={onWaveAnnouncementComplete}
            />
          )}

          {/* Upgrade Menu */}
          {showUpgradeMenu && selectedSlot !== null && (
            <UpgradeMenu
              visible={showUpgradeMenu}
              pad={gameState.placedPads.find(p => p.slotId === selectedSlot) || null}
              energy={gameState.energy}
              theme={theme}
              onClose={onUpgradeMenuClose}
              onUpgrade={onPadUpgrade}
              onSell={onPadSell}
            />
          )}

          {/* Exit Confirmation Alert */}
          {showExitAlert && (
            <ExitAlert
              theme={theme}
              onConfirm={onConfirmExit}
              onCancel={onCancelExit}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gameScreen: {
    flex: 1,
  },
  rangeIndicator: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.1)',
    pointerEvents: 'none',
    zIndex: 5,
  },
  skipGameButton: {
    position: 'absolute',
    bottom: 130,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  skipGameButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickStartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  quickStartCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  quickStartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  quickStartText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
});
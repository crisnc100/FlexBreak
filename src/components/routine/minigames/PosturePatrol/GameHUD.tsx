import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { EnergyBank } from './EnergyBank';
import { HeartDisplay } from './HeartDisplay';
import { GameState } from './types';

interface GameHUDProps {
  gameState: GameState;
  theme: any;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  theme
}) => {
  return (
    <>
      {/* Clean Top HUD Bar */}
      <View style={[styles.topHudBar, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
        {/* Left Section - Wave Info */}
        <View style={styles.hudSection}>
          <Text style={[styles.compactWaveText, { 
            color: gameState.gamePhase === 'boss' ? '#FF4444' :
                   gameState.gamePhase === 'prepare' ? '#4ECDC4' :
                   gameState.gamePhase === 'tutorial' ? '#FFD700' :
                   theme.accent
          }]}>
            {gameState.gamePhase === 'prepare' ? '🏗️ Prepare for Battle!' :
             gameState.gamePhase === 'tutorial' ? '📚 Tutorial Wave' :
             gameState.gamePhase === 'boss' ? '👹 BOSS WAVE!' :
             `⚔️ Wave ${gameState.currentWave} (${gameState.gamePhase})`}
          </Text>
          {gameState.gamePhase !== 'prepare' && (
            <Text style={[styles.waveSubtext, { color: theme.textSecondary }]}>
              {gameState.gamePhase === 'tutorial' ? 'Learn the basics' :
               gameState.gamePhase === 'boss' ? 'Final challenge!' :
               `Incoming assault`}
            </Text>
          )}
        </View>

        {/* Center Section - Resources */}
        <View style={styles.hudSectionCenter}>
          <EnergyBank energy={gameState.energy} />
          <View style={styles.verticalSeparator} />
          <HeartDisplay hearts={gameState.hearts} />
        </View>

        {/* Right Section - Timer & Score */}
        <View style={styles.hudSectionRight}>
          <Text style={[styles.compactTimeText, { color: theme.accent }]}>
            {gameState.timeLeft}s
          </Text>
          <Text style={[styles.compactScoreText, { color: theme.textSecondary }]}>
            {gameState.score}
          </Text>
        </View>
      </View>

      {/* Simple Tutorial Tooltip */}
      {gameState.gamePhase === 'prepare' && (
        <View style={[styles.simpleTooltip, { backgroundColor: theme.accent + 'E6' }]}>
          <Text style={[styles.tooltipText, { color: 'white' }]}>
            🎯 Select stretch pads below → Tap build slots to place → Defend the figure!
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  topHudBar: {
    position: 'absolute',
    top: 40,
    left: 8,
    right: 8,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  hudSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  hudSectionCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hudSectionRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  verticalSeparator: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  compactWaveText: {
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  waveSubtext: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  compactTimeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  compactScoreText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  simpleTooltip: {
    position: 'absolute',
    bottom: 200,
    left: 12,
    right: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tooltipText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
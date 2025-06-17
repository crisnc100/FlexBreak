import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { WellnessTrueFalse } from './minigames/WellnessTrueFalse';
import { StressBuster } from './minigames/StressBuster';
import { PosturePatrol } from './minigames/PosturePatrol';
import { BalanceDrop } from './minigames/BalanceDrop/index';
import * as haptics from '../../utils/haptics';
import { 
  MiniGameType, 
  MiniGameInfo, 
  getAvailableGames,
  recordMiniGamePlayed 
} from '../../services/miniGameService';

const { width, height } = Dimensions.get('window');

interface MiniGamePopupProps {
  visible: boolean;
  onClose: () => void;
  onXpEarned: (xp: number) => void;
  isPremium: boolean;
}

export const MiniGamePopup: React.FC<MiniGamePopupProps> = ({
  visible,
  onClose,
  onXpEarned,
  isPremium,
}) => {
  const { theme } = useTheme();
  const [showGame, setShowGame] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [availableGames, setAvailableGames] = useState<MiniGameInfo[]>([]);
  const [selectedGame, setSelectedGame] = useState<MiniGameType | null>(null);

  // Load available games when popup becomes visible
  useEffect(() => {
    if (visible) {
      loadAvailableGames();
    }
  }, [visible, isPremium]);

  const loadAvailableGames = async () => {
    const games = await getAvailableGames(isPremium);
    setAvailableGames(games);
    
    // Randomly select one game from available games
    if (games.length > 0) {
      const randomIndex = Math.floor(Math.random() * games.length);
      setSelectedGame(games[randomIndex].id);
    }
  };

  const handlePlayGame = () => {
    haptics.light();
    setShowGame(true);
  };

  const handleGameComplete = async (score: number, xp: number) => {
    setEarnedXp(xp);
    setGameCompleted(true);
    onXpEarned(xp);
    
    // Record the game played
    if (selectedGame) {
      let isPerfectScore = false;
      
      // Determine perfect score based on game type
      switch (selectedGame) {
        case MiniGameType.WELLNESS_TRIVIA:
          isPerfectScore = score === 5; // 5/5 correct answers
          break;
        case MiniGameType.STRESS_BUSTER:
          // Perfect score if high score with good accuracy
          // Score includes accuracy bonus, so high score means no/few misses
          isPerfectScore = score >= 20 && xp >= 80; // High score and high XP
          break;
        case MiniGameType.POSTURE_PATROL:
          // Perfect score if completed with all 3 hearts remaining
          // This is tracked in the game results (perfectDefense)
          // High score usually indicates perfect defense
          isPerfectScore = xp >= 90; // High XP indicates perfect or near-perfect play
          break;
        case MiniGameType.BALANCE_DROP:
          // Perfect score if completed all rounds with good balance and energy
          // XP calculation includes energy and balance bonuses
          isPerfectScore = xp >= 90; // High XP means good balance + energy management
          break;
        default:
          isPerfectScore = false;
      }
      
      const result = await recordMiniGamePlayed(selectedGame, score, xp, isPerfectScore);
      
      // Check if there was a level up
      if (result?.levelUp) {
        // Store level up info to show after closing
        // The parent component should handle showing level-up UI
        console.log(`Level up! ${result.levelUp.oldLevel} → ${result.levelUp.newLevel}`);
      }
    }
    
    // Auto-close after 2 seconds
    setTimeout(() => {
      handleClose();
    }, 2000);
  };

  const handleSkipGame = () => {
    setShowGame(true); // Still show the game interface with skip
  };

  const handleClose = () => {
    setShowGame(false);
    setGameCompleted(false);
    setEarnedXp(0);
    setSelectedGame(null);
    setAvailableGames([]);
    onClose();
  };

  const getGameDescription = (gameType: MiniGameType): string => {
    switch (gameType) {
      case MiniGameType.WELLNESS_TRIVIA:
        return 'Test your workplace wellness knowledge';
      case MiniGameType.STRESS_BUSTER:
        return 'Recognize and tap workers with good posture';
      case MiniGameType.POSTURE_PATROL:
        return 'Defend against bad posture with correct stretches';
      case MiniGameType.BALANCE_DROP:
        return 'Drag falling work and wellness items to the correct sides of the scale.';
      default:
        return 'Play a quick mini-game for extra XP';
    }
  };

  const renderSelectedGame = () => {
    switch (selectedGame) {
      case MiniGameType.WELLNESS_TRIVIA:
        return (
          <WellnessTrueFalse
            onGameComplete={handleGameComplete}
            onSkip={handleClose}
          />
        );
      case MiniGameType.STRESS_BUSTER:
        return (
          <StressBuster
            onGameComplete={handleGameComplete}
            onSkip={handleClose}
          />
        );
      case MiniGameType.POSTURE_PATROL:
        return (
          <PosturePatrol
            onGameComplete={handleGameComplete}
            onSkip={handleClose}
          />
        );
      case MiniGameType.BALANCE_DROP:
        return (
          <BalanceDrop
            onGameComplete={handleGameComplete}
            onSkip={handleClose}
          />
        );
      default:
        return (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.text }]}>
              Game not available yet!
            </Text>
          </View>
        );
    }
  };

  if (!visible) {
    console.log('🎮 POPUP COMPONENT: Not visible, returning null');
    return null;
  }
  
  console.log('🎮 POPUP COMPONENT: Rendering popup, showGame:', showGame);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={showGame ? () => {} : handleClose} // Prevent closing during game
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={showGame ? undefined : handleClose} // Completely disable during game
        disabled={showGame} // Disable interaction during game
      >
        <TouchableOpacity 
          style={[styles.popup, { backgroundColor: theme.cardBackground }]}
          activeOpacity={1}
          onPress={() => {}} // Prevent event bubbling
        >
          {!showGame ? (
            // Initial popup - offer to play mini-game
            <>
              <View style={styles.header}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                  <Ionicons name="game-controller" size={40} color={theme.accent} />
                </View>

                <Text style={[styles.title, { color: theme.text }]}>
                  Bonus Mini-Game!
                </Text>

                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  {selectedGame ? getGameDescription(selectedGame) : 'Play a quick mini-game for extra XP'}
                </Text>

                <View style={[styles.xpBadge, { backgroundColor: theme.accent + '15' }]}>
                  <Ionicons name="flash" size={16} color={theme.accent} />
                  <Text style={[styles.xpText, { color: theme.accent }]}>
                    +25-100 XP
                  </Text>
                </View>

                <View style={styles.buttons}>
                  <TouchableOpacity
                    style={[styles.playButton, { backgroundColor: theme.accent }]}
                    onPress={handlePlayGame}
                  >
                    <Text style={styles.playButtonText}>Play Game</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleClose}
                  >
                    <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
                      Maybe Later
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            // Show the actual mini-game
            <View style={styles.gameContainer}>
              {!gameCompleted ? (
                renderSelectedGame()
              ) : (
                // Game completion screen
                <View style={styles.completionScreen}>
                  <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                  <Text style={[styles.completionTitle, { color: theme.text }]}>
                    Bonus XP Earned!
                  </Text>
                  <Text style={[styles.completionXp, { color: theme.accent }]}>
                    +{earnedXp} XP
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5, // Minimal padding for almost full screen
  },
  popup: {
    width: width * 0.98, // Almost full width
    maxHeight: height * 0.90, // Reduced height
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 0,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    padding: 24,
    paddingTop: 8,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
    gap: 4,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  playButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  freeUserNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  gameContainer: {
    height: height * 0.85, // Reduced height
  },
  completionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  completionXp: {
    fontSize: 32,
    fontWeight: '800',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
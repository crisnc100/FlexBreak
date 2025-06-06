import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { WellnessTrueFalse } from './minigames/WellnessTrueFalse';
import * as haptics from '../../utils/haptics';

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

  const handlePlayGame = () => {
    haptics.light();
    setShowGame(true);
  };

  const handleGameComplete = (score: number, xp: number) => {
    setEarnedXp(xp);
    setGameCompleted(true);
    onXpEarned(xp);
    
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
    onClose();
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
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.popup, { backgroundColor: theme.cardBackground }]}>
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
                  Play a quick wellness trivia game for extra XP
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

                {!isPremium && (
                  <Text style={[styles.freeUserNote, { color: theme.textSecondary }]}>
                    Free users get 2 mini-games per day
                  </Text>
                )}
              </View>
            </>
          ) : (
            // Show the actual mini-game
            <View style={styles.gameContainer}>
              {!gameCompleted ? (
                <WellnessTrueFalse
                  onGameComplete={handleGameComplete}
                  onSkip={handleClose}
                />
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
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    width: width * 0.9,
    maxHeight: height * 0.8,
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
    height: height * 0.7,
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
});
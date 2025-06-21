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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { MiniGameAchievementNotification } from '../notifications/MiniGameAchievementNotification';
import LevelUpNotification from '../notifications/LevelUpNotification';
import { AchievementBanner } from '../achievements/AchievementBanner';

const { width, height } = Dimensions.get('window');

// Achievement definitions for mini-games
const MINIGAME_ACHIEVEMENTS = {
  [MiniGameType.STRESS_BUSTER]: {
    id: 'lightning_reflexes',
    title: 'Lightning Reflexes',
    description: 'Perfect score in Stress Buster!',
    xp: 100,
    badgeImage: require('../../../assets/images/achievements/lightningReflexes.png'),
  },
  [MiniGameType.POSTURE_PATROL]: {
    id: 'game_master',
    title: 'Game Master',
    description: 'Completed without losing lives!',
    xp: 150,
    badgeImage: require('../../../assets/images/achievements/gameMaster.png'),
  },
  [MiniGameType.WELLNESS_TRIVIA]: {
    id: 'trivia_expert',
    title: 'Perfect Knowledge',
    description: 'All answers correct!',
    xp: 50,
    badgeImage: require('../../../assets/images/achievements/triviaExpert.png'),
  },
  [MiniGameType.BALANCE_DROP]: {
    id: 'perfect_balance',
    title: 'Perfect Balance',
    description: 'Flawless balance achieved!',
    xp: 200,
    badgeImage: require('../../../assets/images/achievements/perfectScoreBadge.png'),
  },
};

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
  const [achievementEarned, setAchievementEarned] = useState<any | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<{ oldLevel: number; newLevel: number } | null>(null);
  const [showLevelUpNotification, setShowLevelUpNotification] = useState(false);
  const [showAchievementBanner, setShowAchievementBanner] = useState(false);

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
    
    let isPerfectScore = false;
    
    // Record the game played
    if (selectedGame) {
      // Determine perfect score based on game type
      switch (selectedGame) {
        case MiniGameType.WELLNESS_TRIVIA:
          isPerfectScore = score === 5; // 5/5 correct answers
          break;
        case MiniGameType.STRESS_BUSTER:
          // Perfect score if high score with good accuracy
          // Lowered threshold based on actual gameplay - perfect can be 17-18
          isPerfectScore = score >= 17 && xp >= 80; // High score and high XP
          break;
        case MiniGameType.POSTURE_PATROL:
          // Perfect score if completed with all 3 hearts remaining
          // Since XP calculation can be inconsistent, we'll check score directly
          // In Posture Patrol, score includes hearts remaining bonus (heartsRemaining * 10)
          // So if they have 3 hearts, they get +30 to score
          // We can detect this by checking if score ends with 30 (3 hearts), 20 (2 hearts), etc.
          const heartsBonus = score % 100; // Get the last two digits
          const likelyHearts = Math.floor(heartsBonus / 10);
          isPerfectScore = likelyHearts >= 3 || xp >= 80; // 3 hearts or PERFECT tier XP
          console.log(`[MiniGamePopup] Posture Patrol - Score: ${score}, XP: ${xp}, Hearts estimate: ${likelyHearts}, Perfect: ${isPerfectScore}`);
          break;
        case MiniGameType.BALANCE_DROP:
          // Perfect score if completed all rounds with good balance and energy
          // Balance Drop gives high XP for good performance
          isPerfectScore = xp >= 85; // High XP means good balance + energy management
          break;
        default:
          isPerfectScore = false;
      }
      
      const result = await recordMiniGamePlayed(selectedGame, score, xp, isPerfectScore);
      
      // Check if there was a level up
      if (result?.levelUp) {
        setLevelUpInfo(result.levelUp);
        // Show level up notification after a brief delay
        setTimeout(() => {
          setShowLevelUpNotification(true);
        }, 1500);
        console.log(`Level up! ${result.levelUp.oldLevel} → ${result.levelUp.newLevel}`);
      }
      
      // If perfect score, store achievement info for notification
      if (isPerfectScore && selectedGame) {
        const achievementData = MINIGAME_ACHIEVEMENTS[selectedGame];
        if (achievementData) {
          setAchievementEarned(achievementData);
          console.log(`[MiniGamePopup] Perfect score achieved! Achievement: ${achievementData.title}`);
        }
        haptics.success();
      }
    }
    
    // Auto-close timing: longer if achievement earned to let user see it
    const closeDelay = isPerfectScore ? 4000 : 2000;
    console.log(`[MiniGamePopup] Will close in ${closeDelay}ms`);
    
    setTimeout(() => {
      handleClose();
    }, closeDelay);
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
    
    // Don't clear achievement data yet if we're going to show the banner
    if (!achievementEarned) {
      setAchievementEarned(null);
    }
    
    setLevelUpInfo(null);
    setShowLevelUpNotification(false);
    onClose();
    
    // Show achievement banner after modal closes if achievement was earned
    if (achievementEarned) {
      setTimeout(() => {
        setShowAchievementBanner(true);
      }, 300); // Small delay for smooth transition
    }
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
    <>
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
                    Earn up to 100 XP
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
                  <Animated.View style={[styles.completionContent]}>
                    <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                    <Text style={[styles.completionTitle, { color: theme.text }]}>
                      Bonus XP Earned!
                    </Text>
                    <Text style={[styles.completionXp, { color: theme.accent }]}>
                      +{earnedXp} XP
                    </Text>
                    
                    {/* Achievement Badge Notification */}
                    {achievementEarned && (
                      <View style={[styles.achievementBadge, { backgroundColor: theme.accent + '15', borderColor: theme.accent }]}>
                        <Ionicons name="trophy" size={24} color={theme.accent} />
                        <View style={styles.achievementText}>
                          <Text style={[styles.achievementTitle, { color: theme.accent }]}>
                            Badge Unlocked!
                          </Text>
                          <Text style={[styles.achievementDescription, { color: theme.text }]}>
                            {achievementEarned.title}
                          </Text>
                        </View>
                      </View>
                    )}
                  </Animated.View>
                  
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
      
      {/* Level Up Notification - shows over the modal */}
      {showLevelUpNotification && levelUpInfo && (
        <LevelUpNotification
          oldLevel={levelUpInfo.oldLevel}
          newLevel={levelUpInfo.newLevel}
          source="mini-game"
          onDismiss={() => setShowLevelUpNotification(false)}
        />
      )}
      
    </Modal>
    
    {/* Achievement Banner - shows after modal closes */}
    <AchievementBanner
      visible={showAchievementBanner}
      achievement={achievementEarned}
      onHide={() => {
        setShowAchievementBanner(false);
        setAchievementEarned(null);
      }}
    />
    </>
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
  completionContent: {
    alignItems: 'center',
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  achievementText: {
    marginLeft: 12,
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    opacity: 0.8,
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { WellnessTrueFalse } from '../routine/minigames/WellnessTrueFalse';
import { StressBuster } from '../routine/minigames/StressBuster';
import { PosturePatrol } from '../routine/minigames/PosturePatrol';
import { BalanceDrop } from '../routine/minigames/BalanceDrop/index';
import { 
  MiniGameType, 
  MiniGameInfo, 
  getAvailableGames,
  recordMiniGamePlayed 
} from '../../services/miniGameService';
import * as haptics from '../../utils/haptics';

const { width } = Dimensions.get('window');

interface MiniGamesCardProps {
  onOpenSubscription: () => void;
}

export const MiniGamesCard: React.FC<MiniGamesCardProps> = ({
  onOpenSubscription,
}) => {
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'selection' | 'game' | 'completion'>('selection');
  const [selectedGame, setSelectedGame] = useState<MiniGameType | null>(null);
  const [availableGames, setAvailableGames] = useState<MiniGameInfo[]>([]);
  const [completionData, setCompletionData] = useState<{score: number, xp: number} | null>(null);

  const handleCardPress = async () => {
    haptics.light();
    
    if (!isPremium) {
      // Show premium upsell
      onOpenSubscription();
      return;
    }

    // Load available games and show selection
    const games = await getAvailableGames(isPremium);
    setAvailableGames(games);
    setModalMode('selection');
    setShowModal(true);
  };

  const handleGameSelect = (gameType: MiniGameType) => {
    console.log('🎮 Game selected:', gameType);
    haptics.medium();
    setSelectedGame(gameType);
    setModalMode('game');
  };

  const handleGameComplete = async (score: number, xp: number) => {
    console.log(`🎮 HOME: Mini-game completed! Score: ${score}, XP: ${xp}`);
    
    // Record the game played
    if (selectedGame) {
      let isPerfectScore = false;
      
      // Determine perfect score based on game type
      switch (selectedGame) {
        case MiniGameType.WELLNESS_TRIVIA:
          isPerfectScore = score === 5; // 5/5 correct answers
          break;
        case MiniGameType.STRESS_BUSTER:
          isPerfectScore = score >= 10; // Good accuracy threshold
          break;
        case MiniGameType.POSTURE_PATROL:
          isPerfectScore = score >= 200; // High balance score threshold
          break;
        case MiniGameType.BALANCE_DROP:
          isPerfectScore = score >= 100; // Unknown threshold
          break;
        default:
          isPerfectScore = false;
      }
      
      await recordMiniGamePlayed(selectedGame, score, xp, isPerfectScore);
    }
    
    // Show completion screen specific to home mini-games
    setCompletionData({ score, xp });
    setModalMode('completion');
    haptics.heavy();
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      handleCloseGame();
    }, 3000);
    
    // TODO: Integrate with XP system
  };

  const handleCloseGame = () => {
    console.log('🎮 Closing game');
    setShowModal(false);
    setSelectedGame(null);
    setCompletionData(null);
    setModalMode('selection');
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
        return 'Fun mini-game for extra XP';
    }
  };

  const getGameIcon = (gameType: MiniGameType): string => {
    switch (gameType) {
      case MiniGameType.WELLNESS_TRIVIA:
        return 'school';
      case MiniGameType.STRESS_BUSTER:
        return 'people';
      case MiniGameType.POSTURE_PATROL:
        return 'shield';
      case MiniGameType.BALANCE_DROP:
        return 'balance';
      default:
        return 'game-controller';
    }
  };

  const isGameAvailable = (gameType: MiniGameType): boolean => {
    // All 4 games are implemented
    return gameType === MiniGameType.WELLNESS_TRIVIA || 
           gameType === MiniGameType.STRESS_BUSTER || 
           gameType === MiniGameType.POSTURE_PATROL ||
           gameType === MiniGameType.BALANCE_DROP;
  };

  const renderSelectedGame = () => {
    console.log('🎮 Rendering selected game:', selectedGame);
    
    if (!selectedGame) {
      console.log('🎮 No selected game');
      return null;
    }

    switch (selectedGame) {
      case MiniGameType.WELLNESS_TRIVIA:
        console.log('🎮 Rendering WellnessTrueFalse');
        return (
          <WellnessTrueFalse
            onGameComplete={handleGameComplete}
            onSkip={handleCloseGame}
            context="home"
          />
        );
      case MiniGameType.STRESS_BUSTER:
        console.log('🎮 Rendering StressBuster');
        return (
          <StressBuster
            onGameComplete={handleGameComplete}
            onSkip={handleCloseGame}
            context="home"
          />
        );
      case MiniGameType.POSTURE_PATROL:
        console.log('🎮 Rendering PosturePatrol');
        return (
          <PosturePatrol
            onGameComplete={handleGameComplete}
            onSkip={handleCloseGame}
            context="home"
          />
        );
      case MiniGameType.BALANCE_DROP:
        console.log('🎮 Rendering BalanceDrop');
        return (
          <BalanceDrop
            onGameComplete={handleGameComplete}
            onSkip={handleCloseGame}
            context="home"
          />
        );
      default:
        console.log('🎮 Game not available:', selectedGame);
        return (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.text }]}>
              Game not available yet!
            </Text>
          </View>
        );
    }
  };

  const renderCompletionScreen = () => {
    if (!completionData || !selectedGame) return null;

    const getGameIcon = () => {
      switch (selectedGame) {
        case MiniGameType.WELLNESS_TRIVIA:
          return 'school';
        case MiniGameType.STRESS_BUSTER:
          return 'people';
        case MiniGameType.POSTURE_PATROL:
          return 'shield';
        case MiniGameType.BALANCE_DROP:
          return 'balance';
        default:
          return 'game-controller';
      }
    };

    const getGameName = () => {
      switch (selectedGame) {
        case MiniGameType.WELLNESS_TRIVIA:
          return 'Wellness Trivia';
        case MiniGameType.STRESS_BUSTER:
          return 'Stress Buster';
        case MiniGameType.POSTURE_PATROL:
          return 'Posture Patrol';
        case MiniGameType.BALANCE_DROP:
          return 'Balance Drop';
        default:
          return 'Mini-Game';
      }
    };

    return (
      <View style={[styles.completionScreen, { backgroundColor: theme.background }]}>
        <View style={styles.completionContent}>
          {/* Game Icon */}
          <View style={[styles.completionIcon, { backgroundColor: theme.accent + '20' }]}>
            <Ionicons name={getGameIcon() as any} size={48} color={theme.accent} />
          </View>

          {/* Title */}
          <Text style={[styles.completionTitle, { color: theme.text }]}>
            {getGameName()} Complete!
          </Text>

          {/* Score */}
          <Text style={[styles.completionScore, { color: theme.textSecondary }]}>
            Score: {completionData.score}
          </Text>

          {/* XP Earned */}
          <View style={[styles.xpEarnedContainer, { backgroundColor: theme.accent + '15' }]}>
            <Ionicons name="flash" size={24} color={theme.accent} />
            <Text style={[styles.xpEarnedText, { color: theme.accent }]}>
              +{completionData.xp} XP
            </Text>
          </View>

          {/* Auto-close hint */}
          <Text style={[styles.autoCloseText, { color: theme.textSecondary }]}>
            Closing automatically...
          </Text>
        </View>
      </View>
    );
  };

  const renderGameItem = ({ item }: { item: MiniGameInfo }) => (
    <TouchableOpacity
      style={[
        styles.gameItem,
        { 
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: isGameAvailable(item.id) ? 1 : 0.6,
        }
      ]}
      onPress={() => isGameAvailable(item.id) && handleGameSelect(item.id)}
      disabled={!isGameAvailable(item.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.gameIcon, { backgroundColor: theme.accent + '20' }]}>
        <Ionicons 
          name={getGameIcon(item.id) as any} 
          size={24} 
          color={theme.accent} 
        />
      </View>
      
      <View style={styles.gameInfo}>
        <Text style={[styles.gameName, { color: theme.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.gameDescription, { color: theme.textSecondary }]}>
          {getGameDescription(item.id)}
        </Text>
        <View style={styles.xpBadge}>
          <Ionicons name="flash" size={12} color={theme.accent} />
          <Text style={[styles.xpText, { color: theme.accent }]}>
            +{item.minXP}-{item.maxXP} XP
          </Text>
        </View>
      </View>

      {!isGameAvailable(item.id) && (
        <Text style={[styles.comingSoon, { color: theme.textSecondary }]}>
          Coming Soon
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.cardBackground }]}
        onPress={handleCardPress}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          <View style={styles.leftContent}>
            <View style={[styles.iconContainer, { backgroundColor: theme.accent + '15' }]}>
              <Ionicons name="game-controller" size={24} color={theme.accent} />
            </View>
            
            <View style={styles.textContent}>
              <Text style={[styles.title, { color: theme.text }]}>
                Mini-Games (beta)
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {isPremium ? 'Play for bonus XP' : 'Earn extra XP • Premium'}
              </Text>
            </View>
          </View>
          
          <View style={styles.rightContent}>
            {!isPremium && (
              <View style={[styles.premiumBadge, { backgroundColor: theme.accent }]}>
                <Text style={styles.premiumText}>PRO</Text>
              </View>
            )}
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={theme.textSecondary} 
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Single Modal for selection, game, and completion */}
      <Modal
        visible={showModal}
        animationType={modalMode === 'game' ? "slide" : "fade"}
        transparent={modalMode === 'selection'}
        onRequestClose={modalMode === 'completion' ? undefined : handleCloseGame}
        statusBarTranslucent={modalMode !== 'selection'}
      >
        {modalMode === 'selection' ? (
          // Game Selection Content
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Choose Your Game
                </Text>
                <TouchableOpacity 
                  onPress={handleCloseGame}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={availableGames}
                keyExtractor={(item) => item.id}
                renderItem={renderGameItem}
                style={styles.gamesList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        ) : modalMode === 'game' ? (
          // Game Content
          <SafeAreaView style={[styles.gameScreen, { backgroundColor: theme.background }]}>
            {selectedGame ? renderSelectedGame() : (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: theme.text }]}>
                  Loading game...
                </Text>
              </View>
            )}
          </SafeAreaView>
        ) : (
          // Completion Content
          renderCompletionScreen()
        )}
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: '70%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  gamesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  gameIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  comingSoon: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  gameScreen: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Completion Screen Styles
  completionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  completionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  completionScore: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  xpEarnedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  xpEarnedText: {
    fontSize: 20,
    fontWeight: '700',
  },
  autoCloseText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
  },
});
import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, Text, SafeAreaView, AppState, AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { BalanceDropProps } from './types';
import { useGameLogic } from './useGameLogic';
import { MenuScreen } from './MenuScreen';
import { GameHeader } from './GameHeader';
import { GameArea } from './GameArea';
import { RoundCompleteScreen } from './RoundCompleteScreen';
import { GameOverScreen } from './GameOverScreen';
import { TutorialOverlay } from './TutorialOverlay';
import { RoundStartMessage } from './RoundStartMessage';
import { PenaltyFeedback } from './PenaltyFeedback';
import { styles } from './styles';
import { ROUNDS, TUTORIAL_ROUND } from './constants';
import * as haptics from '../../../../utils/haptics';

export const BalanceDrop: React.FC<BalanceDropProps> = ({
  onGameComplete,
  onSkip,
  context = 'routine',
}) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(false);
  const [showRoundStartMessage, setShowRoundStartMessage] = useState(false);
  const [roundStartData, setRoundStartData] = useState({ balance: 0, roundNumber: 0, energyLeft: 100, scenario: undefined as any });
  const [lastShownRound, setLastShownRound] = useState(-1);
  
  const {
    gameState,
    setGameState,
    currentRound,
    timeLeft,
    items,
    upcomingItems,
    balance,
    energyLeft,
    stats,
    currentCombo,
    activeDropZone,
    dropFeedback,
    penaltyFeedback,
    itemsRemaining,
    skipCount,
    scaleRotation,
    energyAnimation,
    energyFlashAnimation,
    startRound,
    nextRound,
    skipTutorial,
    createPanResponder,
    setGameAreaOffset,
    clearDropFeedback,
    clearPenaltyFeedback,
    pauseGame,
    resumeGame,
    startGameplay,
  } = useGameLogic(onGameComplete);

  const handleClose = () => {
    setVisible(false);
    onSkip();
  };

  const handlePause = () => {
    haptics.light();
    setIsPaused(true);
    pauseGame();
  };

  const handleResume = () => {
    haptics.light();
    setIsPaused(false);
    resumeGame();
  };

  const handleRestart = () => {
    haptics.medium();
    setIsPaused(false);
    setLastShownRound(-1); // Reset for new game
    setGameState('menu');
  };

  const handleStartTutorial = () => {
    startRound(0);
    setShowTutorialOverlay(true);
  };

  const handleStartGame = () => {
    startRound(1); // Start at round 1, skipping tutorial
  };

  const handleTutorialComplete = () => {
    setShowTutorialOverlay(false);
    // If no round start message is showing, start gameplay
    if (!showRoundStartMessage) {
      startGameplay();
    }
  };

  // Show round start message when a new round begins
  useEffect(() => {
    // Only show message once per round
    if ((gameState === 'playing' || gameState === 'tutorial') && currentRound !== lastShownRound) {
      setLastShownRound(currentRound);
      if (balance !== 0) {
        // Get the scenario for this round
        const round = currentRound === 0 ? TUTORIAL_ROUND : ROUNDS[currentRound - 1];
        setRoundStartData({ 
          balance, 
          roundNumber: currentRound, 
          energyLeft, 
          scenario: round?.scenario 
        });
        setShowRoundStartMessage(true);
      } else {
        // If balance is 0 (shouldn't happen with new logic), start gameplay immediately
        startGameplay();
      }
    }
  }, [gameState, currentRound, balance, energyLeft, startGameplay, lastShownRound]);

  const handleRoundStartMessageComplete = () => {
    setShowRoundStartMessage(false);
    // Start the actual gameplay after message
    startGameplay();
  };

  // Handle app state changes for auto-pause
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && gameState === 'playing' && !isPaused) {
        handlePause();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [gameState, isPaused]);

  // Render pause menu
  const renderPauseMenu = () => (
    <View style={[styles.pauseMenu, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.pauseTitle, { color: theme.text }]}>Game Paused</Text>
      
      <TouchableOpacity
        style={[styles.pauseButton, { backgroundColor: theme.accent }]}
        onPress={handleResume}
      >
        <Text style={styles.pauseButtonText}>Resume</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.pauseButton, { backgroundColor: theme.border }]}
        onPress={handleRestart}
      >
        <Text style={styles.pauseButtonText}>Restart</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.pauseButton, { backgroundColor: '#FF6B6B' }]}
        onPress={handleClose}
      >
        <Text style={styles.pauseButtonText}>Quit</Text>
      </TouchableOpacity>
    </View>
  );

  // Render game content based on state
  const renderGameContent = () => {
    switch (gameState) {
      case 'menu':
        return (
          <MenuScreen 
            onStartTutorial={handleStartTutorial}
            onStartGame={handleStartGame}
            onSkip={handleClose}
          />
        );

      case 'tutorial':
        return (
          <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <GameHeader
              currentRound={currentRound}
              score={stats.score}
              timeLeft={timeLeft}
              balance={balance}
              energyLeft={energyLeft}
              currentCombo={currentCombo}
              lifeStats={stats.lifeStats}
              onSkip={handleClose}
              isTutorial={true}
              onSkipTutorial={skipTutorial}
              energyAnimation={energyAnimation}
              energyFlashAnimation={energyFlashAnimation}
            />
            <GameArea
              items={items}
              upcomingItems={upcomingItems}
              scaleRotation={scaleRotation}
              createPanResponder={createPanResponder}
              activeDropZone={activeDropZone}
              setGameAreaOffset={setGameAreaOffset}
              dropFeedback={dropFeedback}
              onDropFeedbackComplete={clearDropFeedback}
              energyLeft={energyLeft}
            />
            {showTutorialOverlay && (
              <TutorialOverlay onComplete={handleTutorialComplete} />
            )}
            {showRoundStartMessage && (
              <RoundStartMessage 
                balance={roundStartData.balance}
                roundNumber={roundStartData.roundNumber}
                scenario={roundStartData.scenario}
                energyLeft={roundStartData.energyLeft}
                onComplete={handleRoundStartMessageComplete}
              />
            )}
            {penaltyFeedback && (
              <PenaltyFeedback
                message={penaltyFeedback}
                onComplete={clearPenaltyFeedback}
              />
            )}
          </SafeAreaView>
        );

      case 'playing':
        return (
          <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <TouchableOpacity 
              style={styles.pauseButtonIcon}
              onPress={handlePause}
            >
              <Ionicons name="pause" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <GameHeader
              currentRound={currentRound}
              score={stats.score}
              timeLeft={timeLeft}
              balance={balance}
              energyLeft={energyLeft}
              currentCombo={currentCombo}
              lifeStats={stats.lifeStats}
              onSkip={handleClose}
              energyAnimation={energyAnimation}
              energyFlashAnimation={energyFlashAnimation}
            />
            <GameArea
              items={items}
              upcomingItems={upcomingItems}
              scaleRotation={scaleRotation}
              createPanResponder={createPanResponder}
              activeDropZone={activeDropZone}
              setGameAreaOffset={setGameAreaOffset}
              dropFeedback={dropFeedback}
              onDropFeedbackComplete={clearDropFeedback}
              energyLeft={energyLeft}
            />
            {showRoundStartMessage && (
              <RoundStartMessage 
                balance={roundStartData.balance}
                roundNumber={roundStartData.roundNumber}
                scenario={roundStartData.scenario}
                energyLeft={roundStartData.energyLeft}
                onComplete={handleRoundStartMessageComplete}
              />
            )}
            {penaltyFeedback && (
              <PenaltyFeedback
                message={penaltyFeedback}
                onComplete={clearPenaltyFeedback}
              />
            )}
          </SafeAreaView>
        );

      case 'roundComplete':
        return (
          <RoundCompleteScreen
            currentRound={currentRound}
            stats={stats}
            onNextRound={nextRound}
            balance={balance}
            energyLeft={energyLeft}
          />
        );

      case 'gameOver':
        return (
          <GameOverScreen
            balance={balance}
            energyLeft={energyLeft}
            finalScore={stats.score + stats.roundScore}
            lifeStats={stats.lifeStats}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        {renderGameContent()}
        {isPaused && renderPauseMenu()}
      </View>
    </Modal>
  );
};
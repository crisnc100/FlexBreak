import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, Text, SafeAreaView } from 'react-native';
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
import { styles } from './styles';
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
  
  const {
    gameState,
    setGameState,
    currentRound,
    timeLeft,
    items,
    upcomingItems,
    balance,
    energy,
    stats,
    currentCombo,
    activeDropZone,
    dropFeedback,
    scaleRotation,
    energyAnimation,
    startRound,
    nextRound,
    skipTutorial,
    createPanResponder,
    setGameAreaOffset,
    clearDropFeedback,
  } = useGameLogic(onGameComplete);

  const handleClose = () => {
    setVisible(false);
    onSkip();
  };

  const handlePause = () => {
    haptics.light();
    setIsPaused(true);
  };

  const handleResume = () => {
    haptics.light();
    setIsPaused(false);
  };

  const handleRestart = () => {
    haptics.medium();
    setIsPaused(false);
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
  };

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
              roundScore={stats.roundScore}
              timeLeft={timeLeft}
              balance={balance}
              energy={energy}
              energyAnimation={energyAnimation}
              currentCombo={currentCombo}
              onSkip={handleClose}
              isTutorial={true}
              onSkipTutorial={skipTutorial}
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
            />
            {showTutorialOverlay && (
              <TutorialOverlay onComplete={handleTutorialComplete} />
            )}
          </SafeAreaView>
        );

      case 'playing':
        return (
          <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <TouchableOpacity 
              style={styles.pauseButton}
              onPress={handlePause}
            >
              <Ionicons name="pause" size={24} color={theme.text} />
            </TouchableOpacity>
            
            <GameHeader
              currentRound={currentRound}
              score={stats.score}
              roundScore={stats.roundScore}
              timeLeft={timeLeft}
              balance={balance}
              energy={energy}
              energyAnimation={energyAnimation}
              currentCombo={currentCombo}
              onSkip={handleClose}
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
            />
          </SafeAreaView>
        );

      case 'roundComplete':
        return (
          <RoundCompleteScreen
            currentRound={currentRound}
            stats={stats}
            onNextRound={nextRound}
          />
        );

      case 'gameOver':
        return (
          <GameOverScreen
            balance={balance}
            energy={energy}
            finalScore={stats.score + stats.roundScore}
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
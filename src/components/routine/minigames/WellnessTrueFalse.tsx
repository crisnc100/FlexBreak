import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import * as haptics from '../../../utils/haptics';
import { playCorrectSound, playIncorrectSound } from '../../../utils/soundEffects';
import { getRandomTriviaQuestions, TriviaQuestion } from '../../../data/triviaQuestions';

const { width, height } = Dimensions.get('window');

interface WellnessTrueFalseProps {
  onGameComplete: (score: number, xpEarned: number) => void;
  onSkip: () => void;
  context?: 'routine' | 'home'; // Add context prop
}

export const WellnessTrueFalse: React.FC<WellnessTrueFalseProps> = ({
  onGameComplete,
  onSkip,
  context = 'routine', // Default to routine for backward compatibility
}) => {
  const { theme, isDark } = useTheme();
  
  // Game state
  const [questions] = useState<TriviaQuestion[]>(() => getRandomTriviaQuestions(5));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds total
  const [showExitAlert, setShowExitAlert] = useState(false);
  
  // Animation values
  const questionOpacity = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const scoreAnimation = useRef(new Animated.Value(0)).current;
  
  // Timer
  useEffect(() => {
    if (gameComplete || timeLeft <= 0) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, gameComplete]);
  
  // Auto-complete when time runs out
  useEffect(() => {
    if (timeLeft <= 0 && !gameComplete) {
      completeGame();
    }
  }, [timeLeft, gameComplete]);
  
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  
  const handleAnswer = (answer: boolean) => {
    if (answered) return;
    
    haptics.light();
    setAnswered(true);
    setSelectedAnswer(answer);
    
    // Check if correct
    const isCorrect = answer === currentQuestion.answer;
    if (isCorrect) {
      setScore(prev => prev + 1);
      haptics.success();
      playCorrectSound();
      
      // Animate score increase
      Animated.spring(scoreAnimation, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start(() => {
        scoreAnimation.setValue(0);
      });
    } else {
      haptics.error();
      playIncorrectSound();
    }
    
    // Show explanation briefly
    setShowExplanation(true);
    
    // Move to next question or complete game
    setTimeout(() => {
      if (isLastQuestion) {
        completeGame();
      } else {
        nextQuestion();
      }
    }, 2500); // Show explanation for 2.5 seconds
  };
  
  const nextQuestion = () => {
    // Fade out current question
    Animated.timing(questionOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setAnswered(false);
      setSelectedAnswer(null);
      setShowExplanation(false);
      
      // Fade in new question
      questionOpacity.setValue(0);
      Animated.timing(questionOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };
  
  const handleSkipPress = () => {
    setShowExitAlert(true);
    haptics.light();
  };

  const confirmExit = () => {
    setShowExitAlert(false);
    haptics.medium();
    onSkip();
  };

  const cancelExit = () => {
    setShowExitAlert(false);
    haptics.light();
  };

  const completeGame = () => {
    setGameComplete(true);
    const finalScore = score;
    const percentage = (finalScore / questions.length) * 100;
    
    // Calculate XP: Base 25 XP for playing, max 100 XP total
    let xpEarned = 25;
    
    // Bonus XP based on performance (max 50 XP from performance)
    if (percentage >= 100) xpEarned += 30; // Perfect score bonus
    else if (percentage >= 80) xpEarned += 20; // Excellent bonus  
    else if (percentage >= 60) xpEarned += 10; // Good bonus
    
    // Time bonus (max 25 XP from time)
    if (timeLeft > 0) {
      const timeBonus = Math.min(25, Math.floor(timeLeft / 3)); // 1 XP per 3 seconds remaining, max 25
      xpEarned += timeBonus;
    }
    
    // Cap at 100 XP max
    xpEarned = Math.min(100, xpEarned);
    
    haptics.heavy();
    onGameComplete(finalScore, xpEarned);
  };
  
  const handleButtonPress = (answer: boolean) => {
    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    handleAnswer(answer);
  };
  
  const getButtonStyle = (answer: boolean) => {
    if (!answered) {
      return answer ? styles.trueButton : styles.falseButton;
    }
    
    // Show correct/incorrect after answering
    if (answer === currentQuestion.answer) {
      return styles.correctButton; // Green for correct answer
    } else if (answer === selectedAnswer) {
      return styles.incorrectButton; // Red for wrong selected answer
    } else {
      return styles.neutralButton; // Gray for non-selected
    }
  };
  
  const getButtonTextStyle = (answer: boolean) => {
    if (!answered) {
      return answer ? styles.trueButtonText : styles.falseButtonText;
    }
    
    if (answer === currentQuestion.answer) {
      return styles.correctButtonText;
    } else if (answer === selectedAnswer) {
      return styles.incorrectButtonText;
    } else {
      return styles.neutralButtonText;
    }
  };
  
  if (gameComplete) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.completionContainer}>
          <Ionicons name="trophy" size={60} color={theme.accent} />
          <Text style={[styles.completionTitle, { color: theme.text }]}>
            Game Complete!
          </Text>
          <Text style={[styles.completionScore, { color: theme.text }]}>
            Score: {score}/{questions.length}
          </Text>
          <Text style={[styles.completionPercentage, { color: theme.textSecondary }]}>
            {Math.round((score / questions.length) * 100)}% Correct
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Simplified Header */}
      <View style={styles.header}>
        <View style={styles.gameInfo}>
          <View style={context === 'home' ? styles.progressContainerHome : styles.progressContainer}>
            <Text style={[styles.questionCounter, { color: theme.textSecondary }]}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: theme.accent,
                    width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`
                  }
                ]} 
              />
            </View>
          </View>
          
          <View style={styles.scoreAndTime}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Score</Text>
              <Animated.View style={{ transform: [{ scale: scoreAnimation }] }}>
                <Text style={[styles.statValue, { color: theme.accent }]}>
                  {score}/{questions.length}
                </Text>
              </Animated.View>
            </View>
            
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Time</Text>
              <Text style={[styles.statValue, { color: timeLeft <= 10 ? '#FF4444' : theme.accent }]}>
                {timeLeft}s
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Simple Instructions */}
      <View style={context === 'home' ? styles.instructionsContainerHome : styles.instructionsContainer}>
        <Text style={[styles.instructions, { color: theme.text }]}>
          Is this statement TRUE or FALSE?
        </Text>
      </View>
      
      {/* Question */}
      <Animated.View style={[styles.questionContainer, { opacity: questionOpacity }]}>
        <Text style={[styles.question, { color: theme.text }]}>
          {currentQuestion.question}
        </Text>
        
        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: theme.accent + '20' }]}>
          <Text style={[styles.categoryText, { color: theme.accent }]}>
            {currentQuestion.category.toUpperCase()}
          </Text>
        </View>
      </Animated.View>
      
      {/* Improved Answer Buttons */}
      <View style={styles.buttonsContainer}>
        <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: buttonScale }] }]}>
          <TouchableOpacity
            style={[styles.answerButton, getButtonStyle(true)]}
            onPress={() => handleButtonPress(true)}
            disabled={answered}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <View style={[styles.iconContainer, { backgroundColor: getButtonStyle(true).backgroundColor }]}>
                <Ionicons 
                  name="checkmark" 
                  size={28} 
                  color="#FFFFFF" 
                />
              </View>
              <Text style={[styles.answerButtonText, getButtonTextStyle(true)]}>
                TRUE
              </Text>
              {!answered && (
                <Text style={[styles.buttonHint, getButtonTextStyle(true)]}>
                  Tap if correct
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: buttonScale }] }]}>
          <TouchableOpacity
            style={[styles.answerButton, getButtonStyle(false)]}
            onPress={() => handleButtonPress(false)}
            disabled={answered}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <View style={[styles.iconContainer, { backgroundColor: getButtonStyle(false).backgroundColor }]}>
                <Ionicons 
                  name="close" 
                  size={28} 
                  color="#FFFFFF" 
                />
              </View>
              <Text style={[styles.answerButtonText, getButtonTextStyle(false)]}>
                FALSE
              </Text>
              {!answered && (
                <Text style={[styles.buttonHint, getButtonTextStyle(false)]}>
                  Tap if incorrect
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
      
      {/* Explanation */}
      {showExplanation && (
        <View style={[styles.explanationContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.explanationTitle, { color: theme.text }]}>
            {selectedAnswer === currentQuestion.answer ? '✅ Correct!' : '❌ Incorrect'}
          </Text>
          <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
            {currentQuestion.explanation}
          </Text>
        </View>
      )}
      
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkipPress}>
        <Text style={[styles.skipText, { color: theme.textSecondary }]}>
          Skip Mini-Game
        </Text>
      </TouchableOpacity>

      {/* Exit Confirmation Alert */}
      {showExitAlert && (
        <View style={styles.alertOverlay}>
          <View style={[styles.alertContainer, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.alertTitle, { color: theme.text }]}>
              Exit Game?
            </Text>
            <Text style={[styles.alertMessage, { color: theme.textSecondary }]}>
              You'll lose your current progress and miss out on bonus XP.
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity 
                style={[styles.alertButton, styles.cancelButton]} 
                onPress={cancelExit}
              >
                <Text style={[styles.alertButtonText, { color: theme.text }]}>
                  Continue Playing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.alertButton, styles.confirmButton]} 
                onPress={confirmExit}
              >
                <Text style={styles.confirmButtonText}>
                  Exit Game
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 20,
  },
  gameInfo: {
    gap: 16,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressContainerHome: {
    alignItems: 'center',
    marginTop: 50, // Extra margin for home context
  },
  questionCounter: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreAndTime: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionsContainerHome: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10, // Extra spacing for home context
  },
  instructions: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  question: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 20,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  buttonWrapper: {
    flex: 1,
  },
  answerButton: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  buttonContent: {
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  answerButtonText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonHint: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
  trueButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  falseButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  correctButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  incorrectButton: {
    backgroundColor: '#F44336',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  neutralButton: {
    backgroundColor: 'rgba(158, 158, 158, 0.3)',
    borderWidth: 2,
    borderColor: '#9E9E9E',
  },
  trueButtonText: {
    color: '#4CAF50',
  },
  falseButtonText: {
    color: '#F44336',
  },
  correctButtonText: {
    color: '#FFFFFF',
  },
  incorrectButtonText: {
    color: '#FFFFFF',
  },
  neutralButtonText: {
    color: '#9E9E9E',
  },
  explanationContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },
  completionScore: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 5,
  },
  completionPercentage: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Alert overlay styles
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  alertContainer: {
    width: width * 0.85,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
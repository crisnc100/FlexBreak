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
import { getRandomTriviaQuestions, TriviaQuestion } from '../../../data/triviaQuestions';

const { width, height } = Dimensions.get('window');

interface WellnessTrueFalseProps {
  onGameComplete: (score: number, xpEarned: number) => void;
  onSkip: () => void;
}

export const WellnessTrueFalse: React.FC<WellnessTrueFalseProps> = ({
  onGameComplete,
  onSkip,
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <Text style={[styles.questionCounter, { color: theme.textSecondary }]}>
            {currentQuestionIndex + 1} / {questions.length}
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
        
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.timer, { color: timeLeft <= 10 ? '#FF4444' : theme.textSecondary }]}>
            {timeLeft}s
          </Text>
        </View>
      </View>
      
      {/* Score */}
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Score</Text>
        <Animated.View style={{ transform: [{ scale: scoreAnimation }] }}>
          <Text style={[styles.scoreValue, { color: theme.accent }]}>
            {score}/{questions.length}
          </Text>
        </Animated.View>
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
      
      {/* Answer Buttons */}
      <View style={styles.buttonsContainer}>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.answerButton, getButtonStyle(true)]}
            onPress={() => handleButtonPress(true)}
            disabled={answered}
          >
            <Ionicons 
              name="checkmark-circle" 
              size={32} 
              color={getButtonTextStyle(true).color} 
            />
            <Text style={[styles.answerButtonText, getButtonTextStyle(true)]}>
              TRUE
            </Text>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={[styles.answerButton, getButtonStyle(false)]}
            onPress={() => handleButtonPress(false)}
            disabled={answered}
          >
            <Ionicons 
              name="close-circle" 
              size={32} 
              color={getButtonTextStyle(false).color} 
            />
            <Text style={[styles.answerButtonText, getButtonTextStyle(false)]}>
              FALSE
            </Text>
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
      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={[styles.skipText, { color: theme.textSecondary }]}>
          Skip Mini-Game
        </Text>
      </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    flex: 1,
    marginRight: 20,
  },
  questionCounter: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timer: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '800',
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
    gap: 20,
    marginBottom: 20,
  },
  answerButton: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  answerButtonText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  trueButton: {
    backgroundColor: '#4CAF50',
  },
  falseButton: {
    backgroundColor: '#F44336',
  },
  correctButton: {
    backgroundColor: '#4CAF50',
  },
  incorrectButton: {
    backgroundColor: '#F44336',
  },
  neutralButton: {
    backgroundColor: '#9E9E9E',
  },
  trueButtonText: {
    color: '#FFFFFF',
  },
  falseButtonText: {
    color: '#FFFFFF',
  },
  correctButtonText: {
    color: '#FFFFFF',
  },
  incorrectButtonText: {
    color: '#FFFFFF',
  },
  neutralButtonText: {
    color: '#FFFFFF',
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
});
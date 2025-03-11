import { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface UseRoutineTimerProps {
  initialDuration?: number;
  onComplete?: () => void;
}

interface UseRoutineTimerReturn {
  timeRemaining: number;
  isPaused: boolean;
  progressAnim: Animated.Value;
  fadeAnim: Animated.Value;
  startTimer: (duration?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: (newDuration?: number) => void;
  togglePause: () => void;
}

/**
 * Custom hook for managing a routine timer with animation
 * @param initialDuration Initial duration in seconds
 * @param onComplete Callback when timer completes
 */
export function useRoutineTimer({
  initialDuration = 0,
  onComplete = () => {}
}: UseRoutineTimerProps = {}): UseRoutineTimerReturn {
  // State
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [isPaused, setIsPaused] = useState(true);
  const [totalDuration, setTotalDuration] = useState(initialDuration);
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickTime = useRef<number>(0);
  
  // Animations
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  // Start the timer with a new duration
  const startTimer = (duration?: number) => {
    console.log('Starting timer with duration:', duration || initialDuration);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Set the new duration
    const newDuration = duration !== undefined ? duration : initialDuration;
    setTimeRemaining(newDuration);
    setTotalDuration(newDuration);
    setIsPaused(false);
    
    // Reset and start the progress animation
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: newDuration * 1000,
      useNativeDriver: false
    }).start();
    
    // Start the timer
    lastTickTime.current = Date.now();
    tickTimer();
  };
  
  // Tick the timer (called every second)
  const tickTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Only tick if not paused
    if (!isPaused) {
      const now = Date.now();
      const elapsed = now - lastTickTime.current;
      lastTickTime.current = now;
      
      // Update time remaining
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - elapsed / 1000);
        
        // Check if timer is complete
        if (newTime <= 0) {
          // Stop the timer
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          
          // Call the onComplete callback
          onComplete();
          return 0;
        }
        
        // Schedule the next tick
        timerRef.current = setTimeout(tickTimer, 100);
        return newTime;
      });
    }
  };
  
  // Pause the timer
  const pauseTimer = () => {
    console.log('Pausing timer');
    
    if (!isPaused) {
      setIsPaused(true);
      
      // Pause the progress animation
      progressAnim.stopAnimation();
      
      // Clear the timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  // Resume the timer
  const resumeTimer = () => {
    console.log('Resuming timer');
    
    if (isPaused && timeRemaining > 0) {
      setIsPaused(false);
      
      // Resume the progress animation
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: timeRemaining * 1000,
        useNativeDriver: false
      }).start();
      
      // Start the timer
      lastTickTime.current = Date.now();
      tickTimer();
    }
  };
  
  // Reset the timer
  const resetTimer = (newDuration?: number) => {
    console.log('Resetting timer with duration:', newDuration || initialDuration);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Set the new duration
    const duration = newDuration !== undefined ? newDuration : initialDuration;
    setTimeRemaining(duration);
    setTotalDuration(duration);
    setIsPaused(true);
    
    // Reset the progress animation
    progressAnim.setValue(1);
  };
  
  // Toggle pause state
  const togglePause = () => {
    if (isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  };
  
  return {
    timeRemaining,
    isPaused,
    progressAnim,
    fadeAnim,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    togglePause
  };
}
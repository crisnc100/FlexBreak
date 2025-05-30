import { useState, useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

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
  const totalDurationRef = useRef(initialDuration);
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickTime = useRef<number>(0);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isPausedRef = useRef<boolean>(true);
  
  // Keep the ref in sync with the state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  
  // Animations
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Keep a ref of the latest timeRemaining value so we can access it inside callbacks without stale closures
  const timeRemainingRef = useRef(timeRemaining);
  
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);
  
  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);
  
  // Start the timer with a new duration
  const startTimer = (duration?: number) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    // Set the new duration
    const newDuration = duration !== undefined ? duration : initialDuration;
    setTimeRemaining(newDuration);
    setTotalDuration(newDuration);
    totalDurationRef.current = newDuration;
    setIsPaused(false);
    isPausedRef.current = false;
    
    // Reset and start the progress animation - full duration = 1.0
    progressAnim.setValue(1.0);
    
    // Start the timer
    lastTickTime.current = Date.now();
    tickTimer();
  };
  
  // Tick the timer (called every tick interval)
  const tickTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Only tick if not paused - use ref instead of state for immediate value
    if (!isPausedRef.current) {
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
          
          // Stop the animation
          if (animationRef.current) {
            animationRef.current.stop();
          }
          
          // Call the onComplete callback
          onComplete();
          return 0;
        }
        
        // Update the progress animation value directly
        const currentProgress = newTime / totalDurationRef.current;
        progressAnim.setValue(currentProgress);
        
        // Schedule the next tick - use a shorter interval for smoother updates
        timerRef.current = setTimeout(tickTimer, 50);
        return newTime;
      });
    }
  };
  
  // Pause the timer
  const pauseTimer = () => {
    if (!isPausedRef.current) {
      setIsPaused(true);
      isPausedRef.current = true;
      
      // Clear the timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  // Resume the timer
  const resumeTimer = () => {
    // Use the ref value here to avoid relying on a potentially stale closure value for timeRemaining
    const currentTime = timeRemainingRef.current;

    if (isPausedRef.current && currentTime > 0) {
      // Update both the state and ref
      setIsPaused(false);
      isPausedRef.current = false;
      
      // Make sure the progress animation value is correct
      const currentProgress = currentTime / totalDurationRef.current;
      progressAnim.setValue(currentProgress);
      
      // Start the timer with fresh timestamp
      lastTickTime.current = Date.now();
      
      // Start ticking
      tickTimer();
    }
  };
  
  // Reset the timer
  const resetTimer = (newDuration?: number) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    // Set the new duration
    const duration = newDuration !== undefined ? newDuration : initialDuration;
    setTimeRemaining(duration);
    setTotalDuration(duration);
    totalDurationRef.current = duration;
    setIsPaused(true);
    isPausedRef.current = true;
    
    // Reset the progress animation
    progressAnim.setValue(1);
  };
  
  // Toggle pause state
  const togglePause = () => {
    if (isPausedRef.current) {
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
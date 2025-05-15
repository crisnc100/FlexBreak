import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import * as soundEffects from '../../../utils/soundEffects';

interface NavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  onTogglePause: () => void;
  isPaused: boolean;
  isPreviousDisabled?: boolean;
  isLastStretch?: boolean;
  canSkipToNext?: boolean;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  onPrevious,
  onNext,
  onTogglePause,
  isPaused,
  isPreviousDisabled = false,
  isLastStretch = false,
  canSkipToNext = true
}) => {
  const { theme, isDark } = useTheme();
  
  // Add state to track countdown time
  const [countdown, setCountdown] = useState(5);
  
  // Effect to handle countdown when button is disabled
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    // Only run countdown when not paused and button is disabled
    if (!canSkipToNext && !isPaused) {
      // Don't reset countdown if we're just resuming from pause
      if (countdown === 5 || countdown === 0) {
        setCountdown(5);
      }
      
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [canSkipToNext, isPaused, countdown]);
  
  // Reset countdown when canSkipToNext changes to true
  useEffect(() => {
    if (canSkipToNext) {
      setCountdown(5);
    }
  }, [canSkipToNext]);

  // Normal button press handler with sound
  const handlePress = (callback: () => void) => {
    try {
      soundEffects.playClickSound();
      callback();
    } catch (error) {
      console.error('Error on button press:', error);
      // Still attempt to call the callback even if sound failed
      callback();
    }
  };
  
  // Pause button handler without sound
  const handlePauseToggle = () => {
    try {
      // Call toggle pause directly without sound
      onTogglePause();
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  return (
    <View style={[styles.controlsContainer, { 
      backgroundColor: isDark ? theme.cardBackground : '#FFF',
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEE'
    }]}>
      <TouchableOpacity 
        style={[
          styles.controlButton, 
          styles.sideButton,
          isPreviousDisabled && styles.disabledButton,
          { 
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
            opacity: isPreviousDisabled ? 0.7 : 1
          }
        ]} 
        onPress={() => !isPreviousDisabled && handlePress(onPrevious)}
        disabled={isPreviousDisabled}
        activeOpacity={isPreviousDisabled ? 0.5 : 0.7}
      >
        <View style={styles.buttonContentWrapper}>
          <Ionicons 
            name="chevron-back" 
            size={28} 
            color={isPreviousDisabled 
              ? (isDark ? "rgba(255,255,255,0.3)" : "#CCC") 
              : (isDark ? theme.text : "#333")} 
          />
          <Text style={[
            styles.controlText, 
            isPreviousDisabled && styles.disabledText,
            { color: isPreviousDisabled 
              ? (isDark ? "rgba(255,255,255,0.3)" : "#AAA") 
              : (isDark ? theme.text : "#333") }
          ]}>
            Previous
          </Text>
        </View>
      </TouchableOpacity>
      
      {/* Pause/Resume Button - No sound when clicking */}
      <TouchableOpacity 
        style={styles.centerButton} 
        onPress={handlePauseToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.centerButtonInner, { 
          backgroundColor: isDark ? theme.accent : '#4CAF50',
          shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000'
        }]}>
          <Ionicons 
            name={isPaused ? "play" : "pause"} 
            size={28} 
            color="#FFF" 
          />
        </View>
        <Text style={[styles.pauseText, { color: isDark ? theme.text : '#333' }]}>
          {isPaused ? "Resume" : "Pause"}
        </Text>
      </TouchableOpacity>
      
      {/* Next/Finish Button */}
      <TouchableOpacity 
        style={[
          styles.controlButton, 
          styles.sideButton,
          isLastStretch && styles.finishButton,
          !canSkipToNext && styles.disabledButton,
          { 
            backgroundColor: isLastStretch 
              ? (isDark ? theme.accent : '#4CAF50') 
              : (isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5'),
            opacity: !canSkipToNext ? 0.7 : 1
          }
        ]} 
        onPress={() => canSkipToNext && handlePress(onNext)}
        disabled={!canSkipToNext}
        activeOpacity={!canSkipToNext ? 0.5 : 0.7}
      >
        <View style={styles.buttonContentWrapper}>
          {!canSkipToNext ? (
            <View style={styles.countdownIndicator}>
              <Text style={[
                styles.countdownText,
                { color: isDark ? "rgba(255,255,255,0.5)" : "#999" }
              ]}>
                {countdown}s
              </Text>
            </View>
          ) : (
            <Ionicons 
              name={isLastStretch ? "checkmark-circle" : "chevron-forward"} 
              size={28} 
              color={!canSkipToNext 
                ? (isDark ? "rgba(255,255,255,0.3)" : "#CCC")
                : (isLastStretch ? "#FFF" : (isDark ? theme.text : "#333"))} 
            />
          )}
          <Text style={[
            styles.controlText,
            isLastStretch && styles.finishText,
            !canSkipToNext && styles.disabledText,
            { 
              color: !canSkipToNext 
                ? (isDark ? "rgba(255,255,255,0.3)" : "#AAA")
                : (isLastStretch ? "#FFF" : (isDark ? theme.text : "#333")) 
            }
          ]}>
            {!canSkipToNext ? "Wait" : (isLastStretch ? "Finish" : "Next")}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContentWrapper: {
    alignItems: 'center',
  },
  sideButton: {
    width: 100,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  centerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#F0F0F0',
    opacity: 0.7,
  },
  disabledText: {
    color: '#AAA',
  },
  finishButton: {
    backgroundColor: '#4CAF50',
  },
  finishText: {
    color: '#FFF',
  },
  pauseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  countdownIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#999',
  },
});

export default NavigationButtons; 
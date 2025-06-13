import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';

interface RoundStartMessageProps {
  balance: number;
  roundNumber: number;
  onComplete: () => void;
}

export const RoundStartMessage: React.FC<RoundStartMessageProps> = ({ 
  balance, 
  roundNumber, 
  onComplete 
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Hold for a moment
      setTimeout(() => {
        // Animate out
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete();
        });
      }, 2000);
    });
  }, []);

  const getMessage = () => {
    if (roundNumber === 0) {
      return {
        title: "Tutorial",
        subtitle: balance < 0 ? "Too much work! Add life items" : "Too much play! Add work items"
      };
    }

    const messages = {
      workHeavy: [
        { title: "Workaholic Alert!", subtitle: "Your boss dumped extra tasks on you" },
        { title: "Overtime Overload!", subtitle: "The scale tips toward burnout" },
        { title: "All Work, No Play!", subtitle: "Time to restore some balance" },
      ],
      lifeHeavy: [
        { title: "Party Mode!", subtitle: "You've been having too much fun" },
        { title: "Vacation Brain!", subtitle: "Work is piling up" },
        { title: "Play Time Overload!", subtitle: "Reality check needed" },
      ]
    };

    const messageType = balance < 0 ? 'workHeavy' : 'lifeHeavy';
    const messageList = messages[messageType];
    const randomMessage = messageList[Math.floor(Math.random() * messageList.length)];

    return randomMessage;
  };

  const { title, subtitle } = getMessage();

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
      pointerEvents="none"
    >
      <View style={[styles.messageBox, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.roundText, { color: theme.textSecondary }]}>
          Round {roundNumber === 0 ? 'Tutorial' : roundNumber}
        </Text>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        
        <View style={styles.scaleIndicator}>
          <View style={[styles.scaleBar, { backgroundColor: theme.border }]}>
            <View 
              style={[
                styles.scaleMarker,
                {
                  backgroundColor: balance < 0 ? '#FF6B6B' : '#4ECDC4',
                  left: `${50 + (balance / 2)}%`,
                }
              ]}
            />
          </View>
          <View style={styles.scaleLabels}>
            <Text style={[styles.scaleLabel, { color: theme.textSecondary }]}>Work</Text>
            <Text style={[styles.scaleLabel, { color: theme.textSecondary }]}>Life</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  messageBox: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    width: '80%',
    maxWidth: 350,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  scaleIndicator: {
    width: '100%',
    marginTop: 10,
  },
  scaleBar: {
    height: 8,
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  scaleMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -4,
    marginLeft: -8,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  scaleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
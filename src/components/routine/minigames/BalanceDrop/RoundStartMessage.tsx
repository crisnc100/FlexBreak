import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';

interface RoundStartMessageProps {
  balance: number;
  roundNumber: number;
  scenario?: { name: string; description: string; storyText?: string; tips: string[]; energyModifier: number };
  energyLeft: number;
  onComplete: () => void;
}

export const RoundStartMessage: React.FC<RoundStartMessageProps> = ({ 
  balance, 
  roundNumber,
  scenario,
  energyLeft,
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
      }, scenario?.storyText ? 3500 : 2000); // Longer duration if there's a story
    });
  }, []);

  const getMessage = () => {
    if (roundNumber === 0) {
      return {
        title: "Tutorial",
        subtitle: balance < 0 ? "Too much work! Add life items" : "Too much play! Add work items",
        description: "Learn the basics",
        energyStatus: `Energy: ${Math.round(energyLeft)}%`,
        tips: ["Drag items to the correct side", "Essential items can go anywhere", "Watch your energy levels"]
      };
    }

    if (scenario) {
      const balanceHint = balance < 0 ? "Work-heavy start" : balance > 0 ? "Life-heavy start" : "Balanced start";
      return {
        title: scenario.name,
        subtitle: scenario.description,
        story: scenario.storyText,
        description: balanceHint,
        energyStatus: `Energy: ${Math.round(energyLeft)}%`,
        tips: scenario.tips
      };
    }

    // Fallback for rounds without scenarios
    return {
      title: `Round ${roundNumber}`,
      subtitle: balance < 0 ? "Work overload!" : "Too much play!",
      description: "Find your balance",
      energyStatus: `Energy: ${Math.round(energyLeft)}%`,
      tips: ["Balance work and life", "Don't forget essentials", "Manage your energy"]
    };
  };

  const { title, subtitle, story, description, energyStatus, tips } = getMessage();

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
        
        {story && (
          <Text style={[styles.storyText, { color: theme.text }]}>{story}</Text>
        )}
        
        <View style={styles.infoRow}>
          <Text style={[styles.energyText, { color: energyLeft > 50 ? '#4CAF50' : '#FF9800' }]}>
            {energyStatus}
          </Text>
          <Text style={[styles.balanceText, { color: theme.textSecondary }]}>
            {description}
          </Text>
        </View>
        
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

        <View style={styles.tipsContainer}>
          {tips.map((tip, index) => (
            <Text key={index} style={[styles.tipText, { color: theme.textSecondary }]}>
              • {tip}
            </Text>
          ))}
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
    width: '85%',
    maxWidth: 400,
  },
  roundText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 22,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  energyText: {
    fontSize: 18,
    fontWeight: '700',
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '700',
  },
  tipsContainer: {
    marginTop: 15,
    width: '100%',
  },
  tipText: {
    fontSize: 16,
    marginBottom: 6,
  },
  storyText: {
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 10,
    lineHeight: 24,
    opacity: 0.9,
  },
});
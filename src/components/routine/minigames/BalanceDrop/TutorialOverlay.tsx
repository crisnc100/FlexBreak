import React, { useState, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';

interface TutorialOverlayProps {
  onComplete: () => void;
}

const tutorialSteps = [
  {
    text: "Welcome! Your work-life balance is off. Let's fix it!",
    arrowPosition: { bottom: 200, left: '50%' },
    arrowRotation: '180deg',
  },
  {
    text: "RED work items (meetings, emails) go LEFT",
    arrowPosition: { left: '25%', bottom: 120 },
    arrowRotation: '225deg',
  },
  {
    text: "GREEN/BLUE life items (family, health) go RIGHT", 
    arrowPosition: { right: '25%', bottom: 120 },
    arrowRotation: '315deg',
  },
  {
    text: "PURPLE items (lunch, water) can go ANYWHERE!",
    arrowPosition: null, // No arrow for this one
  },
  {
    text: "Energy bar depletes with each action. Zero = game over!",
    arrowPosition: { top: 120, left: '50%' },
    arrowRotation: '0deg',
  },
  {
    text: "Overwhelmed? Let items go in the side zones",
    arrowPosition: { left: 60, top: '40%' },
    arrowRotation: '270deg',
  },
  {
    text: "Try it now! Drag items to the correct sides",
    arrowPosition: null, // No arrow, let them practice
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = new Animated.Value(0);
  const arrowAnim = new Animated.Value(0);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Arrow bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: 10,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [currentStep]);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(currentStep + 1);
      });
    } else {
      onComplete();
    }
  };

  const step = tutorialSteps[currentStep];

  return (
    <View style={styles.tutorialOverlay} pointerEvents="box-none">
      <TouchableOpacity 
        style={[
          styles.tutorialInstruction,
          {
            opacity: fadeAnim,
            top: currentStep === 0 ? '20%' : '10%',
            alignSelf: 'center',
          }
        ]}
        onPress={nextStep}
        activeOpacity={0.9}
      >
        <Text style={styles.tutorialText}>{step.text}</Text>
        <Text style={[styles.tutorialText, { fontSize: 14, marginTop: 10 }]}>
          Tap here to continue ({currentStep + 1}/{tutorialSteps.length})
        </Text>
      </TouchableOpacity>

      {step.arrowPosition && (
        <Animated.View
          style={[
            styles.tutorialArrow,
            step.arrowPosition as any,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: arrowAnim },
                { rotate: step.arrowRotation },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="arrow-down" size={40} color="#FFFFFF" />
        </Animated.View>
      )}
    </View>
  );
};
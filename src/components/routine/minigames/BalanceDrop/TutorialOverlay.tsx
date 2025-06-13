import React, { useState, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';

interface TutorialOverlayProps {
  onComplete: () => void;
}

const tutorialSteps = [
  {
    text: "Life is rarely balanced! Fix the tilted scale",
    arrowPosition: { bottom: 200, left: '50%' },
    arrowRotation: '180deg',
  },
  {
    text: "Drag work items to the WORK side (left)",
    arrowPosition: { left: '25%', bottom: 120 },
    arrowRotation: '225deg',
  },
  {
    text: "Drag life items to the LIFE side (right)",
    arrowPosition: { right: '25%', bottom: 120 },
    arrowRotation: '315deg',
  },
  {
    text: "Watch your energy! Some items restore it",
    arrowPosition: { top: 120, left: '50%' },
    arrowRotation: '0deg',
  },
  {
    text: "Let go of items on the sides if needed",
    arrowPosition: { left: 60, top: '40%' },
    arrowRotation: '270deg',
  },
  {
    text: "Keep your balance! Too much work or life = game over",
    arrowPosition: { bottom: 160, left: '50%' },
    arrowRotation: '180deg',
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
    <TouchableOpacity style={styles.tutorialOverlay} onPress={nextStep} activeOpacity={1}>
      <Animated.View 
        style={[
          styles.tutorialInstruction,
          {
            opacity: fadeAnim,
            top: '45%',
            alignSelf: 'center',
          }
        ]}
      >
        <Text style={styles.tutorialText}>{step.text}</Text>
        <Text style={[styles.tutorialText, { fontSize: 14, marginTop: 10 }]}>
          Tap to continue ({currentStep + 1}/{tutorialSteps.length})
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.tutorialArrow,
          step.arrowPosition,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: arrowAnim },
              { rotate: step.arrowRotation },
            ],
          },
        ]}
      >
        <Ionicons name="arrow-down" size={40} color="#FFFFFF" />
      </Animated.View>
    </TouchableOpacity>
  );
};
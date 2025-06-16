import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TutorialScreenProps {
  theme: any;
  onSkip: () => void;
  onStart: () => void;
  onSmartSkip?: () => void;
}

export const TutorialScreen: React.FC<TutorialScreenProps> = ({
  theme,
  onSkip,
  onStart,
  onSmartSkip
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Subtle pulse animation for the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.startScreen}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
          <Ionicons name="shield-checkmark" size={80} color={theme.accent} />
        </View>
      </Animated.View>
      
      <Text style={[styles.title, { color: theme.text }]}>
        Posture Defense
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Stop bad posture monsters!
      </Text>

      {/* Simple Monster Preview */}
      <View style={styles.monsterPreview}>
        <Image 
          source={require('../../../../../assets/images/miniGames/techNeck.png')}
          style={styles.mainMonster}
          resizeMode="contain"
        />
        <View style={styles.vsText}>
          <Text style={[styles.vs, { color: theme.accent }]}>VS</Text>
        </View>
        <View style={styles.stretchPadPreview}>
          <Image 
            source={require('../../../../../assets/images/miniGames/headspaceHalo1.png')}
            style={styles.stretchPadImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Simple How to Play */}
      <View style={styles.howToPlay}>
        <View style={styles.instruction}>
          <Ionicons name="finger-print" size={30} color={theme.accent} />
          <Text style={[styles.instructionText, { color: theme.text }]}>
            TAP to place stretch pads
          </Text>
        </View>
        <View style={styles.instruction}>
          <Ionicons name="flash" size={30} color="#FFD700" />
          <Text style={[styles.instructionText, { color: theme.text }]}>
            Costs energy to build
          </Text>
        </View>
        <View style={styles.instruction}>
          <Ionicons name="heart" size={30} color="#FF6B6B" />
          <Text style={[styles.instructionText, { color: theme.text }]}>
            Don't lose all hearts!
          </Text>
        </View>
      </View>
      
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: theme.accent }]}
          onPress={onStart}
        >
          <Text style={styles.playButtonText}>PLAY</Text>
        </TouchableOpacity>
        
        {onSmartSkip && (
          <TouchableOpacity
            style={[styles.quickStartButton, { 
              borderColor: theme.border,
              borderWidth: 2,
              backgroundColor: 'transparent'
            }]}
            onPress={onSmartSkip}
          >
            <Text style={[styles.quickStartText, { color: theme.text }]}>
              Quick Start
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
        >
          <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.8,
  },
  monsterPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    gap: 20,
  },
  mainMonster: {
    width: 80,
    height: 80,
  },
  vsText: {
    paddingHorizontal: 10,
  },
  vs: {
    fontSize: 24,
    fontWeight: '800',
  },
  stretchPadPreview: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stretchPadImage: {
    width: 90,
    height: 90,
  },
  howToPlay: {
    gap: 20,
    marginBottom: 50,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
  },
  buttons: {
    width: '100%',
    gap: 16,
    alignItems: 'center',
  },
  playButton: {
    paddingVertical: 20,
    paddingHorizontal: 80,
    borderRadius: 30,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  quickStartButton: {
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 25,
    alignItems: 'center',
  },
  quickStartText: {
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
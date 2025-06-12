import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface WaveAnnouncementComponentProps {
  wave: number;
  phase: string;
  theme: any;
  onComplete: () => void;
}

export const WaveAnnouncementComponent: React.FC<WaveAnnouncementComponentProps> = ({
  wave,
  phase,
  theme,
  onComplete
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 1.5 seconds for faster gameplay
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete();
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [wave, phase]);

  const getWaveTitle = () => {
    if (phase === 'tutorial') return 'Tutorial Wave';
    if (phase === 'boss') return 'BOSS WAVE';
    return `Wave ${wave}`;
  };

  const getWaveSubtitle = () => {
    if (phase === 'tutorial') return 'Learn the basics!';
    if (phase === 'boss') return 'Final Challenge!';
    return 'Incoming Attack!';
  };

  const getWaveColor = () => {
    if (phase === 'tutorial') return '#FFD700';
    if (phase === 'boss') return '#FF4444';
    return theme.accent;
  };

  return (
    <View style={styles.overlay}>
      <Animated.View 
        style={[
          styles.container,
          {
            backgroundColor: theme.cardBackground,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <Text style={[styles.title, { color: getWaveColor() }]}>
          {getWaveTitle()}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {getWaveSubtitle()}
        </Text>
        
        {/* Wave number display for regular waves */}
        {phase !== 'tutorial' && phase !== 'boss' && (
          <View style={[styles.waveNumber, { backgroundColor: getWaveColor() }]}>
            <Text style={styles.waveNumberText}>{wave}</Text>
          </View>
        )}
        
        {/* Special icon for tutorial/boss */}
        {(phase === 'tutorial' || phase === 'boss') && (
          <Text style={[styles.specialIcon, { color: getWaveColor() }]}>
            {phase === 'tutorial' ? '📚' : '👹'}
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
  },
  container: {
    width: width * 0.8,
    maxWidth: 320,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  waveNumber: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  waveNumberText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  specialIcon: {
    fontSize: 48,
    marginTop: 8,
  },
});
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MonsterType } from './types';

const { width, height } = Dimensions.get('window');

interface WaveAnnouncementProps {
  wave: number;
  monstersInWave: MonsterType[];
  onComplete: () => void;
}

export const WaveAnnouncement: React.FC<WaveAnnouncementProps> = ({
  wave,
  monstersInWave,
  onComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Slide in and scale up
    const showAnimation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    // Wait then fade out
    const hideAnimation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    showAnimation.start(() => {
      setTimeout(() => {
        hideAnimation.start(() => {
          onComplete();
        });
      }, 3000); // Show for 3 seconds
    });
  }, []);

  const getWaveMessage = (waveNum: number, monsters: MonsterType[]) => {
    switch (waveNum) {
      case 1:
        return {
          title: "Wave 1: Screen Time Strain",
          subtitle: "Tech Neck monsters are approaching!",
          description: "Defeat with NECK stretches",
          icon: "phone-portrait",
          color: "#FF6B6B"
        };
      case 2:
        return {
          title: "Wave 2: Memory Challenge",
          subtitle: "No more hints! Buttons shuffle!",
          description: "Remember what works from Wave 1",
          icon: "eye-off",
          color: "#4ECDC4"
        };
      case 3:
        return {
          title: "Wave 3: Stretch Master",
          subtitle: "Real stretches! Deck rotates every 15s!",
          description: "Learn actual stretch names",
          icon: "library",
          color: "#E74C3C"
        };
      default:
        return {
          title: `Wave ${waveNum}`,
          subtitle: "Posture monsters incoming!",
          description: "Defend with stretches",
          icon: "shield",
          color: "#6366F1"
        };
    }
  };

  const getMonsterDescription = (monster: MonsterType) => {
    switch (monster) {
      case 'tech_neck':
        return "📱 Tech Neck - Forward head posture";
      case 'desk_hunch':
        return "💻 Desk Hunch - Rounded shoulders";
      case 'slouch_slump':
        return "🪑 Slouch Slump - Curved spine";
      case 'lean_twist':
        return "↗️ Lean Twist - Spinal misalignment";
    }
  };

  const message = getWaveMessage(wave, monstersInWave);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
          ],
        },
      ]}
    >
      <View style={[styles.announcement, { borderColor: message.color, shadowColor: message.color }]}>
        {/* Wave Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: message.color }]}>
            <Ionicons name={message.icon as any} size={32} color="#FFFFFF" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{message.title}</Text>
            <Text style={[styles.subtitle, { color: message.color }]}>
              {message.subtitle}
            </Text>
          </View>
        </View>

        {/* Monster List */}
        <View style={styles.monsterList}>
          <Text style={styles.listTitle}>Enemies This Wave:</Text>
          {monstersInWave.map((monster, index) => (
            <Text key={index} style={styles.monsterItem}>
              {getMonsterDescription(monster)}
            </Text>
          ))}
        </View>

        {/* Strategy Tip */}
        <View style={styles.strategyTip}>
          <Ionicons name="bulb" size={16} color="#FFD700" />
          <Text style={styles.tipText}>{message.description}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  announcement: {
    width: width * 0.85,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    elevation: 10,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  monsterList: {
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  monsterItem: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 4,
    paddingLeft: 8,
  },
  strategyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
  },
});
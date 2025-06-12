import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PAD_CONFIG } from './constants';

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
  return (
    <View style={styles.startScreen}>
      <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
        <Ionicons name="construct" size={48} color={theme.accent} />
      </View>
      
      <Text style={[styles.title, { color: theme.text }]}>
        Posture Defense
      </Text>
      
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Build stretch pads to defend against bad posture monsters!
      </Text>

      {/* Monster Showcase */}
      <View style={styles.showcaseSection}>
        <Text style={[styles.showcaseTitle, { color: theme.accent }]}>
          👾 Posture Monsters
        </Text>
        <View style={styles.monsterShowcase}>
          <View style={styles.showcaseItem}>
            <Image 
              source={require('../../../../../assets/images/miniGames/techNeck.png')}
              style={styles.showcaseImage}
              resizeMode="contain"
            />
            <Text style={[styles.showcaseLabel, { color: theme.text }]}>Tech Neck</Text>
          </View>
          <View style={styles.showcaseItem}>
            <Image 
              source={require('../../../../../assets/images/miniGames/slouchSlump.png')}
              style={styles.showcaseImage}
              resizeMode="contain"
            />
            <Text style={[styles.showcaseLabel, { color: theme.text }]}>Slouch Slump</Text>
          </View>
          <View style={styles.showcaseItem}>
            <Image 
              source={require('../../../../../assets/images/miniGames/deskHunch2.png')}
              style={styles.showcaseImage}
              resizeMode="contain"
            />
            <Text style={[styles.showcaseLabel, { color: theme.text }]}>Desk Hunch</Text>
          </View>
          <View style={styles.showcaseItem}>
            <Image 
              source={require('../../../../../assets/images/miniGames/leanTwist.png')}
              style={styles.showcaseImage}
              resizeMode="contain"
            />
            <Text style={[styles.showcaseLabel, { color: theme.text }]}>Lean Twist</Text>
          </View>
        </View>
      </View>

      {/* Stretch Pad Showcase */}
      <View style={styles.showcaseSection}>
        <Text style={[styles.showcaseTitle, { color: theme.success }]}>
          🧘 Stretch Pads
        </Text>
        <View style={styles.padShowcase}>
          {Object.values(PAD_CONFIG).map(pad => (
            <View key={pad.id} style={styles.showcaseItem}>
              <View style={[styles.padPreview, { backgroundColor: pad.color + '40' }]}>
                <Image 
                  source={pad.image}
                  style={styles.showcasePadImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.showcaseLabel, { color: theme.text }]}>
                {pad.name.replace(' Pad', '')}
              </Text>
              <Text style={[styles.showcaseCost, { color: pad.color }]}>
                {pad.cost}⚡
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.quickTips}>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          🎯 Place pads on strategic positions to defend
        </Text>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          ⚡ Energy: +1 every 6s, +1 per kill
        </Text>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          💖 3 hearts - don't let monsters reach the defender!
        </Text>
      </View>
      
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: theme.accent }]}
          onPress={onStart}
        >
          <Text style={styles.playButtonText}>Start Defense</Text>
        </TouchableOpacity>
        
        {onSmartSkip && (
          <TouchableOpacity
            style={[styles.smartSkipButton, { backgroundColor: theme.success }]}
            onPress={onSmartSkip}
          >
            <Text style={styles.smartSkipButtonText}>
              🚀 Quick Start (Skip Tutorial)
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
        >
          <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
            Skip Game
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  quickTips: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tipText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  playButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  smartSkipButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  smartSkipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  showcaseSection: {
    marginBottom: 16,
    width: '100%',
  },
  showcaseTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  monsterShowcase: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  padShowcase: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  showcaseItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  showcaseImage: {
    width: 40,
    height: 40,
    marginBottom: 4,
  },
  showcasePadImage: {
    width: 30,
    height: 30,
  },
  padPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  showcaseLabel: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  showcaseCost: {
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
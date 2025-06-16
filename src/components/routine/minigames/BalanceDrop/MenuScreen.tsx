import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { styles } from './styles';

interface MenuScreenProps {
  onStartTutorial: () => void;
  onStartGame: () => void;
  onSkip: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ onStartTutorial, onStartGame, onSkip }) => {
  const { theme } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Subtle pulse animation for the scale icon
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.menuContainer}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons name="scale-outline" size={80} color={theme.accent} style={{ alignSelf: 'center', marginBottom: 20 }} />
        </Animated.View>
        
        <Text style={[styles.title, { color: theme.text, fontSize: 42, marginBottom: 16 }]}>Life Balance</Text>
        
        <View style={styles.sideInfo}>
          <View style={[styles.sideCard, { backgroundColor: '#FF6B6B20', padding: 20 }]}>
            <Ionicons name="briefcase" size={36} color="#FF6B6B" />
            <Text style={[styles.sideLabel, { color: theme.text, fontSize: 18 }]}>WORK</Text>
            <Text style={[styles.sideText, { color: theme.textSecondary, fontSize: 14 }]}>Left</Text>
          </View>
          
          <View style={[styles.sideCard, { backgroundColor: '#4CAF5020', padding: 20 }]}>
            <Ionicons name="heart" size={36} color="#4CAF50" />
            <Text style={[styles.sideLabel, { color: theme.text, fontSize: 18 }]}>LIFE</Text>
            <Text style={[styles.sideText, { color: theme.textSecondary, fontSize: 14 }]}>Right</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.startButton, { 
            backgroundColor: theme.accent, 
            paddingVertical: 20,
            paddingHorizontal: 60,
            marginTop: 40
          }]}
          onPress={onStartGame}
        >
          <Text style={[styles.startButtonText, { fontSize: 24 }]}>PLAY</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.startButton, { 
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: theme.border,
            paddingVertical: 14,
            paddingHorizontal: 40,
            marginTop: 16
          }]}
          onPress={onStartTutorial}
        >
          <Text style={[styles.startButtonText, { color: theme.text, fontSize: 18 }]}>Tutorial</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onSkip} style={{ marginTop: 20 }}>
          <Text style={[styles.skipText, { color: theme.textSecondary, fontSize: 16 }]}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
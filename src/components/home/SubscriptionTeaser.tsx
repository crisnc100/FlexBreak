import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { tw } from '../../utils/tw';
import { LinearGradient } from 'expo-linear-gradient';

interface SubscriptionTeaserProps {
  onPremiumPress: () => void;
  text?: string;
  buttonText?: string;
}

/**
 * Enhanced subscription teaser component that promotes premium features
 * with improved visual design
 */
const SubscriptionTeaser: React.FC<SubscriptionTeaserProps> = ({
  onPremiumPress,
  text = 'Unlock Premium Features',
  buttonText = 'Upgrade Now'
}) => {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? 
          ['#263238', '#37474F'] : 
          ['#FFD54F', '#FFA000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="star" 
              size={24} 
              color={isDark ? "#FFD700" : "#FFFFFF"} 
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {isDark ? 'DeskStretch Premium' : 'Go Premium'}
            </Text>
            <Text style={styles.description}>
              {text}
            </Text>
            
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={isDark ? "#4CAF50" : "#FFFFFF"} />
                <Text style={styles.featureText}>Custom Routines</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={isDark ? "#4CAF50" : "#FFFFFF"} />
                <Text style={styles.featureText}>Analytics and Rewards</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={isDark ? "#4CAF50" : "#FFFFFF"} />
                <Text style={styles.featureText}>Smart Reminders</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={onPremiumPress}
            style={[
              styles.button,
              { backgroundColor: isDark ? '#FFD700' : '#FFFFFF' }
            ]}
          >
            <Text style={[
              styles.buttonText,
              { color: isDark ? '#263238' : '#FF9800' }
            ]}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    borderRadius: 16,
  },
  contentContainer: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  featureText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default SubscriptionTeaser; 
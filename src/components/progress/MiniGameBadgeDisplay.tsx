import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import * as haptics from '../../utils/haptics';

interface MiniGameBadge {
  id: string;
  title: string;
  description: string;
  badgeImage: any;
  isUnlocked: boolean;
  dateCompleted?: string;
  xp?: number;
}

interface MiniGameBadgeDisplayProps {
  badge: MiniGameBadge;
  size?: 'small' | 'medium' | 'large';
  showTitle?: boolean;
  onPress?: (badge: MiniGameBadge) => void;
}

export const MiniGameBadgeDisplay: React.FC<MiniGameBadgeDisplayProps> = ({
  badge,
  size = 'medium',
  showTitle = true,
  onPress,
}) => {
  const { theme, isDark, isSunset } = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.containerSmall,
          image: styles.imageSmall,
          title: styles.titleSmall,
        };
      case 'large':
        return {
          container: styles.containerLarge,
          image: styles.imageLarge,
          title: styles.titleLarge,
        };
      default:
        return {
          container: styles.containerMedium,
          image: styles.imageMedium,
          title: styles.titleMedium,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const handlePress = () => {
    if (onPress && badge.isUnlocked) {
      haptics.light();
      onPress(badge);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, sizeStyles.container]}
      onPress={handlePress}
      activeOpacity={badge.isUnlocked ? 0.8 : 1}
      disabled={!badge.isUnlocked}
    >
      <View style={[styles.badgeContainer, badge.isUnlocked && styles.badgeUnlocked]}>
        <Image
          source={badge.badgeImage}
          style={[
            sizeStyles.image,
            !badge.isUnlocked && styles.badgeLocked,
          ]}
          resizeMode="contain"
        />
      </View>
      
      {showTitle && (
        <Text 
          style={[
            sizeStyles.title,
            { color: badge.isUnlocked 
              ? (isDark || isSunset ? theme.text : '#333')
              : (isDark || isSunset ? 'rgba(255,255,255,0.5)' : '#999')
            }
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {badge.title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerSmall: {
    width: 50,
  },
  containerMedium: {
    width: 70,
  },
  containerLarge: {
    width: 90,
  },
  badgeContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeUnlocked: {
    // Removed shadow to reduce clutter
  },
  imageSmall: {
    width: 40,
    height: 40,
  },
  imageMedium: {
    width: 56,
    height: 56,
  },
  imageLarge: {
    width: 72,
    height: 72,
  },
  badgeLocked: {
    opacity: 0.4,
    tintColor: '#666',
  },
  titleSmall: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  titleMedium: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  titleLarge: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
});
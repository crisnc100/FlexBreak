import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PremiumTeaserProps {
  theme: any;
  isDark: boolean;
  isSunset: boolean;
  requiredLevel: number;
  refreshFeatureAccess: () => Promise<void>;
  onClose: () => void;
  userLevel?: number;
  isPremium?: boolean;
}

const PremiumTeaser: React.FC<PremiumTeaserProps> = ({
  theme,
  isDark,
  isSunset,
  requiredLevel,
  refreshFeatureAccess,
  onClose,
  userLevel = 1,
  isPremium = false
}) => {
  const handleGotItPressed = async () => {
    await refreshFeatureAccess();
    onClose();
  };

  const getTeaserMessage = () => {
    if (!isPremium) {
      return "Custom Routines are available to premium subscribers. Upgrade to Premium to unlock this feature and more!";
    } else if (userLevel < requiredLevel) {
      return `You're making progress! Custom Routines will unlock at level ${requiredLevel}. You're currently at level ${userLevel}.`;
    } else {
      return "Checking feature access..."; // Fallback message
    }
  };

  const getButtonText = () => {
    if (!isPremium) {
      return "Get Premium";
    } else if (userLevel < requiredLevel) {
      return "Keep Stretching";
    } else {
      return "Got It";
    }
  };

  const getIcon = (): string => {
    if (!isPremium) {
      return "diamond-outline";
    } else {
      return "fitness-outline";
    }
  };

  return (
    <View style={styles.premiumTeaser}>
      <View style={[
        styles.iconContainer,
        { 
          backgroundColor: isPremium 
            ? `${theme.accent}20` 
            : isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
        }
      ]}>
        <Ionicons 
          name={getIcon() as any} 
          size={48} 
          color={isPremium ? theme.accent : isDark || isSunset ? theme.textSecondary : '#aaa'} 
        />
      </View>
      
      <Text style={[
        styles.premiumTeaserTitle,
        { color: theme.text }
      ]}>
        {isPremium ? `Level ${requiredLevel} Feature` : "Premium Feature"}
      </Text>
      
      <Text style={[
        styles.premiumTeaserText,
        { color: theme.textSecondary }
      ]}>
        {getTeaserMessage()}
      </Text>
      
      {isPremium && userLevel < requiredLevel && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  backgroundColor: theme.accent,
                  width: `${Math.min((userLevel / requiredLevel) * 100, 100)}%` 
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {userLevel}/{requiredLevel} levels
          </Text>
        </View>
      )}
      
      <TouchableOpacity
        style={[
          styles.premiumButton,
          { backgroundColor: theme.accent }
        ]}
        onPress={handleGotItPressed}
      >
        <Text style={styles.premiumButtonText}>{getButtonText()}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  premiumTeaser: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumTeaserTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  premiumTeaserText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'right',
  },
  premiumButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  premiumButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PremiumTeaser; 
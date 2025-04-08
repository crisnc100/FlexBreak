import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PremiumTeaserProps {
  theme: any;
  isDark: boolean;
  requiredLevel: number;
  refreshFeatureAccess: () => Promise<void>;
  onClose: () => void;
}

const PremiumTeaser: React.FC<PremiumTeaserProps> = ({
  theme,
  isDark,
  requiredLevel,
  refreshFeatureAccess,
  onClose
}) => {
  const handleGotItPressed = async () => {
    await refreshFeatureAccess();
    onClose();
  };

  return (
    <View style={styles.premiumTeaser}>
      <Ionicons 
        name="lock-closed" 
        size={48} 
        color={isDark ? theme.textSecondary : '#ccc'} 
      />
      <Text style={[
        styles.premiumTeaserTitle,
        { color: theme.text }
      ]}>
        Premium Feature
      </Text>
      <Text style={[
        styles.premiumTeaserText,
        { color: theme.textSecondary }
      ]}>
        Custom Routines are available to premium users at level {requiredLevel}.
      </Text>
      <TouchableOpacity
        style={[
          styles.premiumButton,
          { backgroundColor: theme.accent }
        ]}
        onPress={handleGotItPressed}
      >
        <Text style={styles.premiumButtonText}>Got it</Text>
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
  premiumTeaserTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  premiumTeaserText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  premiumButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  premiumButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PremiumTeaser; 
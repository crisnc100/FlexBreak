import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  reason: 'wednesday-only' | 'daily-limit' | 'feature-locked';
  onUpgrade?: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  visible,
  onClose,
  reason,
  onUpgrade
}) => {
  const { theme } = useTheme();
  const { showSubscriptionModal } = usePremium();

  const getContent = () => {
    switch (reason) {
      case 'wednesday-only':
        return {
          icon: 'calendar-outline',
          title: 'Available on Wednesdays',
          message: 'AI Wellness Coach is available to free users on Wednesdays only.',
          benefits: [
            'Chat with AI Flex Coach every day',
            'Unlimited wellness conversations',
            'Personalized movement suggestions',
            '30-minute effectiveness tracking'
          ],
          cta: 'Upgrade for Daily Access'
        };
      case 'daily-limit':
        return {
          icon: 'chatbubbles-outline',
          title: 'Daily Limit Reached',
          message: "You've used your 3 free AI wellness chats for today.",
          benefits: [
            'Unlimited daily conversations',
            'Priority AI responses',
            'Advanced wellness insights',
            'Pattern recognition & tracking'
          ],
          cta: 'Upgrade for Unlimited Chats'
        };
      case 'feature-locked':
        return {
          icon: 'lock-closed-outline',
          title: 'Premium Feature',
          message: 'This feature requires a premium subscription.',
          benefits: [
            'Full AI Wellness Coach access',
            'All premium features unlocked',
            'Advanced analytics & insights',
            'Priority support'
          ],
          cta: 'Unlock Premium Features'
        };
    }
  };

  const content = getContent();

  const handleUpgrade = () => {
    onClose();
    if (onUpgrade) {
      onUpgrade();
    } else {
      showSubscriptionModal();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name={content.icon as any} size={48} color={theme.accent} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{content.title}</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>{content.message}</Text>

          <View style={styles.benefitsContainer}>
            <Text style={[styles.benefitsTitle, { color: theme.text }]}>
              Upgrade to Premium for:
            </Text>
            {content.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={[styles.benefitText, { color: theme.text }]}>{benefit}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: theme.accent }]}
            onPress={handleUpgrade}
          >
            <Ionicons name="sparkles" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.upgradeButtonText}>{content.cta}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterButton}
            onPress={onClose}
          >
            <Text style={[styles.laterButtonText, { color: theme.textSecondary }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  laterButton: {
    padding: 8,
  },
  laterButtonText: {
    fontSize: 14,
  },
});
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  FlatList,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';

// Key benefits to show in the promotion
const BENEFITS = [
  { id: '1', icon: 'star', title: 'Track Progress', description: 'Track your stretching progress and earn achievements' },
  { id: '2', icon: 'fitness', title: 'Custom Routines', description: 'Create and save your own stretching routines' },
  { id: '3', icon: 'moon', title: 'Dark Mode', description: 'Reduce eye strain with a sleek dark theme' },
  { id: '4', icon: 'shield-checkmark', title: 'Streak Protection', description: 'Protect your streak when you miss a day' },
  { id: '5', icon: 'sparkles', title: 'Premium Stretches', description: 'Access advanced stretching techniques' }
];

interface PremiumPromotionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  source?: string; // Where this modal is being shown from
}

const PremiumPromotionModal: React.FC<PremiumPromotionModalProps> = ({
  visible,
  onClose,
  onSubscribe,
  source = 'app'
}) => {
  const { theme, isDark } = useTheme();
  const { isPremium } = usePremium();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);
  
  // Don't show for premium users
  if (isPremium) {
    return null;
  }

  const renderBenefitItem = ({ item }) => (
    <View style={styles.benefitItem}>
      <View style={[styles.iconContainer, { backgroundColor: isDark ? theme.backgroundLight : '#ebf5ff' }]}>
        <Ionicons name={item.icon} size={24} color={theme.accent} />
      </View>
      <View style={styles.benefitTextContainer}>
        <Text style={[styles.benefitTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.benefitDescription, { color: theme.textSecondary }]}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.cardBackground,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Upgrade to Premium</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.taglineContainer}>
            <Text style={[styles.tagline, { color: theme.accent }]}>
              Unlock the full FlexBreak experience
            </Text>
          </View>
          
          <FlatList
            data={BENEFITS}
            renderItem={renderBenefitItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.benefitsList}
          />
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: theme.accent }]}
              onPress={onSubscribe}
            >
              <Text style={styles.subscribeButtonText}>View Premium Plans</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.noThanksButton]}
              onPress={onClose}
            >
              <Text style={[styles.noThanksButtonText, { color: theme.textSecondary }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  taglineContainer: {
    marginBottom: 20,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
  },
  benefitsList: {
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  buttonsContainer: {
    marginTop: 8,
  },
  subscribeButton: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noThanksButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  noThanksButtonText: {
    fontSize: 14,
  },
});

export default PremiumPromotionModal; 
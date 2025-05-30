import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RoutineRecommendation } from '../utils/generators/smartPickGenerator';
import { useTheme } from '../context/ThemeContext';

interface SmartPickModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
  isPremium?: boolean;
  recommendation?: RoutineRecommendation;
  onStartRecommendation?: (recommendation: RoutineRecommendation) => void;
}

export default function SmartPickModal({ 
  visible, 
  onClose, 
  onUpgrade, 
  isPremium = false,
  recommendation,
  onStartRecommendation
}: SmartPickModalProps) {
  const { theme, isDark } = useTheme();

  // Helper to render the routine mode badge
  const renderModeBadge = () => {
    if (!recommendation) return null;
    
    // Check if it's a Dynamic Flow routine
    const isDynamicFlow = recommendation.area === 'Dynamic Flow';
    
    if (isDynamicFlow) {
      return (
        <View style={[styles.modeBadge, { backgroundColor: 'rgba(138, 43, 226, 0.15)' }]}>
          <Ionicons name="fitness" size={14} color="blueviolet" />
          <Text style={[styles.modeBadgeText, { color: 'blueviolet' }]}>
            Dynamic Flow
          </Text>
        </View>
      );
    }
    
    // Office Friendly badge
    if (recommendation.isOfficeFriendly) {
      return (
        <View style={[styles.modeBadge, { backgroundColor: 'rgba(25, 118, 210, 0.15)' }]}>
          <Ionicons name="briefcase" size={14} color="#1976D2" />
          <Text style={[styles.modeBadgeText, { color: '#1976D2' }]}>
            Office Friendly
          </Text>
        </View>
      );
    }
    
    // All positions badge
    return (
      <View style={[styles.modeBadge, { backgroundColor: 'rgba(46, 125, 50, 0.15)' }]}>
        <Ionicons name="expand" size={14} color="#2E7D32" />
        <Text style={[styles.modeBadgeText, { color: '#2E7D32' }]}>
          All Positions
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { backgroundColor: isDark ? theme.cardBackground : '#fff' }
        ]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={isDark ? theme.text : '#333'} />
          </TouchableOpacity>
          
          <Ionicons 
            name="bulb" 
            size={60} 
            color={isPremium ? "#4CAF50" : "#9E9E9E"} 
            style={styles.featureIcon} 
          />
          
          <Text style={[
            styles.modalHeader,
            { color: isDark ? theme.text : '#333' }
          ]}>Smart Pick</Text>
          
          {isPremium && recommendation ? (
            // Premium user with recommendation
            <>
              <View style={styles.recommendationBox}>
                <Text style={[
                  styles.recommendationTitle,
                  { color: isDark ? theme.text : '#333' }
                ]}>
                  {recommendation.area} - {recommendation.duration} min
                </Text>
                
                {renderModeBadge()}
                
                <Text style={[
                  styles.recommendationReason,
                  { color: isDark ? theme.textSecondary : '#666' }
                ]}>
                  {recommendation.reason}
                </Text>
                
                {recommendation.isPremiumEnabled && (
                  <View style={styles.premiumBadgeContainer}>
                    <Ionicons name="star" size={16} color="#FF9800" />
                    <Text style={[
                      styles.premiumBadgeText,
                      { color: isDark ? '#FFC107' : '#FF9800' }
                    ]}>
                      Includes premium stretches
                    </Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.startButton} 
                onPress={() => {
                  onStartRecommendation && onStartRecommendation(recommendation);
                  onClose();
                }}
              >
                <Text style={styles.startButtonText}>Start Routine</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Non-premium user or premium user without recommendation
            <>
              <Text style={[
                styles.modalDescription,
                { color: isDark ? theme.textSecondary : '#666' }
              ]}>
                {isPremium 
                  ? "We couldn't generate a recommendation at this time. Please try again later." 
                  : "Smart Pick is a premium feature that analyzes your stretching history to suggest personalized routines based on your patterns and needs."}
              </Text>
              
              {!isPremium && (
                <View style={styles.disabledFeatureBox}>
                  <Ionicons name="lock-closed" size={24} color="#9E9E9E" />
                  <Text style={styles.disabledFeatureText}>
                    This feature requires premium to unlock
                  </Text>
                </View>
              )}

              {!isPremium && (
                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={24} color="#9E9E9E" />
                    <Text style={[
                      styles.benefitText,
                      { color: isDark ? theme.text : '#333', opacity: 0.6 }
                    ]}>Personalized recommendations</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={24} color="#9E9E9E" />
                    <Text style={[
                      styles.benefitText,
                      { color: isDark ? theme.text : '#333', opacity: 0.6 }
                    ]}>Based on your stretching history</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={24} color="#9E9E9E" />
                    <Text style={[
                      styles.benefitText,
                      { color: isDark ? theme.text : '#333', opacity: 0.6 }
                    ]}>Targets neglected body areas</Text>
                  </View>
                </View>
              )}
            </>
          )}
          
          <TouchableOpacity 
            style={[
              isPremium ? styles.skipButton : styles.closeButton2, 
              !isPremium && { marginTop: 20 }
            ]} 
            onPress={onClose}
          >
            <Text style={[
              styles.skipButtonText,
              { color: isDark ? theme.textSecondary : '#666' }
            ]}>{isPremium ? "Maybe Later" : "Close"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  closeButton2: {
    padding: 12,
    width: '100%',
    alignItems: 'center',
  },
  featureIcon: {
    marginBottom: 16,
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  upgradeButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#666',
  },
  recommendationBox: {
    width: '100%',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  recommendationReason: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  premiumBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 4,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 4,
    alignSelf: 'center',
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 16,
    marginVertical: 8,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  disabledFeatureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    width: '100%',
  },
  disabledFeatureText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
    fontWeight: '500'
  }
}); 
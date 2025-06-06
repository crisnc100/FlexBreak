/**
 * Professional Office Worker Verification Modal
 * Uses ZeroBounce API for accurate business email verification
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ZeroBounceVerificationService } from '../services/zeroBounceVerificationService';

interface OfficeWorkerVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onVerificationComplete: (approved: boolean, details?: any) => void;
}

export const OfficeWorkerVerificationModal: React.FC<OfficeWorkerVerificationModalProps> = ({
  visible,
  onClose,
  onVerificationComplete
}) => {
  const [step, setStep] = useState<'intro' | 'email' | 'verifying'>('intro');
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleStartVerification = () => {
    setStep('email');
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Missing Email', 'Please enter your work email address.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsVerifying(true);
    setStep('verifying');

    try {
      const result = await ZeroBounceVerificationService.verifyOfficeWorkerEmail(email.trim());
      
      setIsVerifying(false);

      switch (result.status) {
        case 'approved':
          Alert.alert(
            '✅ Verification Successful!',
            result.message,
            [{ 
              text: 'Continue to Subscription', 
              onPress: () => {
                onVerificationComplete(true, result.details);
              }
            }]
          );
          break;

        case 'already_used':
          Alert.alert(
            '⚠️ Email Already Used',
            result.message + '\n\nIf this is your email and you\'re having issues, contact: flexbreakapp@gmail.com',
            [{ text: 'OK', onPress: () => setStep('email') }]
          );
          break;

        case 'rejected':
          Alert.alert(
            '❌ Verification Failed',
            result.message + '\n\nFor manual verification, email flexbreakapp@gmail.com with your work details.',
            [
              { text: 'Try Again', onPress: () => setStep('email') },
              { text: 'Contact Support', onPress: onClose }
            ]
          );
          break;

        case 'error':
          Alert.alert(
            '⚠️ Service Unavailable',
            result.message,
            [{ text: 'Try Again', onPress: () => setStep('email') }]
          );
          break;
      }
    } catch (error) {
      setIsVerifying(false);
      Alert.alert(
        'Error',
        'Something went wrong during verification. Please try again.',
        [{ text: 'Try Again', onPress: () => setStep('email') }]
      );
    }
  };

  const handleClose = () => {
    setStep('intro');
    setEmail('');
    setIsVerifying(false);
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.header}>
              <Ionicons name="briefcase" size={64} color="#4CAF50" />
              <Text style={styles.title}>Office Worker Discount</Text>
              <Text style={styles.subtitle}>Get 60% off premium features!</Text>
            </View>

            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.benefitText}>$4.99 → $1.99/month</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.benefitText}>$44.99 → $17.99/year</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.benefitText}>2 months free trial</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleStartVerification}
            >
              <Text style={styles.primaryButtonText}>Verify Work Email</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              We verify your employment status using your work email. No personal data is stored.
            </Text>
          </View>
        );

      case 'email':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.header}>
              <Ionicons name="mail" size={48} color="#2196F3" />
              <Text style={styles.title}>Enter Work Email</Text>
              <Text style={styles.subtitle}>
                Use your official company or business email address
              </Text>
            </View>

            <TextInput
              style={styles.emailInput}
              placeholder="john@company.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
            />

            <View style={styles.validationInfo}>
              <Text style={styles.infoText}>✓ Personal emails (Gmail, Yahoo) are not eligible</Text>
              <Text style={styles.infoText}>✓ Each email can only be used once</Text>
              <Text style={styles.infoText}>✓ Instant verification for most business domains</Text>
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, !email.trim() && styles.disabledButton]}
              onPress={handleEmailSubmit}
              disabled={!email.trim()}
            >
              <Text style={styles.primaryButtonText}>Verify Email</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setStep('intro')}
            >
              <Ionicons name="arrow-back" size={18} color="#666" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        );

      case 'verifying':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingTitle}>Verifying Email</Text>
              <Text style={styles.loadingSubtitle}>
                Checking {email} with our verification service...
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.overlay}>
        <TouchableOpacity 
          style={styles.overlayBackground} 
          activeOpacity={1}
          onPress={step !== 'verifying' ? handleClose : undefined}
        />
        <View style={styles.modal}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Office Worker Verification</Text>
            {step !== 'verifying' && (
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {renderStep()}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 400,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  closeButton: {
    padding: 4,
  },
  stepContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsContainer: {
    alignSelf: 'stretch',
    marginBottom: 30,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  benefitText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },
  emailInput: {
    width: '100%',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
  },
  validationInfo: {
    alignSelf: 'stretch',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginTop: 20,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default OfficeWorkerVerificationModal;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { AutoVerificationService } from '../services/autoVerificationService';

interface VerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onVerificationComplete?: (success: boolean) => void;
}

type VerificationStep = 'type' | 'work_arrangement' | 'details' | 'submitting' | 'success';
type UserType = 'office' | 'student';
type WorkArrangement = 'office' | 'hybrid' | 'remote';

export const VerificationModal: React.FC<VerificationModalProps> = ({
  visible,
  onClose,
  onVerificationComplete
}) => {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState<VerificationStep>('type');
  const [userType, setUserType] = useState<UserType>('office');
  const [workArrangement, setWorkArrangement] = useState<WorkArrangement>('office');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Work arrangement fields
  const [daysInOffice, setDaysInOffice] = useState(5);
  const [officeAddress, setOfficeAddress] = useState('');

  useEffect(() => {
    if (visible) {
      // Reset to initial state when modal opens
      setCurrentStep('type');
      setUserType('office');
      setWorkArrangement('office');
      setEmail('');
      setCompanyName('');
      setSchoolName('');
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleNext = () => {
    switch (currentStep) {
      case 'type':
        if (userType === 'office') {
          setCurrentStep('work_arrangement');
        } else {
          setCurrentStep('details');
        }
        break;
      case 'work_arrangement':
        if (workArrangement === 'remote') {
          Alert.alert(
            'Not Eligible',
            'This discount is specifically for office workers and students to help with commute and campus costs. Remote workers are not eligible for this promotion.',
            [
              { text: 'OK', onPress: onClose }
            ]
          );
        } else {
          setCurrentStep('details');
        }
        break;
      case 'details':
        handleSubmitVerification();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'work_arrangement':
        setCurrentStep('type');
        break;
      case 'details':
        if (userType === 'office') {
          setCurrentStep('work_arrangement');
        } else {
          setCurrentStep('type');
        }
        break;
    }
  };

  const handleSubmitVerification = async () => {
    setIsSubmitting(true);
    setCurrentStep('submitting');

    try {
      // Store verification request data
      const verificationData = {
        userType,
        workArrangement: userType === 'office' ? workArrangement : undefined,
        email,
        companyName: userType === 'office' ? companyName : undefined,
        schoolName: userType === 'student' ? schoolName : undefined,
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };

      await AsyncStorage.setItem('@flexbreak:verification_data', JSON.stringify(verificationData));
      await AsyncStorage.setItem('@flexbreak:verification_status', 'pending');
      await AsyncStorage.setItem('@flexbreak:user_type', userType);

      // Use automated verification service
      const verificationResult = await AutoVerificationService.verifyUser(verificationData);
      await AutoVerificationService.saveVerificationResult(
        email,
        verificationResult.approved,
        verificationResult.confidence
      );

      // Update UI based on result
      if (verificationResult.approved) {
        await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
      }

      setCurrentStep('success');
      onVerificationComplete?.(verificationResult.approved);
    } catch (error) {
      console.error('Verification submission error:', error);
      Alert.alert('Error', 'Failed to submit verification. Please try again.');
      setCurrentStep('details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const simulateVerification = async (data: any) => {
    // Simulate automatic verification for certain cases
    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        let autoApprove = false;
        let confidence = 0;

        // Auto-approve logic for educational domains
        if (data.userType === 'student' && data.email.includes('.edu')) {
          autoApprove = true;
          confidence = 95;
        }

        // Auto-approve logic for major corporate domains
        const majorCorpDomains = ['microsoft.com', 'google.com', 'apple.com', 'amazon.com'];
        const domain = data.email.split('@')[1]?.toLowerCase();
        if (data.userType === 'office' && domain && majorCorpDomains.includes(domain)) {
          autoApprove = true;
          confidence = 90;
        }

        if (autoApprove) {
          await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
          await AsyncStorage.setItem('@flexbreak:verification_confidence', confidence.toString());
        }

        resolve();
      }, 2000);
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              Are you an office worker or student?
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
              This helps us verify your eligibility for the 60% discount
            </Text>

            <TouchableOpacity
              style={[
                styles.optionCard,
                { borderColor: theme.border },
                userType === 'office' && { borderColor: theme.accent, backgroundColor: theme.accent + '10' }
              ]}
              onPress={() => setUserType('office')}
            >
              <Ionicons name="business" size={24} color={userType === 'office' ? theme.accent : theme.textSecondary} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>Office Worker</Text>
                <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                  Work at a company location or hybrid
                </Text>
              </View>
              {userType === 'office' && (
                <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                { borderColor: theme.border },
                userType === 'student' && { borderColor: theme.accent, backgroundColor: theme.accent + '10' }
              ]}
              onPress={() => setUserType('student')}
            >
              <Ionicons name="school" size={24} color={userType === 'student' ? theme.accent : theme.textSecondary} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>Student</Text>
                <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                  Currently enrolled in education
                </Text>
              </View>
              {userType === 'student' && (
                <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
              )}
            </TouchableOpacity>
          </View>
        );

      case 'work_arrangement':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              What's your work arrangement?
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
              This discount is for office/hybrid workers to help with commute costs
            </Text>

            {(['office', 'hybrid', 'remote'] as WorkArrangement[]).map((arrangement) => (
              <TouchableOpacity
                key={arrangement}
                style={[
                  styles.optionCard,
                  { borderColor: theme.border },
                  workArrangement === arrangement && { borderColor: theme.accent, backgroundColor: theme.accent + '10' }
                ]}
                onPress={() => setWorkArrangement(arrangement)}
              >
                <Ionicons 
                  name={arrangement === 'office' ? 'business' : arrangement === 'hybrid' ? 'shuffle' : 'home'} 
                  size={24} 
                  color={workArrangement === arrangement ? theme.accent : theme.textSecondary} 
                />
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>
                    {arrangement === 'office' ? 'Office-based' : arrangement === 'hybrid' ? 'Hybrid' : 'Remote'}
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                    {arrangement === 'office' 
                      ? 'Work primarily from office location'
                      : arrangement === 'hybrid' 
                      ? 'Split time between office and home'
                      : 'Work from home full-time'
                    }
                  </Text>
                </View>
                {workArrangement === arrangement && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'details':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              {userType === 'office' ? 'Company Details' : 'School Details'}
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
              We'll verify your {userType === 'office' ? 'employment' : 'enrollment'} status
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                {userType === 'office' ? 'Work Email' : 'School Email'}
              </Text>
              <TextInput
                style={[styles.textInput, { borderColor: theme.border, color: theme.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder={userType === 'office' ? 'your.name@company.com' : 'your.name@university.edu'}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                {userType === 'office' ? 'Company Name' : 'School Name'}
              </Text>
              <TextInput
                style={[styles.textInput, { borderColor: theme.border, color: theme.text }]}
                value={userType === 'office' ? companyName : schoolName}
                onChangeText={userType === 'office' ? setCompanyName : setSchoolName}
                placeholder={userType === 'office' ? 'Acme Corporation' : 'University of Example'}
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={[styles.infoBox, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '30' }]}>
              <Ionicons name="shield-checkmark" size={16} color={theme.accent} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                Your information is secure and only used for verification
              </Text>
            </View>
          </View>
        );

      case 'submitting':
        return (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Verifying your information...
            </Text>
            <Text style={[styles.loadingSubtext, { color: theme.textSecondary }]}>
              This usually takes a few seconds
            </Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.centerContent}>
            <Ionicons name="checkmark-circle" size={80} color={theme.accent} />
            <Text style={[styles.successTitle, { color: theme.text }]}>
              Verification Submitted!
            </Text>
            <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
              We'll review your information and notify you when your 60% discount is ready.
              This usually takes 1-2 hours.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'type':
        return true;
      case 'work_arrangement':
        return true;
      case 'details':
        return email.trim() && (userType === 'office' ? companyName.trim() : schoolName.trim());
      default:
        return false;
    }
  };

  const getButtonText = () => {
    switch (currentStep) {
      case 'success':
        return 'Done';
      case 'details':
        return 'Submit for Verification';
      default:
        return 'Continue';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.header, { color: theme.text }]}>
              Verification
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Progress indicator */}
          {currentStep !== 'submitting' && currentStep !== 'success' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: theme.accent,
                      width: `${(currentStep === 'type' ? 33 : currentStep === 'work_arrangement' ? 66 : 100)}%` 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                Step {currentStep === 'type' ? 1 : currentStep === 'work_arrangement' ? 2 : 3} of {userType === 'office' ? 3 : 2}
              </Text>
            </View>
          )}

          <ScrollView style={styles.content}>
            {renderStepContent()}
          </ScrollView>

          {currentStep !== 'submitting' && (
            <View style={styles.buttonContainer}>
              {(currentStep === 'work_arrangement' || (currentStep === 'details' && userType === 'office')) && (
                <TouchableOpacity
                  style={[styles.backButton, { borderColor: theme.border }]}
                  onPress={handleBack}
                >
                  <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>
                    Back
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  { backgroundColor: canProceed() ? theme.accent : theme.border },
                  !canProceed() && styles.disabledButton
                ]}
                onPress={currentStep === 'success' ? onClose : handleNext}
                disabled={!canProceed() || isSubmitting}
              >
                <Text style={[styles.nextButtonText, { color: '#fff' }]}>
                  {getButtonText()}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    borderRadius: 18,
    padding: 24,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
  },
  backButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default VerificationModal; 
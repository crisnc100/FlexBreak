/**
 * Super Simple Verification Modal
 * Demonstrates the recommended lenient approach
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmailVerificationService } from '../services/emailVerificationService';
import { PreGeneratedCodes } from '../services/preGeneratedCodes';

interface SuperSimpleVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onVerificationComplete: (approved: boolean) => void;
}

export const SuperSimpleVerificationModal: React.FC<SuperSimpleVerificationModalProps> = ({
  visible,
  onClose,
  onVerificationComplete
}) => {
  console.log('[SuperSimpleVerificationModal] Rendered with visible:', visible);
  const [step, setStep] = useState<'type' | 'email' | 'confirm' | 'email_verification' | 'manual_code'>('type');
  const [userType, setUserType] = useState<'student' | 'office' | null>(null);
  const [email, setEmail] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);

  const handleUserTypeSelect = (type: 'student' | 'office') => {
    setUserType(type);
    setStep('email');
  };

  const handleEmailSubmit = () => {
    if (!email.trim()) {
      Alert.alert('Please enter your email');
      return;
    }
    setStep('confirm');
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        setIsSubmitting(false);
        return;
      }

      // Check if email is already used by another verification
      const existingUsers = await AsyncStorage.getItem('@flexbreak:verified_emails');
      const usedEmails: string[] = existingUsers ? JSON.parse(existingUsers) : [];
      
      if (usedEmails.includes(email.toLowerCase())) {
        Alert.alert(
          '⚠️ Email Already Used',
          'This email has already been verified by another user. Each email can only be used once.\n\nIf this is your email and you\'re having issues, contact:\nflexbreakapp@gmail.com',
          [{ text: 'OK', onPress: () => setIsSubmitting(false) }]
        );
        return;
      }

      // SMART VERIFICATION LOGIC
      const restrictedDomains = ['gmail.com', 'yahoo.com', 'icloud.com', 'aol.com'];
      const businessPersonalDomains = ['outlook.com', 'hotmail.com']; // Outlook can be business
      const isRestrictedEmail = restrictedDomains.includes(domain);
      const isBusinessPersonal = businessPersonalDomains.includes(domain);
      
      // AUTO-APPROVE: Business/School domains
      const autoApprovePatterns = [
        /\.edu$/,           // Universities (.edu)
        /\.ac\./,           // Academic institutions (.ac.uk, etc.)
        /\.org$/,           // Organizations
        /university/i,      // University in domain
        /college/i,         // College in domain
        /school/i,          // School in domain
      ];
      
      const shouldAutoApprove = autoApprovePatterns.some(pattern => 
        pattern.test(domain)
      ) || (!isRestrictedEmail && !isBusinessPersonal && domain.length > 8); // Business domains are usually longer
      
      if (shouldAutoApprove) {
        // AUTO-APPROVE: Clear business/school email
        // Add email to used list
        usedEmails.push(email.toLowerCase());
        await AsyncStorage.setItem('@flexbreak:verified_emails', JSON.stringify(usedEmails));
        
        await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
        await AsyncStorage.setItem('@flexbreak:user_type', userType!);
        await AsyncStorage.setItem('@flexbreak:user_email', email);
        await AsyncStorage.setItem('@flexbreak:verification_method', 'auto_approved');
        
        const message = userType === 'student' 
          ? '🎓 Student verification successful! 60% discount activated.'
          : '💼 Office worker verification successful! 60% discount activated.';
        
        Alert.alert('✅ Verified!', message, [
          { text: 'Great!', onPress: () => {
            onVerificationComplete(true);
            onClose();
          }}
        ]);
        
      } else if (isBusinessPersonal) {
        // OUTLOOK/HOTMAIL: Auto-approve since these can be business emails
        usedEmails.push(email.toLowerCase());
        await AsyncStorage.setItem('@flexbreak:verified_emails', JSON.stringify(usedEmails));
        
        await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
        await AsyncStorage.setItem('@flexbreak:user_type', userType!);
        await AsyncStorage.setItem('@flexbreak:user_email', email);
        await AsyncStorage.setItem('@flexbreak:verification_method', 'outlook_approved');
        
        const message = userType === 'student' 
          ? '🎓 Student verification successful! 60% discount activated.'
          : '💼 Office worker verification successful! 60% discount activated.';
        
        Alert.alert('✅ Verified!', message, [
          { text: 'Great!', onPress: () => {
            onVerificationComplete(true);
            onClose();
          }}
        ]);
        
      } else if (isRestrictedEmail) {
        // PERSONAL EMAIL: Direct to manual verification (no email codes)
        Alert.alert(
          '📧 Manual Verification Required',
          `Personal email addresses (Gmail, Yahoo, etc.) require manual verification.\n\nTo get your discount:\n\n1. Email: flexbreakapp@gmail.com\n2. Include your ${userType === 'student' ? 'school details' : 'work details'}\n3. You'll receive a verification code within 24 hours`,
          [
            { text: 'Send Email', onPress: () => {
              // Generate email template
              const emailTemplate = EmailVerificationService.generateManualVerificationEmail(
                email,
                userType!
              );
              
              Alert.alert(
                '📧 Email Template',
                'Copy this template and send to flexbreakapp@gmail.com:\n\n' + emailTemplate.substring(0, 200) + '...\n\n[Full template shown in app]',
                [
                  { text: 'Got it', onPress: onClose }
                ]
              );
            }},
            { text: 'Cancel', onPress: onClose }
          ]
        );
        
      } else {
        // UNKNOWN DOMAIN: Manual verification required
        Alert.alert(
          '📧 Manual Verification Needed',
          `We couldn't automatically verify your email domain.\n\nFor quick approval, email:\nflexbreakapp@gmail.com\n\nInclude:\n• Your email: ${email}\n• User type: ${userType}\n• ${userType === 'student' ? 'School name' : 'Company name'}\n\nYou'll receive a verification code within 24 hours.`,
          [
            { text: 'Send Email', onPress: () => {
              // Generate structured email for better processing
              const emailTemplate = EmailVerificationService.generateManualVerificationEmail(
                email,
                userType!
              );
              
              Alert.alert(
                '📧 Email Template',
                'Copy this template and send to flexbreakapp@gmail.com:\n\n' + emailTemplate.substring(0, 200) + '...\n\n[Full template will be shown]',
                [
                  { text: 'Copy Template', onPress: onClose },
                  { text: 'Cancel', onPress: () => setIsSubmitting(false) }
                ]
              );
            }},
            { text: 'Cancel', onPress: onClose }
          ]
        );
      }
      
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

 

  const showTechnicalIssueHelp = () => {
    Alert.alert(
      '🔧 Need Help with Verification?',
      'We can manually verify you if:\n• Auto-verification isn\'t working\n• You\'re unsure about eligibility\n• You have non-standard email/work setup\n\n📧 Email: flexbreakapp@gmail.com\n\nInclude:\n✓ Your email address\n✓ Student or office worker?\n✓ School/company name\n\nWe\'ll verify you within 24 hours!',
      [
        { text: 'Contact Support', onPress: onClose },
        { text: 'Try Again', onPress: () => {} }
      ]
    );
  };

  const handleSendEmailCode = async () => {
    setIsSubmitting(true);
    try {
      const result = await EmailVerificationService.sendVerificationCode(email, userType!);
      
      if (result.success) {
        setEmailCodeSent(true);
        Alert.alert('📧 Code Sent!', result.message);
      } else {
        Alert.alert('Error', result.message);
        if (result.waitTime) {
          // User needs to wait before requesting another code
          setStep('email');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailCodeVerification = async () => {
    if (!emailVerificationCode.trim()) {
      Alert.alert('Missing Code', 'Please enter the 6-digit code from your email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await EmailVerificationService.verifyEmailCode(
        email,
        emailVerificationCode.trim()
      );

      if (result.success) {
        Alert.alert('✅ Email Verified!', result.message, [
          { text: 'Great!', onPress: () => {
            onVerificationComplete(true);
            onClose();
          }}
        ]);
      } else {
        Alert.alert('❌ Invalid Code', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualCodeSubmit = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Missing Code', 'Please enter your verification code from flexbreakapp@gmail.com.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await PreGeneratedCodes.redeemCode(
        manualCode.trim().toUpperCase(),
        email
      );

      if (result.success) {
        Alert.alert('✅ Verification Successful!', result.message, [
          { text: 'Great!', onPress: () => {
            onVerificationComplete(true);
            onClose();
          }}
        ]);
      } else {
        Alert.alert('❌ Invalid Code', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'type':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.header}>
              <Ionicons name="gift" size={48} color="#4CAF50" />
              <Text style={styles.title}>Get 60% Off Premium!</Text>
              <Text style={styles.subtitle}>Quick verification for students & office workers</Text>
            </View>

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => handleUserTypeSelect('student')}
            >
              <Ionicons name="school" size={24} color="#2196F3" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>I'm a Student</Text>
                <Text style={styles.optionDesc}>Currently enrolled in education</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => handleUserTypeSelect('office')}
            >
              <Ionicons name="business" size={24} color="#FF9500" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>I'm an Office Worker</Text>
                <Text style={styles.optionDesc}>Work in office or hybrid</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#666" />
            </TouchableOpacity>

        

            {/* Verification Code Option */}
            <View style={styles.divider}>
              <Text style={styles.dividerText}>or</Text>
            </View>

            <TouchableOpacity 
              style={[styles.optionButton, styles.codeButton]}
              onPress={() => setStep('manual_code')}
            >
              <Ionicons name="key" size={24} color="#007AFF" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>I have a verification code</Text>
                <Text style={styles.optionDesc}>From flexbreakapp@gmail.com</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#666" />
            </TouchableOpacity>
            
            {/* Back to Subscription Button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={onClose}
            >
              <Ionicons name="arrow-back" size={18} color="#666" />
              <Text style={styles.backButtonText}>Back to Subscription</Text>
            </TouchableOpacity>
          </View>
        );

      case 'email':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>
              {userType === 'student' ? '🎓 Student Email' : '💼 Work Email'}
            </Text>
            <Text style={styles.subtitle}>
              {userType === 'student' 
                ? 'Enter your school email address'
                : 'Enter your work email address'
              }
            </Text>

            <TextInput
              style={styles.emailInput}
              placeholder={userType === 'student' ? 'you@university.edu' : 'you@company.com'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity 
              style={[styles.continueButton, !email.trim() && styles.disabledButton]}
              onPress={handleEmailSubmit}
              disabled={!email.trim()}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setStep('type')}
            >
              <Ionicons name="arrow-back" size={18} color="#666" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        );

      case 'confirm':
        return (
          <View style={styles.stepContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.title}>Almost Done!</Text>
            <Text style={styles.subtitle}>
              Confirm you're eligible for the {userType} discount
            </Text>

            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                ✓ I am a {userType === 'student' ? 'current student' : 'office/hybrid worker'}
              </Text>
              <Text style={styles.confirmText}>
                ✓ I understand this discount is for {userType === 'student' ? 'students' : 'office workers'}
              </Text>
              <Text style={styles.confirmSubtext}>
                By continuing, you confirm your eligibility for this special pricing.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleFinalConfirm}
              disabled={isSubmitting}
            >
              <Text style={styles.confirmButtonText}>
                {isSubmitting ? 'Verifying...' : 'Activate 60% Discount'}
              </Text>
            </TouchableOpacity>

            {/* Help section */}
            <View style={styles.helpSection}>
              <Text style={styles.helpText}>Having trouble? Not sure if you qualify?</Text>
              <TouchableOpacity 
                style={styles.helpButton}
                onPress={showTechnicalIssueHelp}
              >
                <Text style={styles.helpButtonText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setStep('email')}
            >
              <Ionicons name="arrow-back" size={18} color="#666" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        );

      case 'email_verification':
        return (
          <View style={styles.stepContainer}>
            <Ionicons name="mail" size={48} color="#4CAF50" />
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to: {email}
            </Text>

            <TextInput
              style={styles.emailInput}
              placeholder="123456"
              value={emailVerificationCode}
              onChangeText={setEmailVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity 
              style={[styles.continueButton, !emailVerificationCode.trim() && styles.disabledButton]}
              onPress={handleEmailCodeVerification}
              disabled={!emailVerificationCode.trim() || isSubmitting}
            >
              <Text style={styles.continueButtonText}>
                {isSubmitting ? 'Verifying...' : 'Verify Email'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.helpButton}
              onPress={handleSendEmailCode}
              disabled={isSubmitting}
            >
              <Text style={styles.helpButtonText}>
                {isSubmitting ? 'Sending...' : 'Resend Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backToOptions}
              onPress={() => setStep('email')}
            >
              <Text style={styles.backToOptionsText}>← Back to email</Text>
            </TouchableOpacity>
          </View>
        );

      case 'manual_code':
        return (
          <View style={styles.stepContainer}>
            <Ionicons name="key" size={48} color="#007AFF" />
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              Enter the code you received from flexbreakapp@gmail.com
            </Text>

            <TextInput
              style={styles.emailInput}
              placeholder="STUDENT-A7B9K3 or OFFICE-M3N8T5"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity 
              style={[styles.continueButton, !manualCode.trim() && styles.disabledButton]}
              onPress={handleManualCodeSubmit}
              disabled={!manualCode.trim() || isSubmitting}
            >
              <Text style={styles.continueButtonText}>
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backToOptions}
              onPress={() => setStep('type')}
            >
              <Text style={styles.backToOptionsText}>← Back to options</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  // Add debug to check if modal is actually visible
  if (visible) {
    console.log('[SuperSimpleVerificationModal] Modal should be visible, current step:', step);
  }

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent
      onRequestClose={onClose}
      onShow={() => console.log('[SuperSimpleVerificationModal] Modal onShow called')}
    >
      <SafeAreaView style={styles.overlay}>
        <TouchableOpacity 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modal}>
          <View style={styles.headerRow}>
            <View style={styles.progress}>
              <View style={[styles.progressDot, (step === 'type') && styles.activeDot]} />
              <View style={[styles.progressDot, (step === 'email') && styles.activeDot]} />
              <View style={[styles.progressDot, (step === 'confirm') && styles.activeDot]} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    minHeight: 400,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  activeDot: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    padding: 4,
  },
  stepContainer: {
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
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  optionDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emailInput: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmBox: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  confirmText: {
    fontSize: 16,
    color: '#111',
    marginBottom: 8,
  },
  confirmSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  helpSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  helpButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
  },
  helpButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  notEligibleButton: {
    borderColor: '#FFE5E5',
    backgroundColor: '#FFF5F5',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerText: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  codeButton: {
    borderColor: '#E3F2FD',
    backgroundColor: '#F3F9FF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  backToOptions: {
    marginTop: 16,
    padding: 12,
  },
  backToOptionsText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
});

export default SuperSimpleVerificationModal;
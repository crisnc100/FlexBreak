import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestingAccessFormProps {
  onAccessGranted: () => void;
}

const TESTER_ACCESS_CODE = 'FlexTest2025!';
const HELP_EMAIL = 'cortegafit@gmail.com';

const TestingAccessForm: React.FC<TestingAccessFormProps> = ({ onAccessGranted }) => {
  const { theme, isDark } = useTheme();
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = () => {
    setIsLoading(true);
    
    // Simulate loading for a more realistic experience
    setTimeout(() => {
      if (accessCode === TESTER_ACCESS_CODE) {
        setIsLoading(false);
        
        // Set the testing premium flag to unlock premium features for testers
        AsyncStorage.setItem('@flexbreak:testing_premium_access', 'true')
          .then(() => {
            console.log('[Testing Mode] Premium access enabled for tester');
            
            // Show restart notification
            Alert.alert(
              'Premium Access Enabled',
              'Premium features have been unlocked for testing. For the best experience, please restart the app after completing the intro slides.',
              [{ text: 'Continue', onPress: onAccessGranted }]
            );
          })
          .catch(err => {
            console.error('Error setting testing premium access:', err);
            onAccessGranted();
          });
      } else {
        setIsLoading(false);
        Alert.alert(
          'Access Code Not Recognized', 
          'The code you entered doesn\'t match our records. Please check your testing invitation email for the correct code. It should be in the format "FlexTest####!".',
          [
            { text: 'Try Again', style: 'cancel' },
            { 
              text: 'Need Help?', 
              onPress: handleHelpRequest 
            }
          ]
        );
      }
    }, 800);
  };

  const handleHelpRequest = () => {
    const subject = encodeURIComponent('Testing Access Code Help Request');
    const body = encodeURIComponent('Hello,\n\nI need help accessing the FlexBreak testing mode. Please assist with my access code.\n\nNote: If you wish to remain anonymous, you may want to edit the "From" field or remove your personal information before sending.\n\nThank you!');
    
    Linking.openURL(`mailto:${HELP_EMAIL}?subject=${subject}&body=${body}`)
      .catch(err => {
        console.error('Error opening email client:', err);
        Alert.alert('Email Error', 'Could not open email client. Please contact support at cortegafit@gmail.com.');
      });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formContainer, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]}>
            <Ionicons name="flask-outline" size={56} color={theme.accent} />
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>
            Welcome, Tester!
          </Text>
          
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            You're about to help improve FlexBreak
          </Text>
          
          <View style={styles.stepsContainer}>
            <View style={[styles.stepRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.text }]}>
                Enter the access code from your invitation email
              </Text>
            </View>
            
            <View style={[styles.stepRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.text }]}>
                Complete testing steps at your own pace
              </Text>
            </View>
            
            <View style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.text }]}>
                Provide feedback to help us improve
              </Text>
            </View>
          </View>
          
          <View style={[styles.inputSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Your Testing Access Code:
            </Text>
            
            <View style={[
              styles.inputContainer, 
              { 
                backgroundColor: theme.backgroundLight, 
                borderColor: accessCode.length > 0 ? theme.accent : theme.border 
              }
            ]}>
              <Ionicons name="key-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: isError ? theme.error : theme.border }]}
                placeholder="Enter tester access code"
                placeholderTextColor={theme.textSecondary}
                value={accessCode}
                onChangeText={(text) => {
                  setAccessCode(text);
                  setIsError(false);
                }}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={handleSubmit}
              />
              {accessCode.length > 0 && (
                <TouchableOpacity onPress={() => setAccessCode('')}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.accent },
                (!accessCode.trim() || isLoading) && { opacity: 0.6 }
              ]}
              onPress={handleSubmit}
              disabled={isLoading || !accessCode.trim()}
            >
              {isLoading ? (
                <View style={styles.loadingButton}>
                  <Ionicons name="ellipsis-horizontal" size={24} color="white" />
                  <Text style={styles.buttonText}>Verifying...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="white" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Start Testing</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  formContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
  },
  inputSection: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  hintRow: {
    width: '100%',
    marginBottom: 8,
    alignItems: 'center',
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  hintIcon: {
    marginRight: 5,
  },
  hintToggle: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  helpLink: {
    marginTop: 12,
    padding: 8,
  },
  helpLinkText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default TestingAccessForm; 
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface TestingAccessFormProps {
  onAccessGranted: () => void;
}

const TESTER_ACCESS_CODE = 'FlexTest2025!';

const TestingAccessForm: React.FC<TestingAccessFormProps> = ({ onAccessGranted }) => {
  const { theme } = useTheme();
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    setIsLoading(true);
    
    // Simulate loading for a more realistic experience
    setTimeout(() => {
      if (accessCode === TESTER_ACCESS_CODE) {
        setIsLoading(false);
        onAccessGranted();
      } else {
        setIsLoading(false);
        Alert.alert('Invalid Code', 'Please enter a valid tester access code.');
      }
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={[styles.formContainer, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={40} color={theme.accent} />
        </View>
        
        <Text style={[styles.title, { color: theme.text }]}>
          Tester Access
        </Text>
        
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Please enter the tester access code provided to you to unlock the testing features.
        </Text>
        
        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundLight, borderColor: theme.border }]}>
          <Ionicons name="key-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Enter access code"
            placeholderTextColor={theme.textSecondary}
            value={accessCode}
            onChangeText={setAccessCode}
            autoCapitalize="none"
            secureTextEntry={false}
          />
        </View>
        
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.accent },
            isLoading && { opacity: 0.7 }
          ]}
          onPress={handleSubmit}
          disabled={isLoading || !accessCode.trim()}
        >
          {isLoading ? (
            <Text style={styles.buttonText}>Verifying...</Text>
          ) : (
            <Text style={styles.buttonText}>Access Testing Mode</Text>
          )}
        </TouchableOpacity>
        
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          The access code was provided in your testing invitation email.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  formContainer: {
    width: '100%',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default TestingAccessForm; 
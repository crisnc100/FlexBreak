import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The access code required to unlock the simulator
const ACCESS_CODE = 'FlexTest2025!';

interface BobSimulatorAccessModalProps {
  visible: boolean;
  onClose: () => void;
}

const BobSimulatorAccessModal = ({ visible, onClose }: BobSimulatorAccessModalProps) => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleVerify = () => {
    setIsValidating(true);
    setError('');
    
    // Simulate network delay for UX
    setTimeout(() => {
      if (code === ACCESS_CODE) {
        setIsValidating(false);
        
        // Grant access to the simulator
        AsyncStorage.setItem('@flexbreak:bob_simulator_access', 'true')
          .then(() => {
            // First close the modal
            onClose();
            
            // Use a small delay to ensure the modal is closed before navigation
            setTimeout(() => {
              try {
                // Reset navigation stack and navigate directly to BobSimulator
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [
                      { name: 'BobSimulator', params: { fromSettings: true } }
                    ],
                  })
                );
              } catch (navError) {
                console.error('Navigation error:', navError);
                Alert.alert(
                  'Navigation Error',
                  'Could not open the simulator. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            }, 300);
          })
          .catch(err => {
            console.error('Error setting simulator access:', err);
            setError('An error occurred. Please try again.');
          });
      } else {
        setIsValidating(false);
        setError('Invalid access code. Please try again.');
      }
    }, 500);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Bob Simulator Access
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Ionicons name="flask-outline" size={48} color={theme.accent} style={styles.icon} />
            
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Enter the simulator access code to continue. This feature is for testing and development only.
            </Text>
            
            <TextInput
              style={[
                styles.codeInput,
                { 
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: error ? '#ff6b6b' : theme.border
                }
              ]}
              placeholder="Enter access code"
              placeholderTextColor={theme.textSecondary}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={true}
            />
            
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
            
            <TouchableOpacity
              style={[
                styles.verifyButton,
                { backgroundColor: theme.accent },
                (!code || isValidating) && styles.disabledButton
              ]}
              onPress={handleVerify}
              disabled={!code || isValidating}
            >
              {isValidating ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.verifyButtonText}>Access Simulator</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  codeInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  verifyButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default BobSimulatorAccessModal; 
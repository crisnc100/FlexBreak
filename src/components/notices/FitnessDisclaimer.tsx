import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as storageService from '../../services/storageService';
import { useTheme } from '../../context/ThemeContext';

// Key for storing disclaimer acceptance in storageService
const DISCLAIMER_ACCEPTED_KEY = storageService.KEYS.USER_AGREEMENTS.FITNESS_DISCLAIMER_ACCEPTED;

// Function to check if disclaimer has been accepted
export const checkDisclaimerAccepted = async (): Promise<boolean> => {
  try {
    return await storageService.getData(DISCLAIMER_ACCEPTED_KEY, false);
  } catch (error) {
    console.error('Error checking disclaimer acceptance:', error);
    return false;
  }
};

// Function to save disclaimer acceptance
export const saveDisclaimerAcceptance = async () => {
  try {
    await storageService.setData(DISCLAIMER_ACCEPTED_KEY, true);
  } catch (error) {
    console.error('Error saving disclaimer acceptance:', error);
  }
};

interface FitnessDisclaimerProps {
  visible: boolean;
  onAccept: () => void;
  viewOnly?: boolean;
}

const FitnessDisclaimer: React.FC<FitnessDisclaimerProps> = ({ visible, onAccept, viewOnly = false }) => {
  const { isDark, theme } = useTheme();
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleAccept = async () => {
    if (viewOnly) {
      // Just close the modal in view-only mode
      onAccept();
    } else if (acceptedTerms) {
      // Save acceptance and close in normal mode
      await saveDisclaimerAcceptance();
      onAccept();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContainer,
          { backgroundColor: isDark ? theme.cardBackground : theme.background }
        ]}>
          <View style={styles.headerContainer}>
            <Ionicons 
              name="fitness" 
              size={24} 
              color={isDark ? theme.accent : theme.accent}
              style={styles.icon}
            />
            <Text style={[styles.headerText, { color: theme.text }]}>
              Fitness Disclaimer
            </Text>
          </View>
          
          <ScrollView style={styles.contentScrollView}>
            <View style={styles.contentContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Before You Begin
              </Text>
              
              <Text style={[styles.paragraph, { color: theme.text }]}>
                FlexBreak provides general stretching and movement exercises intended for wellness purposes only. By using this app, you acknowledge:
              </Text>
              
              <View style={styles.bulletPointContainer}>
                <Text style={[styles.bulletPoint, { color: theme.text }]}>• Physical activity carries inherent risks</Text>
                <Text style={[styles.bulletPoint, { color: theme.text }]}>• You should consult a healthcare provider before starting any exercise program</Text>
                <Text style={[styles.bulletPoint, { color: theme.text }]}>• Stop any exercise that causes pain or discomfort</Text>
                <Text style={[styles.bulletPoint, { color: theme.text }]}>• Modify exercises as needed for your fitness level</Text>
                <Text style={[styles.bulletPoint, { color: theme.text }]}>• This app is not a replacement for professional medical advice</Text>
              </View>
              
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>
                Your Responsibility
              </Text>
              
              <Text style={[styles.paragraph, { color: theme.text }]}>
                You are responsible for exercising within your limits and for any injuries that may occur while using this app. We recommend starting slowly and gradually increasing intensity.
              </Text>
              
              {!viewOnly && (
                <View style={styles.acceptanceContainer}>
                  <Switch
                    value={acceptedTerms}
                    onValueChange={setAcceptedTerms}
                    trackColor={{ false: '#767577', true: isDark ? '#4B7BEC' : '#3867D6' }}
                    thumbColor={Platform.OS === 'ios' ? undefined : acceptedTerms ? theme.accent : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    style={styles.switch}
                  />
                  <Text style={[styles.acceptanceText, { color: theme.text }]}>
                    I understand and accept these terms
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.acceptButton,
                { 
                  backgroundColor: viewOnly || acceptedTerms ? theme.accent : theme.border,
                  opacity: viewOnly || acceptedTerms ? 1 : 0.5
                }
              ]}
              onPress={handleAccept}
              disabled={!viewOnly && !acceptedTerms}
            >
              <Text style={styles.acceptButtonText}>
                {viewOnly ? "Close" : "Accept & Continue"}
              </Text>
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
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  icon: {
    marginRight: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  contentScrollView: {
    maxHeight: 400,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPointContainer: {
    marginLeft: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
  acceptanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  switch: {
    marginRight: 10,
  },
  acceptanceText: {
    fontSize: 16,
    flex: 1,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
  },
  acceptButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FitnessDisclaimer; 
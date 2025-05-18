import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import * as storageService from '../../services/storageService';

// Key for storing non-medical notice acknowledgment
const NON_MEDICAL_NOTICE_KEY = storageService.KEYS.USER_AGREEMENTS.NON_MEDICAL_NOTICE_SHOWN;

// Function to check if notice has been shown and acknowledged
export const checkNonMedicalNoticeShown = async (): Promise<boolean> => {
  try {
    return await storageService.getData(NON_MEDICAL_NOTICE_KEY, false);
  } catch (error) {
    console.error('Error checking non-medical notice acknowledgment:', error);
    return false;
  }
};

// Function to save notice acknowledgment
export const saveNonMedicalNoticeShown = async () => {
  try {
    await storageService.setData(NON_MEDICAL_NOTICE_KEY, true);
  } catch (error) {
    console.error('Error saving non-medical notice acknowledgment:', error);
  }
};

interface NonMedicalNoticeProps {
  expanded?: boolean;
  onToggle?: () => void;
  visible?: boolean;
  onAcknowledge?: () => void;
  isModal?: boolean;
}

const NonMedicalNotice: React.FC<NonMedicalNoticeProps> = ({ 
  expanded = false,
  onToggle,
  visible = false,
  onAcknowledge,
  isModal = false
}) => {
  const { theme, isDark, isSunset } = useTheme();
  
  const handleAcknowledge = async () => {
    if (onAcknowledge) {
      await saveNonMedicalNoticeShown();
      onAcknowledge();
    }
  };
  
  const NoticeContent = () => (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark || isSunset 
          ? 'rgba(255, 255, 255, 0.05)' 
          : 'rgba(66, 135, 245, 0.05)',
        borderColor: theme.border
      }
    ]}>
      <View style={styles.header}>
        <Ionicons 
          name="information-circle-outline" 
          size={22} 
          color={isDark || isSunset ? '#A0D0FF' : '#4287F5'} 
        />
        <Text style={[
          styles.title, 
          { color: isDark || isSunset ? '#A0D0FF' : '#4287F5' }
        ]}>
          Non-Medical Wellness Content
        </Text>
        
        {onToggle && !isModal && (
          <TouchableOpacity
            onPress={onToggle}
            style={styles.expandButton}
          >
            <Ionicons 
              name={expanded ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={isDark || isSunset ? theme.textSecondary : '#6F6F6F'} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {(expanded || !onToggle || isModal) && (
        <View>
          <Text style={[
            styles.content, 
            { color: isDark || isSunset ? theme.textSecondary : '#505050' }
          ]}>
            FlexBreak provides general wellness stretching routines to support your physical wellbeing.
            This content is not medical advice and isn't intended to diagnose, treat, or cure any condition.
            Results may vary, and you should consult with a healthcare professional for medical concerns.
          </Text>
          
          {isModal && (
            <TouchableOpacity
              style={[
                styles.acknowledgeButton,
                {backgroundColor: theme.accent}
              ]}
              onPress={handleAcknowledge}
            >
              <Text style={styles.acknowledgeButtonText}>I Understand</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
  
  if (isModal) {
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
            { backgroundColor: isDark || isSunset ? theme.cardBackground : theme.background }
          ]}>
            <NoticeContent />
          </View>
        </View>
      </Modal>
    );
  }
  
  return <NoticeContent />;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    margin: 12,
    marginTop: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  expandButton: {
    padding: 4,
  },
  content: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
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
  acknowledgeButton: {
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acknowledgeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default NonMedicalNotice; 
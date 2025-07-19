import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import * as storageService from '../../../services/storageService';

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
  
  const ModalNoticeContent = () => (
    <View style={styles.modalContent}>
      {/* Icon Container */}
      <View style={[styles.modalIconContainer, { backgroundColor: theme.accent + '20' }]}>
        <Ionicons 
          name="information-circle" 
          size={40} 
          color={theme.accent} 
        />
      </View>
      
      {/* Title */}
      <Text style={[styles.modalTitle, { color: theme.text }]}>
        Non-Medical Notice
      </Text>
      
      {/* Subtitle */}
      <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
        Important information about our wellness content
      </Text>
      
      {/* Content Card */}
      <View style={[styles.modalContentCard, { 
        backgroundColor: isDark || isSunset ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        borderColor: theme.border
      }]}>
        <View style={styles.modalBulletItem}>
          <View style={[styles.modalBullet, { backgroundColor: theme.accent }]} />
          <Text style={[styles.modalBulletText, { color: theme.text }]}>
            General wellness stretching routines only
          </Text>
        </View>
        
        <View style={styles.modalBulletItem}>
          <View style={[styles.modalBullet, { backgroundColor: theme.accent }]} />
          <Text style={[styles.modalBulletText, { color: theme.text }]}>
            Not medical advice or treatment
          </Text>
        </View>
        
        <View style={styles.modalBulletItem}>
          <View style={[styles.modalBullet, { backgroundColor: theme.accent }]} />
          <Text style={[styles.modalBulletText, { color: theme.text }]}>
            Results may vary by individual
          </Text>
        </View>
        
        <View style={styles.modalBulletItem}>
          <View style={[styles.modalBullet, { backgroundColor: theme.accent }]} />
          <Text style={[styles.modalBulletText, { color: theme.text }]}>
            Consult healthcare professionals for medical concerns
          </Text>
        </View>
      </View>
      
      {/* Buttons */}
      <TouchableOpacity
        style={[styles.modalPrimaryButton, { backgroundColor: theme.accent }]}
        onPress={handleAcknowledge}
      >
        <Text style={styles.modalPrimaryButtonText}>I Understand</Text>
      </TouchableOpacity>
      
      {onAcknowledge && (
        <TouchableOpacity
          style={styles.modalSecondaryButton}
          onPress={() => onAcknowledge()}
        >
          <Text style={[styles.modalSecondaryButtonText, { color: theme.textSecondary }]}>
            Close
          </Text>
        </TouchableOpacity>
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
            <ModalNoticeContent />
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
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalContentCard: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  modalBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 12,
  },
  modalBulletText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  modalPrimaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSecondaryButton: {
    paddingVertical: 8,
  },
  modalSecondaryButtonText: {
    fontSize: 15,
  }
});

export default NonMedicalNotice; 
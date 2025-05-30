import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import updateService, { UpdateInfo } from '../services/updateService';
import { useTheme } from '../context/ThemeContext';

interface UpdateNotificationModalProps {
  visible: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  visible,
  onClose,
  updateInfo,
}) => {
  const { colors } = useTheme();
  const [isUpdating, setIsUpdating] = useState(false);
  const [canDismiss, setCanDismiss] = useState(true);

  useEffect(() => {
    // Don't allow dismissing mandatory updates
    setCanDismiss(!updateInfo.isMandatory);
  }, [updateInfo.isMandatory]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      // Check if URL is provided (iOS has URL, Android doesn't yet)
      if (!updateInfo.updateUrl) {
        Alert.alert(
          'Not Available',
          'Android version is coming soon! Please check back later.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Open app store
      const supported = await Linking.canOpenURL(updateInfo.updateUrl);
      if (supported) {
        await Linking.openURL(updateInfo.updateUrl);
      } else {
        console.error('Cannot open URL:', updateInfo.updateUrl);
      }
    } catch (error) {
      console.error('Error opening update URL:', error);
    } finally {
      setIsUpdating(false);
      if (!updateInfo.isMandatory) {
        onClose();
      }
    }
  };

  const handleDismiss = async () => {
    if (canDismiss) {
      // Save that user dismissed this version
      await updateService.dismissVersion(updateInfo.latestVersion);
      onClose();
    }
  };

  const formatReleaseNotes = (notes?: string) => {
    if (!notes) return 'Bug fixes and performance improvements';
    
    // Clean up markdown formatting for display
    return notes
      .replace(/## /g, '\n')
      .replace(/### /g, '\n')
      .replace(/- /g, '• ')
      .trim();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canDismiss ? handleDismiss : undefined}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name="cloud-download" 
                size={48} 
                color={colors.primary} 
              />
              {updateInfo.isMandatory && (
                <View style={styles.mandatoryBadge}>
                  <Ionicons name="alert-circle" size={20} color="#fff" />
                </View>
              )}
            </View>
            
            <Text style={[styles.title, { color: colors.text }]}>
              {updateInfo.isMandatory ? 'Required Update' : 'Update Available'}
            </Text>
            
            <Text style={[styles.versionText, { color: colors.text }]}>
              Version {updateInfo.latestVersion} is now available
            </Text>
            <Text style={[styles.currentVersion, { color: colors.textSecondary }]}>
              You're on version {updateInfo.currentVersion}
            </Text>
          </View>

          {/* Release Notes */}
          <ScrollView style={styles.releaseNotesContainer} showsVerticalScrollIndicator={false}>
            <Text style={[styles.releaseNotesTitle, { color: colors.text }]}>
              What's New:
            </Text>
            <Text style={[styles.releaseNotes, { color: colors.textSecondary }]}>
              {formatReleaseNotes(updateInfo.releaseNotes)}
            </Text>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={styles.updateButtonText}>
                    Update Now
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {canDismiss && (
              <TouchableOpacity
                style={[styles.dismissButton, { borderColor: colors.border }]}
                onPress={handleDismiss}
              >
                <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Mandatory Update Notice */}
          {updateInfo.isMandatory && (
            <View style={[styles.mandatoryNotice, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="information-circle" size={16} color={colors.error} />
              <Text style={[styles.mandatoryText, { color: colors.error }]}>
                This update is required to continue using FlexBreak
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  mandatoryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  currentVersion: {
    fontSize: 14,
  },
  releaseNotesContainer: {
    maxHeight: 200,
    marginBottom: 24,
  },
  releaseNotesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  releaseNotes: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dismissButtonText: {
    fontSize: 16,
  },
  mandatoryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  mandatoryText: {
    flex: 1,
    fontSize: 12,
  },
});

// Hook to manage update notifications
export const useUpdateNotification = () => {
  const [showModal, setShowModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const checkForUpdates = async (forceCheck = false) => {
    try {
      const info = await updateService.checkForUpdate(forceCheck);
      
      if (info.isUpdateAvailable) {
        // Check if user has already dismissed this version
        const isDismissed = await updateService.hasUserDismissedVersion(info.latestVersion);
        
        if (!isDismissed || info.isMandatory) {
          setUpdateInfo(info);
          setShowModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const hideModal = () => {
    setShowModal(false);
  };

  return {
    showModal,
    updateInfo,
    checkForUpdates,
    hideModal,
  };
};
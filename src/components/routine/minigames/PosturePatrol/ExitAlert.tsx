import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface ExitAlertProps {
  theme: any;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExitAlert: React.FC<ExitAlertProps> = ({
  theme,
  onConfirm,
  onCancel
}) => {
  return (
    <View style={styles.alertOverlay}>
      <View style={[styles.alertContainer, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.alertTitle, { color: theme.text }]}>
          Exit Game?
        </Text>
        <Text style={[styles.alertMessage, { color: theme.textSecondary }]}>
          You'll lose your current progress and miss out on bonus XP.
        </Text>
        <View style={styles.alertButtons}>
          <TouchableOpacity 
            style={[styles.alertButton, styles.cancelButton]} 
            onPress={onCancel}
          >
            <Text style={[styles.alertButtonText, { color: theme.text }]}>
              Continue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.alertButton, styles.confirmButton, { backgroundColor: theme.accent }]} 
            onPress={onConfirm}
          >
            <Text style={[styles.alertButtonText, { color: '#FFFFFF' }]}>
              Exit Game
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  alertContainer: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  confirmButton: {
    // backgroundColor set inline
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
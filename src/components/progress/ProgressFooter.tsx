import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface ProgressFooterProps {
  progressSystemData: any;
  isDark: boolean;
  onResetProgress?: () => void;
}

/**
 * Footer component for the Progress Screen
 */
export const ProgressFooter: React.FC<ProgressFooterProps> = ({ 
  progressSystemData, 
  isDark,
  onResetProgress
}) => {
  return (
    <View style={styles.footer}>
      <Text style={[styles.footerText, { color: isDark ? '#FFFFFF' : '#666' }]}>
        FlexBreak Premium • Level {progressSystemData?.level || 1} • {progressSystemData?.totalXP || 0} XP
      </Text>
      
      {/* Add testing buttons in development mode */}
      {__DEV__ && onResetProgress && (
        <View style={styles.devTools}>
          <TouchableOpacity
            style={styles.testingButton}
            onPress={() => Alert.alert('Progress Testing', 'Select the Testing tab to access the testing tools.')}
          >
            <Text style={styles.testingButtonText}>
              Progress Testing Available
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testingButton, { backgroundColor: '#F44336', marginTop: 8 }]}
            onPress={onResetProgress}
          >
            <Text style={styles.testingButtonText}>
              Reset Progress Data
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  devTools: {
    marginTop: 12,
    alignItems: 'center',
  },
  testingButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  testingButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default ProgressFooter; 
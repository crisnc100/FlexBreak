import React, { useState } from 'react';
import { TouchableOpacity, Text, Modal, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { AIWellnessWidgetPreview } from '../../ai/AIWellnessWidgetPreview';

interface AIWidgetPreviewSectionProps {
  visible: boolean;
}

export const AIWidgetPreviewSection: React.FC<AIWidgetPreviewSectionProps> = ({ visible }) => {
  const { theme } = useTheme();
  const [showPreview, setShowPreview] = useState(false);

  if (!visible) return null;

  return (
    <>
      <TouchableOpacity
        style={[styles.previewButton, { backgroundColor: theme.surface }]}
        onPress={() => setShowPreview(true)}
        activeOpacity={0.7}
      >
        <View style={styles.previewContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
            <Ionicons name="phone-portrait-outline" size={20} color={theme.accent} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.previewTitle, { color: theme.text }]}>
              Widget & Voice Preview
            </Text>
            <Text style={[styles.previewSubtitle, { color: theme.textSecondary }]}>
              See future home screen widgets
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.surface }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPreview(false)}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Future Features
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <AIWellnessWidgetPreview />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  previewButton: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewSubtitle: {
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
});
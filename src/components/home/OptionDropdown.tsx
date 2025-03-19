import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const { height } = Dimensions.get('window');

interface Option {
  label: string;
  value: string;
  description?: string;
}

interface OptionDropdownProps {
  visible: boolean;
  title: string;
  options: Option[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  slideAnim: Animated.Value;
  backdropOpacity: Animated.Value;
}

/**
 * Dropdown component for selecting options with animations
 */
const OptionDropdown: React.FC<OptionDropdownProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  slideAnim,
  backdropOpacity
}) => {
  const { theme, isDark } = useTheme();
  
  if (!visible) return null;
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: backdropOpacity,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.dropdownContainer,
          {
            transform: [{ translateY: slideAnim }],
            backgroundColor: theme.cardBackground,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            shadowColor: theme.text
          }
        ]}
      >
        <View style={[
          styles.dropdownHeader, 
          { borderBottomColor: theme.border }
        ]}>
          <Text style={[
            styles.dropdownTitle,
            { color: theme.text }
          ]}>
            {title}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.optionsContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.optionsContent}
        >
          {options.map((item) => (
            <Pressable
              key={item.value}
              style={({ pressed }) => [
                styles.optionItem,
                { 
                  borderBottomColor: theme.border,
                  backgroundColor: selectedValue === item.value 
                    ? `${theme.accent}15` 
                    : pressed 
                      ? `${theme.backgroundLight}` 
                      : 'transparent'
                }
              ]}
              onPress={() => onSelect(item.value)}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            >
              <View>
                <Text style={[
                  styles.optionText,
                  { 
                    color: selectedValue === item.value 
                      ? theme.accent 
                      : theme.text 
                  },
                  selectedValue === item.value && styles.selectedOptionText
                ]}>
                  {item.label}
                </Text>
                {item.description && (
                  <Text style={[
                    styles.optionDescription,
                    { color: theme.textSecondary }
                  ]}>
                    {item.description}
                  </Text>
                )}
              </View>
              {selectedValue === item.value && (
                <Ionicons name="checkmark" size={22} color={theme.accent} style={styles.checkIcon} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    maxHeight: height * 0.7,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    maxHeight: height * 0.6,
  },
  optionsContent: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
  selectedOptionText: {
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  checkIcon: {
    marginLeft: 8,
  },
});

export default OptionDropdown; 
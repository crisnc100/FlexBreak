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
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

// Type for Ionicons names
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Option {
  label: string;
  value: string;
  description?: string;
  icon?: IoniconsName;
}

interface OptionDropdownProps {
  visible: boolean;
  title: string;
  options: Option[];
  selectedValue: string | string[];
  onSelect: (value: string | string[]) => void;
  onClose: () => void;
  slideAnim: Animated.Value;
  backdropOpacity: Animated.Value;
  multiSelect?: boolean;
}

/**
 * Enhanced dropdown component for selecting options with animations
 */
const OptionDropdown: React.FC<OptionDropdownProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  slideAnim,
  backdropOpacity,
  multiSelect = false
}) => {
  const { theme, isDark } = useTheme();
  
  // Generate icon for each option based on its value
  const getIconForOption = (option: Option): IoniconsName => {
    // If option has an explicit icon, use it
    if (option.icon) return option.icon;
    
    // Default icons based on common option values
    if (option.value === 'All' || option.value.includes('All')) return 'apps-outline';
    if (option.value === 'Desk') return 'desktop-outline';
    if (option.value === 'DeskStand') return 'body-outline';
    
    // Duration-related icons
    if (option.value === '5') return 'timer-outline';
    if (option.value === '10') return 'time-outline';
    if (option.value === '15') return 'hourglass-outline';
    
    // Body area icons
    if (option.value === 'Hips & Legs') return 'body-outline';
    if (option.value === 'Lower Back') return 'fitness-outline';
    if (option.value === 'Upper Back & Chest') return 'body-outline';
    if (option.value === 'Shoulders & Arms') return 'barbell-outline';
    if (option.value === 'Neck') return 'body-outline';
    if (option.value === 'Full Body') return 'body-outline';
    if (option.value === 'Dynamic Flow') return 'flame-outline';
    
    // Default fallback icon
    return 'options-outline';
  };
  
  if (!visible) return null;

  const isSelected = (value: string) => {
    if (multiSelect && Array.isArray(selectedValue)) {
      return selectedValue.includes(value);
    }
    return selectedValue === value;
  };

  const handleSelect = (value: string) => {
    if (multiSelect) {
      if (Array.isArray(selectedValue)) {
        if (value === 'All') {
          onSelect(['All']);
        } else {
          const currentSelections = selectedValue.filter(v => v !== 'All');
          if (currentSelections.includes(value)) {
            const newSelections = currentSelections.filter(v => v !== value);
            onSelect(newSelections.length ? newSelections : ['All']);
          } else {
            const newSelections = [...currentSelections, value].slice(-2);
            onSelect(newSelections);
          }
        }
      } else {
        onSelect([value]);
      }
    } else {
      onSelect(value);
    }
  };
  
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
            shadowColor: theme.text
          }
        ]}
      >
        {/* Dropdown Header with Gradient Background */}
        <LinearGradient
          colors={isDark ? 
            ['rgba(66, 153, 225, 0.5)', 'rgba(99, 102, 241, 0.5)'] : 
            ['rgba(66, 153, 225, 0.2)', 'rgba(99, 102, 241, 0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dropdownHeader}
        >
          <View style={styles.headerContent}>
            <Text style={[
              styles.dropdownTitle,
              { color: theme.text }
            ]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <View style={[styles.closeButtonCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.optionsContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.optionsContent}
        >
          {options.map((item) => {
            const isItemSelected = isSelected(item.value);
            
            return (
              <Pressable
                key={item.value}
                style={({ pressed }) => [
                  styles.optionItem,
                  { 
                    borderBottomColor: theme.border,
                    backgroundColor: isItemSelected
                      ? `${theme.accent}15` 
                      : pressed 
                        ? `${theme.backgroundLight}` 
                        : 'transparent'
                  }
                ]}
                onPress={() => handleSelect(item.value)}
                android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionMainContent}>
                    <View style={[
                      styles.optionIconContainer, 
                      { 
                        backgroundColor: isItemSelected 
                          ? `${theme.accent}20`
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                      }
                    ]}>
                      <Ionicons 
                        name={getIconForOption(item)} 
                        size={20} 
                        color={isItemSelected ? theme.accent : theme.textSecondary} 
                      />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={[
                        styles.optionText,
                        { 
                          color: isItemSelected
                            ? theme.accent 
                            : theme.text 
                        },
                        isItemSelected && styles.selectedOptionText
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
                  </View>
                  {isItemSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: `${theme.accent}20` }]}>
                      <Ionicons name="checkmark" size={18} color={theme.accent} />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        
        {/* Bottom action area */}
        <View style={[styles.bottomActions, { borderTopColor: theme.border }]}>
          <TouchableOpacity 
            style={[styles.confirmButton, { backgroundColor: theme.accent }]}
            onPress={onClose}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 2,
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    maxHeight: height * 0.5,
  },
  optionsContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 4,
    borderRadius: 14,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  optionMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedOptionText: {
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bottomActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  confirmButton: {
    backgroundColor: '#4299E1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OptionDropdown; 
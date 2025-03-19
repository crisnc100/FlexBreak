import React from 'react';
import { ScrollView, StyleSheet, View, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { 
  ThemedScreen, 
  ThemedView, 
  ThemedText, 
  ThemedCard 
} from './common';

/**
 * A component to preview theme elements
 * This can be embedded in a screen for testing theme implementations
 */
const ThemePreview: React.FC = () => {
  const { theme, isDark, themeType, setThemeType } = useTheme();
  
  const toggleTheme = () => {
    setThemeType(isDark ? 'light' : 'dark');
  };
  
  return (
    <ThemedScreen>
      <ScrollView>
        <View style={styles.section}>
          <ThemedText bold size={20}>Theme Preview</ThemedText>
          <ThemedText type="secondary">
            Current theme: {themeType} ({isDark ? 'Dark' : 'Light'})
          </ThemedText>
          
          <View style={styles.themeToggle}>
            <ThemedText>Toggle Theme</ThemedText>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#d3d3d3', true: theme.accent + '80' }}
              thumbColor={isDark ? theme.accent : '#f4f3f4'}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <ThemedText bold size={18}>Text Elements</ThemedText>
          
          <ThemedCard style={styles.previewCard}>
            <ThemedText size={16} bold>Primary Text</ThemedText>
            <ThemedText>Regular primary text</ThemedText>
            <ThemedText type="secondary">Secondary Text</ThemedText>
            <ThemedText type="accent">Accent Text</ThemedText>
            <ThemedText type="success">Success Text</ThemedText>
            <ThemedText type="error">Error Text</ThemedText>
          </ThemedCard>
        </View>
        
        <View style={styles.section}>
          <ThemedText bold size={18}>Cards</ThemedText>
          
          <ThemedCard style={styles.previewCard}>
            <ThemedText bold>Default Card</ThemedText>
            <ThemedText type="secondary">With default styling</ThemedText>
          </ThemedCard>
          
          <ThemedCard 
            style={styles.previewCard} 
            elevation={5}
          >
            <ThemedText bold>Elevated Card</ThemedText>
            <ThemedText type="secondary">With elevation = 5</ThemedText>
          </ThemedCard>
          
          <ThemedCard 
            style={styles.previewCard} 
            useBorder
            elevation={0}
          >
            <ThemedText bold>Card with Border</ThemedText>
            <ThemedText type="secondary">Using border instead of shadow</ThemedText>
          </ThemedCard>
          
          <ThemedCard 
            style={styles.previewCard}
            onPress={() => alert('Card pressed!')}
          >
            <ThemedText bold>Touchable Card</ThemedText>
            <ThemedText type="secondary">Press me!</ThemedText>
          </ThemedCard>
        </View>
        
        <View style={styles.section}>
          <ThemedText bold size={18}>Icons</ThemedText>
          
          <View style={styles.iconRow}>
            <View style={styles.iconItem}>
              <Ionicons name="sunny" size={24} color={theme.text} />
              <ThemedText>Primary</ThemedText>
            </View>
            
            <View style={styles.iconItem}>
              <Ionicons name="moon" size={24} color={theme.textSecondary} />
              <ThemedText>Secondary</ThemedText>
            </View>
            
            <View style={styles.iconItem}>
              <Ionicons name="star" size={24} color={theme.accent} />
              <ThemedText>Accent</ThemedText>
            </View>
            
            <View style={styles.iconItem}>
              <Ionicons name="checkmark-circle" size={24} color={theme.success} />
              <ThemedText>Success</ThemedText>
            </View>
            
            <View style={styles.iconItem}>
              <Ionicons name="alert-circle" size={24} color={theme.error} />
              <ThemedText>Error</ThemedText>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <ThemedText bold size={18}>Buttons</ThemedText>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.accent }]}
              onPress={() => alert('Accent button pressed')}
            >
              <ThemedText style={{ color: 'white' }} bold>Accent</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.success }]}
              onPress={() => alert('Success button pressed')}
            >
              <ThemedText style={{ color: 'white' }} bold>Success</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.error }]}
              onPress={() => alert('Error button pressed')}
            >
              <ThemedText style={{ color: 'white' }} bold>Error</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.outlineButton, { borderColor: theme.accent }]}
              onPress={() => alert('Outline button pressed')}
            >
              <ThemedText style={{ color: theme.accent }} bold>Outline</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.ghostButton]}
              onPress={() => alert('Ghost button pressed')}
            >
              <ThemedText type="accent" bold>Ghost</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[styles.section, styles.backgroundSection]}>
          <ThemedText bold size={18}>Backgrounds</ThemedText>
          
          <View style={styles.backgroundRow}>
            <View style={[styles.backgroundItem, { backgroundColor: theme.background }]}>
              <ThemedText size={12}>Background</ThemedText>
            </View>
            
            <View style={[styles.backgroundItem, { backgroundColor: theme.backgroundLight }]}>
              <ThemedText size={12}>Background Light</ThemedText>
            </View>
            
            <View style={[styles.backgroundItem, { backgroundColor: theme.cardBackground }]}>
              <ThemedText size={12}>Card Background</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedScreen>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: 16,
    marginBottom: 16,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  previewCard: {
    marginTop: 8,
    marginBottom: 8,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  iconItem: {
    alignItems: 'center',
    margin: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    marginBottom: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  outlineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  ghostButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  backgroundSection: {
    marginBottom: 40,
  },
  backgroundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  backgroundItem: {
    width: '30%',
    height: 70,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
});

export default ThemePreview; 
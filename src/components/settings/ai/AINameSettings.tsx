import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { KEYS } from '../../../services/storageService';

interface AINameSettingsProps {
  visible: boolean;
  onNameSet?: () => void;
  showAsInput?: boolean;
}

export const AINameSettings: React.FC<AINameSettingsProps> = ({ visible, onNameSet, showAsInput }) => {
  const [userName, setUserName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    loadUserName();
    // If showAsInput is true, start in editing mode
    if (showAsInput) {
      setIsEditing(true);
    }
  }, [showAsInput]);

  const loadUserName = async () => {
    try {
      const name = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
      if (name) {
        setUserName(name);
        setInputValue(name);
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const saveName = async () => {
    const trimmedName = inputValue.trim();
    
    if (!trimmedName) {
      Alert.alert('Invalid Name', 'Please enter a valid first name');
      return;
    }
    
    if (!/^[A-Za-z]{2,20}$/.test(trimmedName)) {
      Alert.alert('Invalid Name', 'Please enter only letters (2-20 characters)');
      return;
    }
    
    try {
      const formattedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1).toLowerCase();
      await AsyncStorage.setItem(KEYS.AI_WELLNESS.USER_NAME, formattedName);
      setUserName(formattedName);
      setInputValue(formattedName);
      setIsEditing(false);
      
      // Call the callback if provided
      if (onNameSet) {
        onNameSet();
      }
    } catch (error) {
      console.error('Error saving name:', error);
      Alert.alert('Error', 'Failed to save your name');
    }
  };

  const deleteName = async () => {
    Alert.alert(
      'Remove Name',
      'Are you sure you want to remove your name? The AI coach will no longer personalize messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('@ai_wellness_user_name');
              setUserName('');
              setInputValue('');
              setIsEditing(false);
            } catch (error) {
              console.error('Error removing name:', error);
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.header}>
        <Ionicons name="person-outline" size={20} color={theme.text} />
        <Text style={[styles.title, { color: theme.text }]}>Your Name</Text>
      </View>
      
      {!isEditing ? (
        <View style={styles.displayRow}>
          <Text style={[styles.nameText, { color: theme.textSecondary }]}>
            {userName || 'Not set'}
          </Text>
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            style={[styles.editButton, { backgroundColor: theme.accent }]}
          >
            <Ionicons name={userName ? "pencil" : "add"} size={16} color="#FFF" />
            <Text style={styles.editButtonText}>{userName ? 'Edit' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.editRow}>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.inputBackground || theme.background, 
              color: theme.text,
              borderColor: theme.border
            }]}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Enter your first name"
            placeholderTextColor={theme.textSecondary}
            autoFocus
            maxLength={20}
            autoCapitalize="words"
          />
          <TouchableOpacity
            onPress={saveName}
            style={[styles.saveButton, { backgroundColor: theme.success || '#4CAF50' }]}
          >
            <Ionicons name="checkmark" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setInputValue(userName);
              setIsEditing(false);
            }}
            style={[styles.cancelButton, { backgroundColor: theme.error || '#F44336' }]}
          >
            <Ionicons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
      
      {userName && !isEditing && (
        <TouchableOpacity
          onPress={deleteName}
          style={styles.removeButton}
        >
          <Text style={[styles.removeButtonText, { color: theme.error || '#F44336' }]}>
            Remove Name
          </Text>
        </TouchableOpacity>
      )}
      
      <Text style={[styles.helpText, { color: theme.textSecondary }]}>
        The AI coach will use your first name to personalize wellness messages
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nameText: {
    fontSize: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editButtonText: {
    color: '#FFF',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  saveButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 8,
  },
  cancelButton: {
    marginLeft: 4,
    padding: 8,
    borderRadius: 8,
  },
  removeButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  removeButtonText: {
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
  },
});
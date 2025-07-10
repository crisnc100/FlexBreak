import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../../services/storageService';
import { AIWellnessToggle } from './AIWellnessToggle';
import { AIDebugButton } from './AIDebugButton';
import { AINameSettings } from './AINameSettings';
import { AIScheduleSettings } from './AIScheduleSettings';
import { SiriShortcutButton } from '../SiriShortcutButton';

export const AIWellnessSettings: React.FC = () => {
  const [aiWellnessEnabled, setAIWellnessEnabled] = useState(false);

  // Load AI Wellness setting on mount
  useEffect(() => {
    const loadAIWellnessSetting = async () => {
      const enabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
      setAIWellnessEnabled(enabled === 'true');
    };
    loadAIWellnessSetting();
  }, []);

  // Handle toggle from child component
  const handleToggle = (value: boolean) => {
    setAIWellnessEnabled(value);
  };

  return (
    <View>
      <AIWellnessToggle 
        enabled={aiWellnessEnabled}
        onToggle={handleToggle}
      />
      <AINameSettings visible={aiWellnessEnabled} />
      <AIScheduleSettings visible={aiWellnessEnabled} />
      {Platform.OS === 'ios' && aiWellnessEnabled && (
        <View style={{ marginTop: 16 }}>
          <SiriShortcutButton />
        </View>
      )}
      <AIDebugButton visible={aiWellnessEnabled} />
    </View>
  );
};
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../../services/storageService';
import { AIWellnessToggle } from './AIWellnessToggle';
import { AIDebugButton } from './AIDebugButton';
import { AINameSettings } from './AINameSettings';

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

  return (
    <View>
      <AIWellnessToggle 
        enabled={aiWellnessEnabled}
        onToggle={setAIWellnessEnabled}
      />
      <AINameSettings visible={aiWellnessEnabled} />
      <AIDebugButton visible={aiWellnessEnabled} />
    </View>
  );
};
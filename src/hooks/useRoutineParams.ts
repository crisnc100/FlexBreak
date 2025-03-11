import { useState, useEffect } from 'react';
import { BodyArea, Duration, RootStackParamList } from '../types';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';

type RoutineScreenRouteProp = RouteProp<RootStackParamList, 'Routine'>;

interface UseRoutineParamsReturn {
  area: BodyArea | null;
  duration: Duration | null;
  hasParams: boolean;
  setRoutineParams: (area: BodyArea, duration: Duration) => void;
  resetParams: () => void;
  navigateToHome: () => void;
  navigateToRoutine: (params: { area: BodyArea; duration: Duration }) => void;
}

export function useRoutineParams(): UseRoutineParamsReturn {
  const route = useRoute<RoutineScreenRouteProp>();
  const navigation = useNavigation<any>();
  
  const [area, setArea] = useState<BodyArea | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [hasParams, setHasParams] = useState(false);

  // Initialize from route params
  useEffect(() => {
    if (route.params?.area && route.params?.duration) {
      console.log('Setting params from route:', route.params.area, route.params.duration);
      setArea(route.params.area);
      setDuration(route.params.duration);
      setHasParams(true);
    } else {
      console.log('No params in route, resetting hasParams');
      setHasParams(false);
    }
  }, [route.params]);

  // Set routine parameters
  const setRoutineParams = (newArea: BodyArea, newDuration: Duration) => {
    console.log('Setting routine params:', newArea, newDuration);
    setArea(newArea);
    setDuration(newDuration);
    setHasParams(true);
    
    // Update navigation params to match state
    try {
      navigation.setParams({
        area: newArea,
        duration: newDuration,
        level: 'beginner'
      });
    } catch (error) {
      console.error('Error setting navigation params:', error);
    }
  };

  // Reset parameters
  const resetParams = () => {
    console.log('Resetting routine params');
    setArea(null);
    setDuration(null);
    setHasParams(false);
    
    // Clear route params
    try {
      navigation.setParams(undefined);
    } catch (error) {
      console.error('Error clearing navigation params:', error);
    }
  };

  // Navigate back to home screen
  const navigateToHome = () => {
    console.log('Navigating to home screen');
    
    // Use CommonActions.reset to clear the navigation stack
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }]
      })
    );
  };
  
  // Navigate to routine screen with params
  const navigateToRoutine = (params: { area: BodyArea; duration: Duration }) => {
    console.log('Navigating to routine screen with params:', params);
    
    // Navigate to the routine screen
    try {
      navigation.navigate('Routine', {
        ...params,
        level: 'beginner'
      });
    } catch (error) {
      console.error('Error navigating to routine:', error);
    }
  };

  return {
    area,
    duration,
    hasParams,
    setRoutineParams,
    resetParams,
    navigateToHome,
    navigateToRoutine
  };
}
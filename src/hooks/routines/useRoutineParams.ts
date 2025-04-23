import { useState, useEffect } from 'react';
import { BodyArea, Duration, RootStackParamList, StretchLevel, Stretch, RestPeriod } from '../../types';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';

type RoutineScreenRouteProp = RouteProp<RootStackParamList, 'Routine'>;

interface UseRoutineParamsReturn {
  area: BodyArea | null;
  duration: Duration | null;
  level: StretchLevel | null;
  customStretches?: (Stretch | RestPeriod)[];
  includePremiumStretches?: boolean;
  hasParams: boolean;
  setRoutineParams: (area: BodyArea, duration: Duration, level: StretchLevel, customStretches?: (Stretch | RestPeriod)[], includePremiumStretches?: boolean) => void;
  resetParams: () => void;
  navigateToHome: () => void;
  navigateToRoutine: (params: { area: BodyArea; duration: Duration; level?: StretchLevel; customStretches?: (Stretch | RestPeriod)[]; includePremiumStretches?: boolean }) => void;
}

export function useRoutineParams(): UseRoutineParamsReturn {
  const route = useRoute<RoutineScreenRouteProp>();
  const navigation = useNavigation<any>();
  
  const [area, setArea] = useState<BodyArea | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [level, setLevel] = useState<StretchLevel | null>(null);
  const [customStretches, setCustomStretches] = useState<(Stretch | RestPeriod)[] | undefined>(undefined);
  const [includePremiumStretches, setIncludePremiumStretches] = useState<boolean | undefined>(undefined);
  const [hasParams, setHasParams] = useState(false);

  // Initialize from route params
  useEffect(() => {
    if (route.params?.area && route.params?.duration) {
      console.log('Setting params from route:', route.params.area, route.params.duration, route.params.level || 'beginner');
      setArea(route.params.area);
      setDuration(route.params.duration);
      setLevel(route.params.level || 'beginner');
      
      if (route.params.customStretches) {
        console.log(`Received ${route.params.customStretches.length} custom stretches from route params`);
        // Log the first stretch to debug
        if (route.params.customStretches.length > 0) {
          const firstStretch = route.params.customStretches[0];
          console.log('First stretch sample:', {
            id: firstStretch.id,
            name: firstStretch.name,
            isRest: 'isRest' in firstStretch ? firstStretch.isRest : false
          });
        }
      }
      
      setCustomStretches(route.params.customStretches);
      setIncludePremiumStretches(route.params.includePremiumStretches);
      setHasParams(true);
    } else {
      console.log('No params in route, resetting hasParams');
      setHasParams(false);
    }
  }, [route.params]);

  // Set routine parameters
  const setRoutineParams = (
    newArea: BodyArea, 
    newDuration: Duration, 
    newLevel: StretchLevel = 'beginner',
    newCustomStretches?: (Stretch | RestPeriod)[],
    newIncludePremiumStretches?: boolean
  ) => {
    console.log('Setting routine params:', newArea, newDuration, newLevel);
    if (newCustomStretches) {
      console.log(`Setting ${newCustomStretches.length} custom stretches`);
      // Log the first stretch to debug
      if (newCustomStretches.length > 0) {
        const firstStretch = newCustomStretches[0];
        console.log('First stretch sample:', {
          id: firstStretch.id,
          name: firstStretch.name,
          isRest: 'isRest' in firstStretch ? firstStretch.isRest : false
        });
      }
    }
    if (newIncludePremiumStretches !== undefined) {
      console.log(`Including premium stretches: ${newIncludePremiumStretches}`);
    }
    
    setArea(newArea);
    setDuration(newDuration);
    setLevel(newLevel);
    setCustomStretches(newCustomStretches);
    setIncludePremiumStretches(newIncludePremiumStretches);
    setHasParams(true);
    
    // Update navigation params to match state
    try {
      navigation.setParams({
        area: newArea,
        duration: newDuration,
        level: newLevel,
        customStretches: newCustomStretches,
        includePremiumStretches: newIncludePremiumStretches
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
    setLevel(null);
    setCustomStretches(undefined);
    setIncludePremiumStretches(undefined);
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
  const navigateToRoutine = (params: { 
    area: BodyArea; 
    duration: Duration; 
    level?: StretchLevel;
    customStretches?: (Stretch | RestPeriod)[];
    includePremiumStretches?: boolean;
  }) => {
    console.log('Navigating to routine screen with params:', params);
    
    // Log detailed info about custom stretches
    if (params.customStretches && params.customStretches.length > 0) {
      console.log(`Navigating with ${params.customStretches.length} custom stretches`);
      // Log first stretch details
      const firstStretch = params.customStretches[0];
      console.log('First stretch details:', {
        id: firstStretch.id,
        name: firstStretch.name,
        type: typeof firstStretch.id,
        isRest: 'isRest' in firstStretch
      });
    }
    
    // Navigate to the routine screen
    try {
      navigation.navigate('Routine', {
        ...params,
        level: params.level || 'beginner'
      });
    } catch (error) {
      console.error('Error navigating to routine:', error);
    }
  };

  return {
    area,
    duration,
    level,
    customStretches,
    includePremiumStretches,
    hasParams,
    setRoutineParams,
    resetParams,
    navigateToHome,
    navigateToRoutine
  };
}
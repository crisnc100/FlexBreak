import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { MotionData, MotionState } from '../constants';
import { GAME_CONFIG } from '../constants';

export const useMotionTracking = () => {
  const [motionState, setMotionState] = useState<MotionState>({
    motionAvailable: false,
    motionPermissionGranted: false,
    calibratedX: 0,
    calibratedY: 0,
    currentTilt: { x: 0, y: 0 },
    rawMotion: { beta: 0, gamma: 0 },
    calibrationSamples: [],
  });

  const motionSubscription = useRef<any>();
  const smoothingBuffer = useRef<MotionData[]>([]);

  // NEW: Use refs to track calibrated values and avoid closure issues
  const calibratedXRef = useRef<number>(0);
  const calibratedYRef = useRef<number>(0);

  const checkMotionAvailability = useCallback(async () => {
    try {
      console.log('🎮 MINDFUL: Checking motion availability...');
      
      // Check if DeviceMotion is available
      const available = await DeviceMotion.isAvailableAsync();
      console.log('🎮 MINDFUL: Motion sensors available:', available);
      
      setMotionState(prev => ({ ...prev, motionAvailable: available }));
      
      if (!available) {
        console.log('🎮 MINDFUL: Motion sensors not available - enabling test mode');
        return false;
      }

      // Request permissions (especially important on iOS)
      try {
        if (Platform.OS === 'ios') {
          console.log('🎮 MINDFUL: Requesting motion permissions on iOS...');
          // Try to start listening briefly to trigger permission prompt
          await DeviceMotion.setUpdateInterval(1000);
          const listener = DeviceMotion.addListener(() => {});
          
          // Wait a moment then remove to trigger permission
          setTimeout(() => {
            listener.remove();
            setMotionState(prev => ({ ...prev, motionPermissionGranted: true }));
            console.log('🎮 MINDFUL: Motion permissions granted');
          }, 500);
        } else {
          setMotionState(prev => ({ ...prev, motionPermissionGranted: true }));
          console.log('🎮 MINDFUL: Motion permissions not required on Android');
        }
        return true;
      } catch (error) {
        console.log('🎮 MINDFUL: Motion permission error:', error);
        setMotionState(prev => ({ 
          ...prev, 
          motionPermissionGranted: false 
        }));
        return false;
      }
    } catch (error) {
      console.error('🎮 MINDFUL: Error checking motion availability:', error);
      setMotionState(prev => ({ ...prev, motionAvailable: false }));
      return false;
    }
  }, []);

  const startCalibration = useCallback(() => {
    console.log('🎮 MINDFUL: Starting calibration...');
    setMotionState(prev => ({ ...prev, calibrationSamples: [] }));
    
    if (!motionState.motionAvailable) {
      console.log('🎮 MINDFUL: Skipping calibration - motion not available');
      return Promise.resolve({ x: 0, y: 0 });
    }

    return new Promise<{ x: number; y: number }>((resolve) => {
      // Start collecting calibration samples
      DeviceMotion.setUpdateInterval(100);
      
      motionSubscription.current = DeviceMotion.addListener((motionData) => {
        const { rotation } = motionData;
        if (!rotation) return;
        
        console.log('🎮 MINDFUL: Calibration sample:', rotation);
        const rawBeta = rotation.beta || 0;
        const rawGamma = rotation.gamma || 0;
        
        setMotionState(prev => ({
          ...prev,
          rawMotion: { beta: rawBeta, gamma: rawGamma },
          calibrationSamples: [...prev.calibrationSamples, { x: rawBeta, y: rawGamma }]
        }));
        
        // Check if we have enough samples
        setMotionState(prev => {
          if (prev.calibrationSamples.length >= GAME_CONFIG.CALIBRATION_SAMPLES) {
            // Calculate average position as neutral
            const avgX = prev.calibrationSamples.reduce((sum, sample) => sum + sample.x, 0) / prev.calibrationSamples.length;
            const avgY = prev.calibrationSamples.reduce((sum, sample) => sum + sample.y, 0) / prev.calibrationSamples.length;
            
            console.log('🎮 MINDFUL: Calibration complete:', { avgX, avgY });
            
            // CRITICAL FIX: Update refs with calibrated values
            calibratedXRef.current = avgX;
            calibratedYRef.current = avgY;
            
            if (motionSubscription.current) {
              motionSubscription.current.remove();
            }
            
            setTimeout(() => resolve({ x: avgX, y: avgY }), 500);
            
            return {
              ...prev,
              calibratedX: avgX,
              calibratedY: avgY
            };
          }
          return prev;
        });
      });
    });
  }, [motionState.motionAvailable]);

  const startMotionTracking = useCallback((onTiltUpdate: (tilt: MotionData) => void) => {
    if (!motionState.motionAvailable) {
      console.log('🎮 MINDFUL: Motion tracking not available');
      return;
    }

    console.log('🎮 MINDFUL: Starting motion tracking...');
    console.log('🎮 MINDFUL: Calibrated position:', { x: calibratedXRef.current, y: calibratedYRef.current });
    
    // Use faster update interval for better responsiveness
    DeviceMotion.setUpdateInterval(GAME_CONFIG.MOTION_UPDATE_INTERVAL);
    
    motionSubscription.current = DeviceMotion.addListener((motionData) => {
      const { rotation } = motionData;
      if (!rotation) {
        console.log('🎮 MINDFUL: No rotation data in motion update');
        return;
      }
      
      const rawBeta = rotation.beta || 0;
      const rawGamma = rotation.gamma || 0;
      
      setMotionState(prev => ({
        ...prev,
        rawMotion: { beta: rawBeta, gamma: rawGamma }
      }));
      
      // FIXED: Use refs to get current calibrated values
      const tiltX = rawBeta - calibratedXRef.current;
      const tiltY = rawGamma - calibratedYRef.current;
      
      console.log('🎮 MINDFUL: Motion update:', { 
        raw: { beta: rawBeta, gamma: rawGamma },
        calibrated: { x: calibratedXRef.current, y: calibratedYRef.current },
        tilt: { x: tiltX, y: tiltY }
      });
      
      // Smooth the motion data with a smaller buffer for better responsiveness
      smoothingBuffer.current.push({ x: tiltX, y: tiltY });
      if (smoothingBuffer.current.length > 2) { // Smaller buffer for faster response
        smoothingBuffer.current.shift();
      }
      
      const smoothX = smoothingBuffer.current.reduce((sum, data) => sum + data.x, 0) / smoothingBuffer.current.length;
      const smoothY = smoothingBuffer.current.reduce((sum, data) => sum + data.y, 0) / smoothingBuffer.current.length;
      
      const smoothedTilt = { x: smoothX, y: smoothY };
      console.log('🎮 MINDFUL: Smoothed tilt:', smoothedTilt);
      
      setMotionState(prev => ({ ...prev, currentTilt: smoothedTilt }));
      onTiltUpdate(smoothedTilt);
    });
  }, [motionState.motionAvailable]);

  const stopMotionTracking = useCallback(() => {
    if (motionSubscription.current) {
      motionSubscription.current.remove();
      motionSubscription.current = null;
    }
  }, []);

  return {
    motionState,
    checkMotionAvailability,
    startCalibration,
    startMotionTracking,
    stopMotionTracking,
  };
}; 
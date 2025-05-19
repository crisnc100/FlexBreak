import { useState, useEffect } from 'react';
import * as streakManager from '../../utils/progress/modules/streakManager';

/**
 * React hook that returns the current streak and keeps it
 * in sync whenever streak-related events fire.
 */
export const useStreak = (opts: { forceRefresh?: boolean } = {}): number => {
  const { forceRefresh = false } = opts;
  const [streak, setStreak] = useState<number>(0);

  const refresh = async () => {
    try {
      const status = await streakManager.getStreakStatus(forceRefresh);
      setStreak(status.currentStreak);
    } catch (error) {
      console.error('Error in useStreak hook:', error);
      // Keep the current streak value if there's an error
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadStreak = async () => {
      try {
        const status = await streakManager.getStreakStatus(forceRefresh);
        if (isMounted) {
          setStreak(status.currentStreak);
        }
      } catch (error) {
        console.error('Error in useStreak initial load:', error);
      }
    };
    
    loadStreak();                                // first paint
    
    const handler = () => refresh();             // every update
    streakManager.streakEvents.on(
      streakManager.STREAK_UPDATED_EVENT,
      handler
    );
    // Also refresh when a streak flexSave is applied and saved
    streakManager.streakEvents.on(
      streakManager.STREAK_SAVED_EVENT,
      handler
    );
    
    return () => {
      isMounted = false;
      streakManager.streakEvents.off(
        streakManager.STREAK_UPDATED_EVENT,
        handler
      );
      streakManager.streakEvents.off(
        streakManager.STREAK_SAVED_EVENT,
        handler
      );
    };
  }, [forceRefresh]);

  return streak;
};

// Default export for compatibility
export default useStreak;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { StreakState as StreakStateType } from '../../utils/progress/types';
import * as storageService from '../../services/storageService';
import * as dateUtils from '../../utils/progress/modules/utils/dateUtils';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as streakFreezeManager from '../../utils/progress/modules/streakFreezeManager';

// Define the state structure for the streak feature
interface StreakSliceState {
  streak: number;
  streakState: 'ACTIVE' | 'FROZEN' | 'BROKEN';
  routineDates: string[];
  streakFreezeDates: string[];
  processedToday: boolean;
  lastProcessedDate: string;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: StreakSliceState = {
  streak: 0,
  streakState: 'BROKEN',
  routineDates: [],
  streakFreezeDates: [],
  processedToday: false,
  lastProcessedDate: '',
  isLoading: false,
  error: null
};

// Async thunks
export const initializeStreakState = createAsyncThunk(
  'streak/initialize',
  async (_, { rejectWithValue }) => {
    try {
      // Ensure streak manager is initialized
      if (!streakManager.streakCache.initialized) {
        await streakManager.initializeStreak();
      }
      
      // Get streak status from the new manager
      const streakStatus = await streakManager.getStreakStatus();
      
      // Determine streak state based on current activity
      let streakState: 'ACTIVE' | 'FROZEN' | 'BROKEN' = 'BROKEN';
      if (streakStatus.currentStreak > 0) {
        // Check if there's a freeze applied recently
        const hasFreezeYesterday = await streakManager.hasFreezeYesterday();
        streakState = hasFreezeYesterday ? 'FROZEN' : 'ACTIVE';
      }
      
      // Get current date
      const today = new Date();
      const todayStr = dateUtils.formatDateYYYYMMDD(today);
      
      return {
        streak: streakStatus.currentStreak,
        streakState: streakState,
        routineDates: streakManager.streakCache.routineDates,
        streakFreezeDates: streakManager.streakCache.freezeDates,
        processedToday: streakStatus.maintainedToday,
        lastProcessedDate: todayStr
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to initialize streak state');
    }
  }
);

export const updateStreakStatus = createAsyncThunk(
  'streak/updateStatus',
  async (todayHasRoutine: boolean = false, { getState, rejectWithValue }) => {
    try {
      // Ensure streak manager is initialized
      if (!streakManager.streakCache.initialized) {
        await streakManager.initializeStreak();
      }
      
      // If we have a routine today, call completeRoutine
      if (todayHasRoutine) {
        const result = await streakManager.completeRoutine();
        
        let streakState: 'ACTIVE' | 'FROZEN' | 'BROKEN' = 'ACTIVE';
        if (result.currentStreak <= 0) {
          streakState = 'BROKEN';
        }
        
        return {
          streak: result.currentStreak,
          streakState: streakState,
          freezesAvailable: streakManager.streakCache.freezesAvailable
        };
      }
      
      // Otherwise just get the current status
      const streakStatus = await streakManager.getStreakStatus();
      const hasFreezeYesterday = await streakManager.hasFreezeYesterday();
      
      let streakState: 'ACTIVE' | 'FROZEN' | 'BROKEN' = 'BROKEN';
      if (streakStatus.currentStreak > 0) {
        streakState = hasFreezeYesterday ? 'FROZEN' : 'ACTIVE';
      }
      
      return {
        streak: streakStatus.currentStreak,
        streakState: streakState,
        freezesAvailable: streakStatus.freezesAvailable
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update streak status');
    }
  }
);

export const applyStreakFreeze = createAsyncThunk(
  'streak/applyFreeze',
  async (_, { getState, rejectWithValue }) => {
    try {
      // Use the new streakManager to apply a freeze
      const result = await streakManager.applyFreeze();
      
      if (result.success) {
        // Determine streak state - after applying freeze it should be FROZEN
        const streakState = result.currentStreak > 0 ? 'FROZEN' : 'BROKEN';
        
        return {
          success: true,
          streakState: streakState,
          streakFreezeDates: streakManager.streakCache.freezeDates
        };
      } else {
        return rejectWithValue('Failed to apply streak freeze');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to apply streak freeze');
    }
  }
);

// Create the streak slice
const streakSlice = createSlice({
  name: 'streak',
  initialState,
  reducers: {
    setStreak: (state, action: PayloadAction<number>) => {
      state.streak = action.payload;
    },
    setStreakState: (state, action: PayloadAction<'ACTIVE' | 'FROZEN' | 'BROKEN'>) => {
      state.streakState = action.payload;
    },
    setRoutineDates: (state, action: PayloadAction<string[]>) => {
      state.routineDates = action.payload;
    },
    addRoutineDate: (state, action: PayloadAction<string>) => {
      if (!state.routineDates.includes(action.payload)) {
        state.routineDates.push(action.payload);
      }
    },
    setStreakFreezeDates: (state, action: PayloadAction<string[]>) => {
      state.streakFreezeDates = action.payload;
    },
    addStreakFreezeDate: (state, action: PayloadAction<string>) => {
      if (!state.streakFreezeDates.includes(action.payload)) {
        state.streakFreezeDates.push(action.payload);
      }
    },
    setProcessedToday: (state, action: PayloadAction<boolean>) => {
      state.processedToday = action.payload;
    },
    setLastProcessedDate: (state, action: PayloadAction<string>) => {
      state.lastProcessedDate = action.payload;
    },
    resetStreak: (state) => {
      state.streak = 0;
      state.streakState = 'BROKEN';
    },
    incrementStreak: (state) => {
      state.streak += 1;
      state.streakState = 'ACTIVE';
    }
  },
  extraReducers: (builder) => {
    // Handle initializeStreakState
    builder
      .addCase(initializeStreakState.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeStreakState.fulfilled, (state, action) => {
        state.isLoading = false;
        state.streak = action.payload.streak;
        state.streakState = action.payload.streakState;
        state.routineDates = action.payload.routineDates;
        state.streakFreezeDates = action.payload.streakFreezeDates;
        state.processedToday = action.payload.processedToday;
        state.lastProcessedDate = action.payload.lastProcessedDate;
      })
      .addCase(initializeStreakState.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
      
    // Handle updateStreakStatus
    builder
      .addCase(updateStreakStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateStreakStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.streak = action.payload.streak;
        state.streakState = action.payload.streakState as 'ACTIVE' | 'FROZEN' | 'BROKEN';
        state.processedToday = true;
        state.lastProcessedDate = dateUtils.formatDateYYYYMMDD(new Date());
      })
      .addCase(updateStreakStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
      
    // Handle applyStreakFreeze
    builder
      .addCase(applyStreakFreeze.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(applyStreakFreeze.fulfilled, (state, action) => {
        state.isLoading = false;
        state.streakState = action.payload.streakState as 'ACTIVE' | 'FROZEN' | 'BROKEN';
        state.streakFreezeDates = action.payload.streakFreezeDates;
      })
      .addCase(applyStreakFreeze.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
  }
});

// Export actions
export const {
  setStreak,
  setStreakState,
  setRoutineDates,
  addRoutineDate,
  setStreakFreezeDates,
  addStreakFreezeDate,
  setProcessedToday,
  setLastProcessedDate,
  resetStreak,
  incrementStreak
} = streakSlice.actions;

export default streakSlice.reducer; 
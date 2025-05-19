import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { StreakState as StreakStateType } from '../../utils/progress/types';
import * as storageService from '../../services/storageService';
import * as dateUtils from '../../utils/progress/modules/utils/dateUtils';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as flexSaveManager from '../../utils/progress/modules/flexSaveManager';

// Define the state structure for the streak feature
interface StreakSliceState {
  streak: number;
  streakState: 'ACTIVE' | 'FROZEN' | 'BROKEN';
  routineDates: string[];
  flexSaveDates: string[];
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
  flexSaveDates: [],
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
        // Check if there's a flexSave applied recently
        const hasFlexSaveYesterday = await streakManager.hasFlexSaveYesterday();
        streakState = hasFlexSaveYesterday ? 'FROZEN' : 'ACTIVE';
      }
      
      // Get current date
      const today = new Date();
      const todayStr = dateUtils.formatDateYYYYMMDD(today);
      
      return {
        streak: streakStatus.currentStreak,
        streakState: streakState,
        routineDates: streakManager.streakCache.routineDates,
        flexSaveDates: streakManager.streakCache.flexSaveDates,
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
          flexSavesAvailable: streakManager.streakCache.flexSavesAvailable
        };
      }
      
      // Otherwise just get the current status
      const streakStatus = await streakManager.getStreakStatus();
      const hasFlexSaveYesterday = await streakManager.hasFlexSaveYesterday();
      
      let streakState: 'ACTIVE' | 'FROZEN' | 'BROKEN' = 'BROKEN';
      if (streakStatus.currentStreak > 0) {
        streakState = hasFlexSaveYesterday ? 'FROZEN' : 'ACTIVE';
      }
      
      return {
        streak: streakStatus.currentStreak,
        streakState: streakState,
        flexSavesAvailable: streakStatus.flexSavesAvailable
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update streak status');
    }
  }
);

export const applyFlexSave = createAsyncThunk(
  'streak/applyFlexSave',
  async (_, { getState, rejectWithValue }) => {
    try {
      // Use the new streakManager to apply a flexSave
      const result = await streakManager.applyFlexSave();
      
      if (result.success) {
        // Determine streak state - after applying flexSave it should be FROZEN
        const streakState = result.currentStreak > 0 ? 'FROZEN' : 'BROKEN';
        
        return {
          success: true,
          streakState: streakState,
          flexSaveDates: streakManager.streakCache.flexSaveDates
        };
      } else {
        return rejectWithValue('Failed to apply streak flexSave');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to apply streak flexSave');
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
    setFlexSaveDates: (state, action: PayloadAction<string[]>) => {
      state.flexSaveDates = action.payload;
    },
    addFlexSaveDate: (state, action: PayloadAction<string>) => {
      if (!state.flexSaveDates.includes(action.payload)) {
        state.flexSaveDates.push(action.payload);
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
        state.flexSaveDates = action.payload.flexSaveDates;
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
      
    // Handle applyFlexSave
    builder
      .addCase(applyFlexSave.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(applyFlexSave.fulfilled, (state, action) => {
        state.isLoading = false;
        state.streakState = action.payload.streakState as 'ACTIVE' | 'FROZEN' | 'BROKEN';
        state.flexSaveDates = action.payload.flexSaveDates;
      })
      .addCase(applyFlexSave.rejected, (state, action) => {
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
  setFlexSaveDates,
  addFlexSaveDate,
  setProcessedToday,
  setLastProcessedDate,
  resetStreak,
  incrementStreak
} = streakSlice.actions;

export default streakSlice.reducer; 
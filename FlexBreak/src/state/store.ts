import { configureStore } from '@reduxjs/toolkit';
import streakReducer from './slices/streakSlice';

// Configure the Redux store
const store = configureStore({
  reducer: {
    streak: streakReducer
    // Add other reducers here as your app grows
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false, // Needed if you have non-serializable values
    }),
});

// Infer the RootState and AppDispatch types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store; 
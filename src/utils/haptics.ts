import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Create a wrapper around Haptics that works with different Expo versions
// and handles errors gracefully across platforms

// Success vibration/haptic
export function success() {
  try {
    if (Platform.OS === 'web') {
      return; // Haptics not supported on web
    }
    
    // Fallback to any available method
    if (typeof Haptics.notificationAsync === 'function') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (typeof Haptics.impactAsync === 'function') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (typeof Haptics.selectionAsync === 'function') {
      Haptics.selectionAsync();
    }
  } catch (error) {
    // Silence haptics errors - they're not critical for app function
    console.log('Haptics error (non-critical):', error);
  }
}

// Error/warning vibration/haptic
export function error() {
  try {
    if (Platform.OS === 'web') {
      return; // Haptics not supported on web
    }
    
    // Fallback to any available method
    if (typeof Haptics.notificationAsync === 'function') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (typeof Haptics.impactAsync === 'function') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (typeof Haptics.selectionAsync === 'function') {
      Haptics.selectionAsync();
    }
  } catch (error) {
    // Silence haptics errors - they're not critical for app function
    console.log('Haptics error (non-critical):', error);
  }
}

// Warning vibration/haptic
export function warning() {
  try {
    if (Platform.OS === 'web') {
      return; // Haptics not supported on web
    }
    
    // Fallback to any available method
    if (typeof Haptics.notificationAsync === 'function') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (typeof Haptics.impactAsync === 'function') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (typeof Haptics.selectionAsync === 'function') {
      Haptics.selectionAsync();
    }
  } catch (error) {
    // Silence haptics errors - they're not critical for app function
    console.log('Haptics error (non-critical):', error);
  }
}

// Light impact
export function light() {
  try {
    if (Platform.OS === 'web') {
      return; // Haptics not supported on web
    }
    
    // Fallback to any available method
    if (typeof Haptics.impactAsync === 'function') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (typeof Haptics.selectionAsync === 'function') {
      Haptics.selectionAsync();
    }
  } catch (error) {
    // Silence haptics errors - they're not critical for app function
    console.log('Haptics error (non-critical):', error);
  }
}

// Medium impact
export function medium() {
  try {
    if (Platform.OS === 'web') {
      return; // Haptics not supported on web
    }
    
    // Fallback to any available method
    if (typeof Haptics.impactAsync === 'function') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (typeof Haptics.selectionAsync === 'function') {
      Haptics.selectionAsync();
    }
  } catch (error) {
    // Silence haptics errors - they're not critical for app function
    console.log('Haptics error (non-critical):', error);
  }
}

// Heavy impact
export function heavy() {
  try {
    if (Platform.OS === 'web') {
      return; // Haptics not supported on web
    }
    
    // Fallback to any available method
    if (typeof Haptics.impactAsync === 'function') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (typeof Haptics.selectionAsync === 'function') {
      Haptics.selectionAsync();
    }
  } catch (error) {
    // Silence haptics errors - they're not critical for app function
    console.log('Haptics error (non-critical):', error);
  }
}

// Selection feedback
export function selection() {
  try {
    if (Platform.OS === 'web') {
      return; // Haptics not supported on web
    }
    
    // Fallback to any available method
    if (typeof Haptics.selectionAsync === 'function') {
      Haptics.selectionAsync();
    } else if (typeof Haptics.impactAsync === 'function') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (error) {
    // Silence haptics errors - they're not critical for app function
    console.log('Haptics error (non-critical):', error);
  }
} 
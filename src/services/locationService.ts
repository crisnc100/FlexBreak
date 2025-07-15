import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Storage keys
const LOCATION_PERMISSION_KEY = 'location_permission_granted';
const WEATHER_NOTIFICATIONS_KEY = 'weather_notifications_enabled';
const LAST_LOCATION_UPDATE_KEY = 'last_location_update';

// Location update interval: 24 hours
const LOCATION_UPDATE_INTERVAL = 24 * 60 * 60 * 1000;

export interface UserLocation {
  lat: number;
  lon: number;
  city?: string;
  region?: string;
  country?: string;
  enabled: boolean;
  lastUpdated: number;
}

/**
 * Request location permissions from the user
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    
    if (existingStatus === 'granted') {
      await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, 'true');
      return true;
    }
    
    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status === 'granted') {
      await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, 'true');
      return true;
    } else {
      await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, 'false');
      return false;
    }
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Check if location permission is granted
 */
export async function checkLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
}

/**
 * Get the current location of the user
 */
export async function getCurrentLocation(): Promise<UserLocation | null> {
  try {
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      console.log('Location permission not granted');
      return null;
    }
    
    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    // Try to get reverse geocode for city information
    let city, region, country;
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        city = place.city || place.subregion;
        region = place.region;
        country = place.country;
      }
    } catch (geocodeError) {
      console.error('Error reverse geocoding:', geocodeError);
    }
    
    return {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      city,
      region,
      country,
      enabled: true,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Save user location to Firestore
 */
export async function saveLocationToFirestore(location: UserLocation): Promise<boolean> {
  try {
    // Since there's no authentication system, we only save locally
    // The location is already stored in AsyncStorage by setWeatherNotificationsEnabled
    
    // Update last location update timestamp
    await AsyncStorage.setItem(LAST_LOCATION_UPDATE_KEY, Date.now().toString());
    
    console.log('Location saved locally (no auth system in app)');
    return true;
  } catch (error) {
    console.error('Error saving location:', error);
    return false;
  }
}

/**
 * Enable or disable weather notifications
 */
export async function setWeatherNotificationsEnabled(enabled: boolean): Promise<boolean> {
  try {
    await AsyncStorage.setItem(WEATHER_NOTIFICATIONS_KEY, enabled.toString());
    
    if (enabled) {
      // Request location permission if not already granted
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        Alert.alert(
          'Location Permission Required',
          'Weather-based notifications require location access to provide relevant weather information.',
          [
            { text: 'OK' }
          ]
        );
        return false;
      }
      
      // Get and save current location
      const location = await getCurrentLocation();
      if (location) {
        await saveLocationToFirestore(location);
        return true;
      } else {
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Please ensure location services are enabled.',
          [
            { text: 'OK' }
          ]
        );
        return false;
      }
    } else {
      // Disable weather notifications in Firestore
      const user = firebase.auth().currentUser;
      if (user) {
        await firebase.firestore()
          .collection('user_locations')
          .doc(user.uid)
          .update({
            enabled: false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
      }
      return true;
    }
  } catch (error) {
    console.error('Error setting weather notifications:', error);
    return false;
  }
}

/**
 * Check if weather notifications are enabled
 */
export async function areWeatherNotificationsEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(WEATHER_NOTIFICATIONS_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking weather notifications status:', error);
    return false;
  }
}

/**
 * Update location if it's been more than 24 hours
 */
export async function updateLocationIfNeeded(): Promise<void> {
  try {
    const weatherEnabled = await areWeatherNotificationsEnabled();
    if (!weatherEnabled) {
      return;
    }
    
    const lastUpdateStr = await AsyncStorage.getItem(LAST_LOCATION_UPDATE_KEY);
    const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr, 10) : 0;
    const now = Date.now();
    
    // Update if more than 24 hours have passed
    if (now - lastUpdate > LOCATION_UPDATE_INTERVAL) {
      console.log('Updating location (24 hours have passed)');
      const location = await getCurrentLocation();
      if (location) {
        await saveLocationToFirestore(location);
      }
    }
  } catch (error) {
    console.error('Error updating location:', error);
  }
}

/**
 * Get stored location from Firestore
 */
export async function getStoredLocation(): Promise<UserLocation | null> {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      return null;
    }
    
    const doc = await firebase.firestore()
      .collection('user_locations')
      .doc(user.uid)
      .get();
    
    if (doc.exists) {
      return doc.data() as UserLocation;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting stored location:', error);
    return null;
  }
}
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import * as Location from 'expo-location';
import { VerificationType } from './verificationService';

export interface OfficeVerificationData {
  hasOfficeLocation: boolean;
  workArrangement: 'office' | 'hybrid' | 'remote' | 'unknown';
  confidence: number;
  verificationMethods: string[];
  locationData?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  }[];
  companyAddress?: string;
  selfReported?: {
    workArrangement: 'office' | 'hybrid' | 'remote';
    daysInOffice: number;
    officeAddress: string;
  };
}

// Main function to verify office/hybrid work arrangement
export const verifyOfficeWorker = async (
  userId: string,
  email: string,
  companyName: string
): Promise<{
  isOfficeWorker: boolean;
  confidence: number;
  workArrangement: 'office' | 'hybrid' | 'remote' | 'unknown';
  verificationData: OfficeVerificationData;
  requiresAdditionalVerification: boolean;
}> => {
  try {
    const verificationData: OfficeVerificationData = {
      hasOfficeLocation: false,
      workArrangement: 'unknown',
      confidence: 0,
      verificationMethods: []
    };

    // Step 1: Self-reported work arrangement (quick survey)
    const selfReported = await getSelfReportedWorkArrangement(userId);
    if (selfReported) {
      verificationData.selfReported = selfReported;
      verificationData.verificationMethods.push('self_reported');
      
      if (selfReported.workArrangement === 'remote') {
        return {
          isOfficeWorker: false,
          confidence: 90,
          workArrangement: 'remote',
          verificationData,
          requiresAdditionalVerification: false
        };
      }
    }

    // Step 2: Company location lookup
    const companyLocation = await lookupCompanyLocation(companyName, email);
    if (companyLocation) {
      verificationData.companyAddress = companyLocation.address;
      verificationData.hasOfficeLocation = true;
      verificationData.verificationMethods.push('company_lookup');
      verificationData.confidence += 20;
    }

    // Step 3: Optional location verification (with user consent)
    const locationVerification = await requestLocationVerification(userId);
    if (locationVerification.granted) {
      verificationData.locationData = locationVerification.locations;
      verificationData.verificationMethods.push('location_tracking');
      
      // Analyze location patterns
      const locationAnalysis = analyzeLocationPatterns(
        locationVerification.locations,
        companyLocation?.coordinates
      );
      
      verificationData.confidence += locationAnalysis.confidenceBoost;
      verificationData.workArrangement = locationAnalysis.workArrangement;
    }

    // Step 4: Calculate final assessment
    const finalAssessment = calculateFinalAssessment(verificationData);
    
    return {
      isOfficeWorker: finalAssessment.isOfficeWorker,
      confidence: finalAssessment.confidence,
      workArrangement: finalAssessment.workArrangement,
      verificationData,
      requiresAdditionalVerification: finalAssessment.confidence < 70
    };

  } catch (error) {
    console.error('Error verifying office worker:', error);
    return {
      isOfficeWorker: false,
      confidence: 0,
      workArrangement: 'unknown',
      verificationData: {
        hasOfficeLocation: false,
        workArrangement: 'unknown',
        confidence: 0,
        verificationMethods: ['error']
      },
      requiresAdditionalVerification: true
    };
  }
};

// Self-reported work arrangement survey
export const collectWorkArrangementInfo = async (
  userId: string,
  workArrangement: 'office' | 'hybrid' | 'remote',
  daysInOffice: number,
  officeAddress: string
): Promise<boolean> => {
  try {
    const userRef = firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('verification')
      .doc('work_arrangement');

    await userRef.set({
      workArrangement,
      daysInOffice,
      officeAddress,
      submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
      ipAddress: await getUserIPAddress(), // For basic fraud detection
    });

    return true;
  } catch (error) {
    console.error('Error saving work arrangement info:', error);
    return false;
  }
};

// Get previously saved work arrangement
const getSelfReportedWorkArrangement = async (userId: string) => {
  try {
    const doc = await firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('verification')
      .doc('work_arrangement')
      .get();

    if (doc.exists) {
      return doc.data() as OfficeVerificationData['selfReported'];
    }
    return null;
  } catch (error) {
    console.error('Error getting work arrangement:', error);
    return null;
  }
};

// Company location lookup using various APIs
const lookupCompanyLocation = async (
  companyName: string,
  email: string
): Promise<{
  address: string;
  coordinates: { lat: number; lng: number };
} | null> => {
  try {
    const domain = email.split('@')[1];
    
    // Method 1: Try to find company website and extract address
    const websiteInfo = await extractCompanyInfoFromWebsite(domain);
    if (websiteInfo) {
      return websiteInfo;
    }

    // Method 2: Use business directory APIs (Google Places, Yelp, etc.)
    const directoryInfo = await searchBusinessDirectories(companyName);
    if (directoryInfo) {
      return directoryInfo;
    }

    // Method 3: LinkedIn company page scraping (if available)
    const linkedinInfo = await getLinkedInCompanyInfo(companyName);
    if (linkedinInfo) {
      return linkedinInfo;
    }

    return null;
  } catch (error) {
    console.error('Error looking up company location:', error);
    return null;
  }
};

// Extract company info from website
const extractCompanyInfoFromWebsite = async (domain: string) => {
  try {
    // In a real implementation, you'd scrape the company website for address info
    // For now, we'll simulate this
    const response = await fetch(`https://${domain}/contact`);
    if (response.ok) {
      // Simulate finding address information
      return {
        address: "123 Business St, City, State 12345",
        coordinates: { lat: 40.7128, lng: -74.0060 }
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Search business directories
const searchBusinessDirectories = async (companyName: string) => {
  try {
    // In a real implementation, you'd use Google Places API, Yelp API, etc.
    // For now, we'll simulate this
    if (companyName && companyName.length > 3) {
      return {
        address: "456 Corporate Ave, Business City, State 54321",
        coordinates: { lat: 40.7589, lng: -73.9851 }
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Get LinkedIn company info
const getLinkedInCompanyInfo = async (companyName: string) => {
  try {
    // In a real implementation, you'd use LinkedIn API
    // For now, we'll simulate this
    return null;
  } catch (error) {
    return null;
  }
};

// Request location verification with user consent
const requestLocationVerification = async (userId: string): Promise<{
  granted: boolean;
  locations: Array<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  }>;
}> => {
  try {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      return { granted: false, locations: [] };
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // In a real implementation, you might collect location data over several days
    // For now, we'll just get the current location
    const locations = [{
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 100,
      timestamp: Date.now()
    }];

    // Save location data (with user consent)
    await saveLocationData(userId, locations);

    return { granted: true, locations };
  } catch (error) {
    console.error('Error requesting location verification:', error);
    return { granted: false, locations: [] };
  }
};

// Save location data securely
const saveLocationData = async (
  userId: string,
  locations: Array<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  }>
) => {
  try {
    const locationRef = firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('verification')
      .doc('location_data');

    await locationRef.set({
      locations,
      collectedAt: firebase.firestore.FieldValue.serverTimestamp(),
      // Auto-delete after 30 days for privacy
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    console.error('Error saving location data:', error);
  }
};

// Analyze location patterns to determine work arrangement
const analyzeLocationPatterns = (
  userLocations: Array<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  }>,
  companyCoordinates?: { lat: number; lng: number }
): {
  workArrangement: 'office' | 'hybrid' | 'remote' | 'unknown';
  confidenceBoost: number;
} => {
  if (!userLocations.length) {
    return { workArrangement: 'unknown', confidenceBoost: 0 };
  }

  // If we don't have company coordinates, we can't determine much
  if (!companyCoordinates) {
    return { workArrangement: 'unknown', confidenceBoost: 5 };
  }

  // Calculate distance from user location to company location
  const userLocation = userLocations[0]; // Using first/current location
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    companyCoordinates.lat,
    companyCoordinates.lng
  );

  // Determine work arrangement based on distance
  if (distance < 1) { // Within 1km of office
    return { workArrangement: 'office', confidenceBoost: 30 };
  } else if (distance < 50) { // Within 50km (could be hybrid)
    return { workArrangement: 'hybrid', confidenceBoost: 20 };
  } else { // Far from office (likely remote)
    return { workArrangement: 'remote', confidenceBoost: 25 };
  }
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate final assessment
const calculateFinalAssessment = (data: OfficeVerificationData): {
  isOfficeWorker: boolean;
  confidence: number;
  workArrangement: 'office' | 'hybrid' | 'remote' | 'unknown';
} => {
  let confidence = data.confidence;
  let workArrangement = data.workArrangement;

  // Self-reported data carries significant weight
  if (data.selfReported) {
    if (data.selfReported.workArrangement === 'office') {
      confidence += 40;
      workArrangement = 'office';
    } else if (data.selfReported.workArrangement === 'hybrid') {
      confidence += 35;
      workArrangement = 'hybrid';
    } else if (data.selfReported.workArrangement === 'remote') {
      confidence += 45; // High confidence for remote (people usually honest about this)
      workArrangement = 'remote';
    }
  }

  // Company location adds credibility
  if (data.hasOfficeLocation) {
    confidence += 15;
  }

  // Location data is very reliable
  if (data.locationData && data.locationData.length > 0) {
    confidence += 20;
  }

  const isOfficeWorker = workArrangement === 'office' || workArrangement === 'hybrid';

  return {
    isOfficeWorker,
    confidence: Math.min(100, confidence),
    workArrangement
  };
};

// Get user IP address for basic fraud detection
const getUserIPAddress = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'unknown';
  }
};

// Additional verification methods for edge cases
export const requestAdditionalVerification = async (
  userId: string,
  verificationType: 'office_photo' | 'colleague_confirmation' | 'schedule_proof'
): Promise<boolean> => {
  try {
    // This would implement additional verification methods:
    // 1. Office photo verification (photo of office space/desk)
    // 2. Colleague confirmation (another verified employee confirms)
    // 3. Schedule proof (calendar showing office meetings/events)
    
    const verificationRef = firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('verification')
      .doc('additional_verification');

    await verificationRef.set({
      type: verificationType,
      status: 'pending',
      submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error requesting additional verification:', error);
    return false;
  }
}; 
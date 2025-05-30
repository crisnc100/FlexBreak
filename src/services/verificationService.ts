import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VerificationType = 'office' | 'student';
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type VerificationMethod = 'email' | 'document' | 'linkedin';

export interface VerificationData {
  status: VerificationStatus;
  type: VerificationType | null;
  submittedAt?: any;
  approvedAt?: any;
  rejectedAt?: any;
  rejectionReason?: string;
  verificationMethod?: VerificationMethod;
  corporateEmail?: string;
  companyName?: string;
  documentUrls?: string[];
  adminNotes?: string;
  expiresAt?: any;
}

// Corporate email domains that are automatically approved
const APPROVED_CORPORATE_DOMAINS = [
  // Major tech companies
  'microsoft.com', 'google.com', 'apple.com', 'amazon.com', 'meta.com', 
  'netflix.com', 'uber.com', 'airbnb.com', 'salesforce.com', 'adobe.com',
  'oracle.com', 'ibm.com', 'intel.com', 'nvidia.com', 'tesla.com',
  
  // Major consulting/professional services
  'mckinsey.com', 'bcg.com', 'bain.com', 'deloitte.com', 'pwc.com',
  'ey.com', 'kpmg.com', 'accenture.com',
  
  // Major financial institutions
  'jpmorgan.com', 'goldmansachs.com', 'morganstanley.com', 'blackrock.com',
  'citi.com', 'wellsfargo.com', 'bankofamerica.com',
  
  // Add more as needed - you can expand this list
];

// Educational domains for student verification
const EDUCATIONAL_DOMAINS = [
  '.edu', '.ac.uk', '.edu.au', '.ac.in', '.edu.ca', '.ac.nz',
  '.edu.sg', '.ac.za', '.edu.my', '.ac.th'
];

// Enhanced corporate domain detection for small companies
const isCorporateDomain = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  // Check against approved corporate domains (auto-approve)
  if (APPROVED_CORPORATE_DOMAINS.includes(domain)) return true;
  
  // Exclude common personal email providers
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'aol.com', 'protonmail.com', 'yandex.com',
    'mail.com', 'zoho.com', 'tutanota.com', 'live.com',
    'msn.com', 'comcast.net', 'verizon.net', 'att.net'
  ];
  
  if (personalDomains.includes(domain)) return false;
  
  // Additional heuristics for corporate domains
  const corporatePatterns = [
    /\.corp$/,           // company.corp
    /\.inc$/,            // company.inc  
    /\.ltd$/,            // company.ltd
    /\.llc$/,            // company.llc
    /\.co\.uk$/,         // company.co.uk
    /\.com\.au$/,        // company.com.au
    /\.de$/,             // company.de (German companies)
    /\.fr$/,             // company.fr (French companies)
    /\.ca$/,             // company.ca (Canadian companies)
    /\.org$/,            // Non-profits and organizations
  ];
  
  // Check if domain matches corporate patterns
  const matchesCorporatePattern = corporatePatterns.some(pattern => 
    pattern.test(domain)
  );
  
  if (matchesCorporatePattern) return true;
  
  // Small company heuristics - if it's a .com domain that's not personal
  if (domain.endsWith('.com') && !personalDomains.includes(domain)) {
    return true; // Will require automated verification
  }
  
  return false;
};

// Enhanced educational domain detection
const isEducationalDomain = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  // Check standard educational domains
  const isEduDomain = EDUCATIONAL_DOMAINS.some(eduDomain => 
    domain.endsWith(eduDomain)
  );
  
  if (isEduDomain) return true;
  
  // Additional educational patterns
  const eduPatterns = [
    /university/i,
    /college/i,
    /school/i,
    /institute/i,
    /academy/i,
  ];
  
  return eduPatterns.some(pattern => pattern.test(domain));
};

// Automated verification for small companies using external APIs
export const verifySmallCompanyDomain = async (
  domain: string, 
  companyName: string
): Promise<{
  isValid: boolean;
  confidence: number;
  companyInfo?: any;
  autoApprove: boolean;
}> => {
  try {
    // Method 1: Check if domain has MX records (indicates real business email)
    const hasMXRecord = await checkMXRecord(domain);
    
    // Method 2: Check domain age (older domains more likely legitimate)
    const domainAge = await checkDomainAge(domain);
    
    // Method 3: Check if company name matches domain
    const nameMatch = checkCompanyNameMatch(domain, companyName);
    
    // Method 4: Check for business website
    const hasWebsite = await checkBusinessWebsite(domain);
    
    // Method 5: Check SSL certificate (businesses usually have SSL)
    const hasSSL = await checkSSLCertificate(domain);
    
    // Calculate confidence score
    let confidence = 0;
    if (hasMXRecord) confidence += 30;
    if (domainAge > 365) confidence += 25; // Domain older than 1 year
    if (nameMatch) confidence += 20;
    if (hasWebsite) confidence += 15;
    if (hasSSL) confidence += 10;
    
    // Auto-approve if confidence is high enough
    const autoApprove = confidence >= 70;
    
    return {
      isValid: confidence >= 50,
      confidence,
      companyInfo: {
        hasMXRecord,
        domainAge,
        nameMatch,
        hasWebsite,
        hasSSL
      },
      autoApprove
    };
  } catch (error) {
    console.error('Error verifying small company domain:', error);
    return {
      isValid: false,
      confidence: 0,
      autoApprove: false
    };
  }
};

// Helper functions for domain verification
const checkMXRecord = async (domain: string): Promise<boolean> => {
  try {
    // In a real implementation, you'd use a DNS lookup service
    // For now, we'll simulate this check
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
    const data = await response.json();
    return data.Answer && data.Answer.length > 0;
  } catch (error) {
    console.error('MX record check failed:', error);
    return false;
  }
};

const checkDomainAge = async (domain: string): Promise<number> => {
  try {
    // In a real implementation, you'd use a WHOIS API service
    // For now, we'll return a simulated age
    return Math.floor(Math.random() * 3650); // Random age up to 10 years
  } catch (error) {
    console.error('Domain age check failed:', error);
    return 0;
  }
};

const checkCompanyNameMatch = (domain: string, companyName: string): boolean => {
  if (!companyName) return false;
  
  // Remove common business suffixes and normalize
  const normalizedCompany = companyName
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
  
  const normalizedDomain = domain
    .replace(/\.(com|net|org|co\.uk|com\.au)$/, '')
    .replace(/[^a-z0-9]/g, '');
  
  // Check if company name is contained in domain or vice versa
  return normalizedDomain.includes(normalizedCompany) || 
         normalizedCompany.includes(normalizedDomain);
};

const checkBusinessWebsite = async (domain: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`https://${domain}`, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

const checkSSLCertificate = async (domain: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`https://${domain}`, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.url.startsWith('https://');
  } catch (error) {
    return false;
  }
};

// Get user's verification status
export const getVerificationStatus = async (userId: string): Promise<VerificationData> => {
  try {
    const verificationRef = firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('verification')
      .doc('current');
    
    const verificationSnap = await verificationRef.get();
    
    if (verificationSnap.exists) {
      const data = verificationSnap.data() as VerificationData;
      
      // Check if verification has expired
      if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
        await verificationRef.update({
          status: 'none',
          expiresAt: null
        });
        return { status: 'none', type: null };
      }
      
      return data;
    }
    
    return { status: 'none', type: null };
  } catch (error) {
    console.error('Error getting verification status:', error);
    return { status: 'none', type: null };
  }
};

// Enhanced email verification with automated small company support
export const submitEmailVerification = async (
  userId: string, 
  email: string, 
  type: VerificationType,
  companyName?: string
): Promise<{ success: boolean; requiresManualReview?: boolean; error?: string; autoApproved?: boolean }> => {
  try {
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (type === 'office') {
      const isValidCorporate = isCorporateDomain(email);
      
      if (!isValidCorporate) {
        return { 
          success: false, 
          error: 'Please use a corporate email address (not personal email like Gmail, Yahoo, etc.)'
        };
      }
      
      // Check if it's a major corporate domain (auto-approve)
      if (APPROVED_CORPORATE_DOMAINS.includes(domain)) {
        await saveVerificationResult(userId, type, email, companyName, 'approved', 'auto');
        return { success: true, requiresManualReview: false, autoApproved: true };
      }
      
      // For small companies, run automated verification
      if (companyName) {
        const verification = await verifySmallCompanyDomain(domain, companyName);
        
        if (verification.autoApprove) {
          await saveVerificationResult(userId, type, email, companyName, 'approved', 'automated');
          return { success: true, requiresManualReview: false, autoApproved: true };
        } else if (verification.isValid) {
          await saveVerificationResult(userId, type, email, companyName, 'pending', 'automated', verification);
          return { success: true, requiresManualReview: true };
        } else {
          return { 
            success: false, 
            error: 'Unable to verify this company domain. Please try document verification instead.' 
          };
        }
      }
    } else if (type === 'student') {
      const isValidEducational = isEducationalDomain(email);
      
      if (!isValidEducational) {
        return { 
          success: false, 
          error: 'Please use an educational email address (.edu domain or university email)'
        };
      }
      
      // Auto-approve educational domains
      await saveVerificationResult(userId, type, email, companyName, 'approved', 'auto');
      return { success: true, requiresManualReview: false, autoApproved: true };
    }
    
    return { success: true, requiresManualReview: true };
  } catch (error) {
    console.error('Error submitting email verification:', error);
    return { success: false, error: 'Failed to submit verification' };
  }
};

// Helper function to save verification results
const saveVerificationResult = async (
  userId: string,
  type: VerificationType,
  email: string,
  companyName?: string,
  status: 'approved' | 'pending' = 'pending',
  method: 'auto' | 'automated' | 'manual' = 'manual',
  verificationData?: any
) => {
  const verificationRef = firebase.firestore()
    .collection('users')
    .doc(userId)
    .collection('verification')
    .doc('current');
  
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
  const data: VerificationData = {
    status,
    type,
    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
    verificationMethod: 'email',
    corporateEmail: email,
    companyName: companyName || '',
    expiresAt: firebase.firestore.Timestamp.fromDate(expiryDate),
    adminNotes: `${method} verification - ${verificationData ? `confidence: ${verificationData.confidence}%` : 'standard process'}`
  };
  
  if (status === 'approved') {
    data.approvedAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  
  await verificationRef.set(data);
};

// Upload document for verification
export const uploadVerificationDocument = async (
  userId: string,
  imageUri: string,
  type: VerificationType,
  companyName?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Upload image to Firebase Storage
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const timestamp = Date.now();
    const storageRef = firebase.storage().ref(`verification/${userId}/${timestamp}.jpg`);
    
    await storageRef.put(blob);
    const downloadURL = await storageRef.getDownloadURL();
    
    // Save verification request to Firestore
    const verificationRef = firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('verification')
      .doc('current');
    
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    const verificationData: VerificationData = {
      status: 'pending',
      type,
      submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
      verificationMethod: 'document',
      documentUrls: [downloadURL],
      companyName: companyName || '',
      expiresAt: firebase.firestore.Timestamp.fromDate(expiryDate)
    };
    
    await verificationRef.set(verificationData);
    
    return { success: true };
  } catch (error) {
    console.error('Error uploading verification document:', error);
    return { success: false, error: 'Failed to upload document' };
  }
};

// Check if user is eligible for discounted pricing
export const isEligibleForDiscount = async (userId: string): Promise<{
  eligible: boolean;
  type?: VerificationType;
  status?: VerificationStatus;
}> => {
  const verification = await getVerificationStatus(userId);
  
  return {
    eligible: verification.status === 'approved',
    type: verification.type || undefined,
    status: verification.status
  };
};

// Cache verification status locally for offline access
export const cacheVerificationStatus = async (userId: string, data: VerificationData) => {
  try {
    await AsyncStorage.setItem(`verification_${userId}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching verification status:', error);
  }
};

// Get cached verification status
export const getCachedVerificationStatus = async (userId: string): Promise<VerificationData | null> => {
  try {
    const cached = await AsyncStorage.getItem(`verification_${userId}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting cached verification status:', error);
    return null;
  }
};

// Add geolocation verification helper (for future use)
export const requestLocationVerification = async (): Promise<{
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  error?: string;
}> => {
  try {
    // This would use expo-location to verify user is at an office location
    // For now, just return a placeholder
    return { error: 'Location verification not implemented yet' };
  } catch (error) {
    return { error: 'Location access denied' };
  }
};

// Add LinkedIn verification helper (for future use)
export const initiateLinkedInVerification = async (): Promise<{
  success: boolean;
  profileUrl?: string;
  error?: string;
}> => {
  try {
    // This would integrate with LinkedIn API to verify employment
    // For now, just return a placeholder
    return { success: false, error: 'LinkedIn verification not implemented yet' };
  } catch (error) {
    return { success: false, error: 'LinkedIn verification failed' };
  }
}; 
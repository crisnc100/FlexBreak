import AsyncStorage from '@react-native-async-storage/async-storage';

interface VerificationRequest {
  userType: 'office' | 'student';
  workArrangement?: 'office' | 'hybrid' | 'remote';
  email: string;
  companyName?: string;
  schoolName?: string;
}

export class AutoVerificationService {
  // More lenient verification - approves 95%+ of legitimate requests
  static async verifyUser(request: VerificationRequest): Promise<{
    approved: boolean;
    confidence: number;
    reason?: string;
  }> {
    // Remote workers are still excluded
    if (request.workArrangement === 'remote') {
      return {
        approved: false,
        confidence: 0,
        reason: 'Remote workers not eligible'
      };
    }

    let confidence = 50; // Start with base confidence

    // Email domain checks (more lenient)
    const domain = request.email.split('@')[1]?.toLowerCase();
    if (!domain) {
      confidence -= 10;
    } else {
      // Educational domains - auto approve
      if (domain.endsWith('.edu') || domain.endsWith('.ac.uk') || domain.endsWith('.edu.au')) {
        confidence = 95;
      }
      // Any corporate-looking domain
      else if (domain.includes('.com') || domain.includes('.org') || domain.includes('.net')) {
        confidence += 20;
      }
      // Has a real domain (not gmail, yahoo, etc)
      else if (!['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)) {
        confidence += 30;
      }
    }

    // Company/School name provided
    if (request.companyName && request.companyName.length > 2) {
      confidence += 15;
    }
    if (request.schoolName && request.schoolName.length > 2) {
      confidence += 15;
    }

    // Work arrangement bonus
    if (request.workArrangement === 'office') {
      confidence += 10;
    } else if (request.workArrangement === 'hybrid') {
      confidence += 5;
    }

    // Lenient threshold - approve at 60% confidence
    const approved = confidence >= 60;

    return {
      approved,
      confidence,
      reason: approved ? 'Verification successful' : 'Additional information needed'
    };
  }

  // Store verification result
  static async saveVerificationResult(
    email: string,
    approved: boolean,
    confidence: number
  ): Promise<void> {
    const verificationData = {
      email,
      approved,
      confidence,
      verifiedAt: new Date().toISOString(),
      status: approved ? 'verified' : 'pending_manual'
    };

    await AsyncStorage.setItem('@flexbreak:verification_status', approved ? 'verified' : 'pending');
    await AsyncStorage.setItem('@flexbreak:verification_data', JSON.stringify(verificationData));
    await AsyncStorage.setItem('@flexbreak:verification_confidence', confidence.toString());
  }

  // Auto-approve pending cases after 2 hours
  static async checkPendingVerifications(): Promise<void> {
    try {
      const dataStr = await AsyncStorage.getItem('@flexbreak:verification_data');
      if (!dataStr) return;

      const data = JSON.parse(dataStr);
      if (data.status === 'pending_manual') {
        const submittedTime = new Date(data.verifiedAt).getTime();
        const currentTime = new Date().getTime();
        const hoursPassed = (currentTime - submittedTime) / (1000 * 60 * 60);

        // Auto-approve after 2 hours
        if (hoursPassed >= 2) {
          await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
          data.status = 'verified';
          data.autoApprovedAt = new Date().toISOString();
          await AsyncStorage.setItem('@flexbreak:verification_data', JSON.stringify(data));
        }
      }
    } catch (error) {
      console.error('Error checking pending verifications:', error);
    }
  }
}

export default AutoVerificationService; 
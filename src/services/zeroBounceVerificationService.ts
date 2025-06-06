const ZeroBounceSDK = require('@zerobounce/zero-bounce-sdk');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ZEROBOUNCE_API_KEY } from '@env';
import { firebaseService } from './firebaseService';

// ZeroBounce API configuration - will be loaded from .env file

// Personal email domains to block immediately (free check)
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'aol.com', 'protonmail.com', 'tutanota.com',
  'mail.com', 'zoho.com', 'yandex.com'
];

// Known disposable email patterns (free check)
const DISPOSABLE_EMAIL_PATTERNS = [
  '10minutemail', 'guerrillamail', 'mailinator', 'tempmail',
  'yopmail', 'throwaway', 'burner', '33mail', 'jetable'
];

export interface EmailVerificationResult {
  status: 'approved' | 'rejected' | 'already_used' | 'error';
  message: string;
  score?: number;
  company?: string;
  details?: {
    email: string;
    domain: string;
    isBusinessEmail: boolean;
    validationScore: number;
    company?: string;
  };
}

export class ZeroBounceVerificationService {
  
  /**
   * Verify if an office worker email is legitimate and unused
   */
  static async verifyOfficeWorkerEmail(email: string): Promise<EmailVerificationResult> {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const domain = cleanEmail.split('@')[1];

      if (!domain) {
        return {
          status: 'rejected',
          message: 'Invalid email format'
        };
      }

      // Step 1: Check if email was already used (Firebase check)
      const isAlreadyUsed = await this.checkEmailReuse(cleanEmail);
      if (isAlreadyUsed) {
        return {
          status: 'already_used',
          message: 'This email has already been verified by another user'
        };
      }

      // Step 2: Quick personal email domain check (free)
      if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
        return {
          status: 'rejected',
          message: 'Personal email addresses are not eligible. Please use your work email.'
        };
      }

      // Step 3: Check for disposable email patterns (free)
      const isDisposable = DISPOSABLE_EMAIL_PATTERNS.some(pattern => 
        domain.includes(pattern)
      );
      
      if (isDisposable) {
        return {
          status: 'rejected',
          message: 'Temporary email addresses are not allowed'
        };
      }

      // Step 4: ZeroBounce validation (paid - 1 credit)
      console.log('Starting ZeroBounce validation for:', cleanEmail);
      const validationResult = await this.validateWithZeroBounce(cleanEmail);
      console.log('ZeroBounce validation result:', validationResult);
      
      if (validationResult.status === 'approved') {
        console.log('Email approved, marking as used...');
        // Mark email as used
        await this.markEmailAsUsed(cleanEmail);
        
        const finalResult = {
          status: 'approved',
          message: 'Office worker verification successful! 60% discount activated.',
          details: {
            email: cleanEmail,
            domain: domain,
            isBusinessEmail: true,
            validationScore: validationResult.score || 100,
            company: validationResult.company
          }
        };
        
        console.log('Returning final approval result:', finalResult);
        return finalResult;
      }

      console.log('Email not approved, returning validation result:', validationResult);
      return validationResult;

    } catch (error) {
      console.error('Email verification error:', error);
      return {
        status: 'error',
        message: 'Verification temporarily unavailable. Please try again later.'
      };
    }
  }

  /**
   * Validate email using ZeroBounce API
   */
  private static async validateWithZeroBounce(email: string): Promise<EmailVerificationResult> {
    try {
      if (!ZEROBOUNCE_API_KEY) {
        console.warn('ZeroBounce API key not configured');
        // Fallback to basic domain validation
        return this.basicDomainValidation(email);
      }

      // Initialize ZeroBounce SDK
      const zeroBounce = new ZeroBounceSDK();
      zeroBounce.init(ZEROBOUNCE_API_KEY);

      const response = await zeroBounce.validateEmail(email);

      console.log('ZeroBounce response:', response);

      // Parse ZeroBounce response
      const { status, sub_status, domain, domain_age_days } = response;
      
      console.log('ZeroBounce parsed values:', { status, sub_status, domain, domain_age_days });

      // Reject invalid emails
      if (status === 'invalid') {
        return {
          status: 'rejected',
          message: 'Email address is invalid or does not exist'
        };
      }

      // Reject problematic email types based on sub_status
      const problematicTypes = ['disposable', 'toxic', 'role_based', 'spamtrap'];
      if (problematicTypes.includes(sub_status)) {
        const messages = {
          disposable: 'Temporary email addresses are not allowed',
          toxic: 'This email domain has been flagged as suspicious',
          role_based: 'Generic role-based emails (info@, admin@) are not eligible',
          spamtrap: 'This email address is not eligible for verification'
        };
        
        return {
          status: 'rejected',
          message: messages[sub_status as keyof typeof messages] || 'Email not eligible'
        };
      }

      // Approve valid business emails with additional validation for catch-all
      if (status === 'valid') {
        console.log('ZeroBounce: Email approved (valid), status:', status);
        // Additional checks for business legitimacy
        const domainAge = parseInt(domain_age_days) || 0;
        const isEstablishedDomain = domainAge > 365; // Domain older than 1 year
        
        const result = {
          status: 'approved',
          message: 'Business email verified successfully',
          score: isEstablishedDomain ? 95 : 75,
          company: this.formatCompanyName(domain)
        };
        
        console.log('ZeroBounce: Returning approval result:', result);
        return result;
      }
      
      // Handle catch-all domains with stricter validation
      if (status === 'catch-all') {
        console.log('ZeroBounce: Catch-all domain detected, applying stricter validation');
        
        // Additional validation for catch-all domains
        const emailValidation = this.validateCatchAllEmail(email, response);
        if (!emailValidation.isValid) {
          return {
            status: 'rejected',
            message: emailValidation.reason
          };
        }
        
        console.log('ZeroBounce: Catch-all email passed additional validation');
        const domainAge = parseInt(domain_age_days) || 0;
        const isEstablishedDomain = domainAge > 365;
        
        const result = {
          status: 'approved',
          message: 'Business email verified successfully (catch-all)',
          score: isEstablishedDomain ? 80 : 60, // Lower score for catch-all
          company: this.formatCompanyName(domain)
        };
        
        console.log('ZeroBounce: Returning catch-all approval result:', result);
        return result;
      }

      // Unknown status - require manual review
      return {
        status: 'rejected',
        message: 'Unable to verify email automatically. Please contact support for manual verification.'
      };

    } catch (error) {
      console.error('ZeroBounce API error:', error);
      
      // Check for specific API errors
      if (error.message && error.message.includes('api_key is invalid')) {
        console.error('ZeroBounce API key is invalid');
        return {
          status: 'error',
          message: 'Email verification service unavailable. Please try again later.'
        };
      }
      
      // Fallback to basic validation for other errors
      return this.basicDomainValidation(email);
    }
  }

  /**
   * Minimal additional validation for catch-all domains
   * We trust ZeroBounce to validate email legitimacy - we just filter obvious test accounts
   */
  private static validateCatchAllEmail(email: string, zeroBounceResponse: any): { isValid: boolean; reason?: string } {
    const emailParts = email.split('@');
    const localPart = emailParts[0]; // The part before @
    const domain = emailParts[1];
    
    console.log('Checking catch-all email for obvious test patterns:', localPart);
    
    // Only reject the most obvious test/fake emails
    // Let ZeroBounce handle the complex validation - that's what we're paying for!
    const obviousTestPatterns = [
      /^[a-z]{8,}$/, // Very long single strings (likely random)
      /^test\d*$/i, // test, test1, test123
      /^fake\d*$/i, // fake, fake1, fake123
      /^demo\d*$/i, // demo, demo1, demo123
      /^temp\d*$/i, // temp, temp1, temp123
      /^[a-z]\d{5,}$/i, // Single letter followed by many numbers
      /^\d+$/, // All numbers
      /^[qwerty]{4,}$/i, // Keyboard mashing
      /^[bcdfgjklmnpqrstvwxz]{6,}$/i, // Very long consonant-only strings
      /^[aeiou]{3,}$/i, // Mostly vowels
      
      // Enhanced patterns to catch specific fake emails like "djdjd.itvsbs"
      /^[bcdfgjklmnpqrstvwxz]{3,}$/, // Consonant-only strings like "djdjd"
      /^[bcdfghjklmnpqrstvwxz]{2,}\.[bcdfghjklmnpqrstvwxz]{2,}$/i, // Two consonant-heavy parts like "djdjd.itvsbs"
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(localPart)) {
        console.log('Caught suspicious pattern:', pattern.source, 'for email:', localPart);
        return {
          isValid: false,
          reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
        };
      }
    }
    
    // Check 1.5: Enhanced validation for dotted email parts
    if (localPart.includes('.')) {
      const parts = localPart.split('.');
      console.log('Analyzing email parts:', parts);
      
      for (const part of parts) {
        // Check if any part looks randomly generated
        const vowels = (part.match(/[aeiou]/gi) || []).length;
        const consonants = (part.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
        const totalLetters = vowels + consonants;
        
        console.log(`Part "${part}": ${vowels} vowels, ${consonants} consonants, ${totalLetters} total`);
        
        // Reject parts with no vowels (except very short ones like initials)
        if (part.length > 2 && vowels === 0) {
          console.log('Rejecting part with no vowels:', part);
          return {
            isValid: false,
            reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
          };
        }
        
        // Reject parts that are too consonant-heavy (be more lenient for surnames)
        // Only flag if there are 6+ consonants to 1 vowel, which is extremely rare in real names
        if (part.length > 5 && totalLetters > 0 && consonants > vowels * 5) {
          console.log('Rejecting part with too many consonants:', part, `(${consonants} consonants vs ${vowels} vowels)`);
          return {
            isValid: false,
            reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
          };
        }
        
        // Reject parts that look like keyboard mashing or random strings
        if (part.length >= 4) {
          // Check for repeated characters or patterns
          const hasRepeatedChars = /(.)\1{2,}/.test(part); // 3+ repeated chars
          
          if (hasRepeatedChars) {
            console.log('Rejecting part with repeated characters:', part);
            return {
              isValid: false,
              reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
            };
          }
          
          // Special check for suspicious consonant clusters (but allow common names)
          const commonNames = ['smith', 'brown', 'clark', 'scott', 'wright', 'adams', 'campbell', 'phillips', 'mitchell', 'borck', 'stark', 'walsh', 'lynch', 'grant', 'cross'];
          const isCommonName = commonNames.includes(part.toLowerCase());
          
          if (!isCommonName) {
            const consonantClusters = part.match(/[bcdfghjklmnpqrstvwxz]{3,}/gi);
            if (consonantClusters && consonantClusters.length > 0) {
              // Check if the clusters look random (like "sdj", "djd", "tvsb")
              const suspiciousClusters = consonantClusters.filter(cluster => {
                // Common letter combinations are OK
                const commonCombos = ['ght', 'sch', 'tch', 'chr', 'thr', 'str', 'spr', 'scr'];
                return !commonCombos.some(combo => cluster.includes(combo));
              });
              
              if (suspiciousClusters.length > 0) {
                console.log('Rejecting part with suspicious consonant clusters:', part, suspiciousClusters);
                return {
                  isValid: false,
                  reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
                };
              }
            }
          }
        }
      }
    } else {
      // For non-dotted emails, apply stricter consonant analysis
      const vowels = (localPart.match(/[aeiou]/gi) || []).length;
      const consonants = (localPart.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
      const totalLetters = vowels + consonants;
      
      console.log(`Single part "${localPart}": ${vowels} vowels, ${consonants} consonants, ${totalLetters} total`);
      
      if (localPart.length > 3 && totalLetters > 0) {
        // For single-part emails, be more strict about vowel ratio
        if (vowels === 0) {
          console.log('Rejecting single part with no vowels:', localPart);
          return {
            isValid: false,
            reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
          };
        }
        
        if (consonants > vowels * 3) {
          console.log('Rejecting single part with too many consonants:', localPart, `(${consonants} consonants vs ${vowels} vowels)`);
          return {
            isValid: false,
            reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
          };
        }
      }
    }
    
    // Check 2: Require reasonable name patterns for catch-all domains
    const validPatterns = [
      /^[a-z]{2,12}\.[a-z]{2,12}$/i, // firstname.lastname (reasonable lengths)
      /^[a-z]{3,20}$/i, // single name (reasonable length, common for some companies)
      /^[a-z]{2,12}\.[a-z]$/i, // firstname.l
      /^[a-z]\.[a-z]{2,12}$/i, // f.lastname
      /^[a-z]{3,12}\d{1,3}$/i, // name with reasonable number (john1, mary23)
    ];
    
    let hasValidPattern = false;
    for (const pattern of validPatterns) {
      if (pattern.test(localPart)) {
        hasValidPattern = true;
        break;
      }
    }
    
    if (!hasValidPattern) {
      console.log('No valid pattern found for:', localPart);
      return {
        isValid: false,
        reason: 'Please use your full work email address (e.g., firstname.lastname@company.com)'
      };
    }
    
    // Check 3: Additional name-like validation
    if (localPart.includes('.')) {
      const parts = localPart.split('.');
      for (const part of parts) {
        // Each part should look like a real name (contain vowels, reasonable consonant/vowel ratio)
        const vowels = (part.match(/[aeiou]/gi) || []).length;
        const length = part.length;
        
        if (length > 2 && vowels === 0) {
          console.log('Rejecting name part with no vowels:', part);
          return {
            isValid: false,
            reason: 'Email format appears invalid. Please use your actual work email address.'
          };
        }
        
        // Very short parts (1-2 chars) are ok for initials
        if (length > 2 && vowels / length < 0.2) {
          console.log('Rejecting name part with too few vowels:', part);
          return {
            isValid: false,
            reason: 'Email format appears invalid. Please use your actual work email address.'
          };
        }
      }
    }
    
    // Check 3: Use ZeroBounce additional data for more validation
    const { firstname, lastname, account } = zeroBounceResponse;
    
    // If ZeroBounce provides name data, check if it matches reasonable patterns
    if (firstname && lastname) {
      const fullName = `${firstname}.${lastname}`.toLowerCase();
      const reverseName = `${lastname}.${firstname}`.toLowerCase();
      
      // Check if email matches the detected name pattern
      if (localPart.toLowerCase() !== fullName && 
          localPart.toLowerCase() !== reverseName &&
          localPart.toLowerCase() !== firstname.toLowerCase() &&
          localPart.toLowerCase() !== lastname.toLowerCase() &&
          localPart.toLowerCase() !== account.toLowerCase()) {
        
        return {
          isValid: false,
          reason: `Email format doesn't match expected pattern. For manual verification, contact support.`
        };
      }
    }
    
    return { isValid: true };
  }

  /**
   * Fallback basic domain validation (when ZeroBounce is unavailable)
   */
  private static async basicDomainValidation(email: string): Promise<EmailVerificationResult> {
    const domain = email.split('@')[1];
    
    // Very basic checks
    const suspiciousPatterns = ['test', 'fake', 'example', 'temp'];
    const isSuspicious = suspiciousPatterns.some(pattern => domain.includes(pattern));
    
    if (isSuspicious) {
      return {
        status: 'rejected',
        message: 'Domain appears to be invalid'
      };
    }

    // For unknown domains, approve but with lower confidence
    return {
      status: 'approved',
      message: 'Email approved (basic validation)',
      score: 60
    };
  }

  /**
   * Check if email has been used before (globally across all devices)
   */
  private static async checkEmailReuse(email: string): Promise<boolean> {
    try {
      // Check Firestore for global email usage using the robust Firebase service
      const emailExistsInFirebase = await firebaseService.checkEmailExists(email);
      if (emailExistsInFirebase) {
        console.log('Email already used globally:', email);
        return true;
      }
      
      // Always check local storage as backup/primary
      const usedEmails = await AsyncStorage.getItem('@flexbreak:verified_emails');
      const emailList: string[] = usedEmails ? JSON.parse(usedEmails) : [];
      return emailList.includes(email.toLowerCase());
    } catch (error) {
      console.warn('Error checking email reuse, falling back to local storage:', error.message);
      
      // Fallback to local storage only if all else fails
      try {
        const usedEmails = await AsyncStorage.getItem('@flexbreak:verified_emails');
        const emailList: string[] = usedEmails ? JSON.parse(usedEmails) : [];
        return emailList.includes(email.toLowerCase());
      } catch (localError) {
        console.error('Error checking local email reuse:', localError);
        return false;
      }
    }
  }

  /**
   * Mark email as used to prevent reuse (globally across all devices)
   */
  private static async markEmailAsUsed(email: string): Promise<void> {
    try {
      const cleanEmail = email.toLowerCase();
      const timestamp = new Date().toISOString();
      
      console.log('Starting markEmailAsUsed for:', cleanEmail);
      
      // Store in Firestore for global prevention using the robust Firebase service
      console.log('Attempting Firebase storage...');
      const firebaseStored = await firebaseService.storeEmail(cleanEmail, 'office');
      console.log('Firebase storage result:', firebaseStored);
      
      // Always store locally for offline access and user verification status
      console.log('Starting local storage...');
      const usedEmails = await AsyncStorage.getItem('@flexbreak:verified_emails');
      const emailList: string[] = usedEmails ? JSON.parse(usedEmails) : [];
      
      if (!emailList.includes(cleanEmail)) {
        emailList.push(cleanEmail);
        await AsyncStorage.setItem('@flexbreak:verified_emails', JSON.stringify(emailList));
        console.log('Email added to local list');
      } else {
        console.log('Email already in local list');
      }
      
      // Store verification details locally for this user
      console.log('Storing verification details...');
      await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
      await AsyncStorage.setItem('@flexbreak:user_type', 'office');
      await AsyncStorage.setItem('@flexbreak:user_email', cleanEmail);
      await AsyncStorage.setItem('@flexbreak:verification_method', firebaseStored ? 'zerobounce' : 'zerobounce_local');
      await AsyncStorage.setItem('@flexbreak:verification_date', timestamp);
      
      console.log('Email verification stored successfully - COMPLETE');
      
    } catch (error) {
      console.error('Error marking email as used:', error);
      
      // Final fallback to local storage only
      console.log('Using final fallback...');
      try {
        const usedEmails = await AsyncStorage.getItem('@flexbreak:verified_emails');
        const emailList: string[] = usedEmails ? JSON.parse(usedEmails) : [];
        
        if (!emailList.includes(email.toLowerCase())) {
          emailList.push(email.toLowerCase());
          await AsyncStorage.setItem('@flexbreak:verified_emails', JSON.stringify(emailList));
          
          // Store verification details locally
          await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
          await AsyncStorage.setItem('@flexbreak:user_type', 'office');
          await AsyncStorage.setItem('@flexbreak:user_email', email.toLowerCase());
          await AsyncStorage.setItem('@flexbreak:verification_method', 'zerobounce_fallback');
          await AsyncStorage.setItem('@flexbreak:verification_date', new Date().toISOString());
        }
        console.log('Email verification stored with local fallback - COMPLETE');
      } catch (localError) {
        console.error('Error with local storage fallback:', localError);
        throw new Error('Failed to store verification data');
      }
    }
  }

  /**
   * Get verification status for current user
   */
  static async getVerificationStatus(): Promise<{
    isVerified: boolean;
    userType?: string;
    email?: string;
    verificationDate?: string;
  }> {
    try {
      const status = await AsyncStorage.getItem('@flexbreak:verification_status');
      const userType = await AsyncStorage.getItem('@flexbreak:user_type');
      const email = await AsyncStorage.getItem('@flexbreak:user_email');
      const date = await AsyncStorage.getItem('@flexbreak:verification_date');

      return {
        isVerified: status === 'verified',
        userType: userType || undefined,
        email: email || undefined,
        verificationDate: date || undefined
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return { isVerified: false };
    }
  }

  /**
   * Clear verification status (for testing)
   */
  static async clearVerificationStatus(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        '@flexbreak:verification_status',
        '@flexbreak:user_type',
        '@flexbreak:user_email',
        '@flexbreak:verification_method',
        '@flexbreak:verification_date'
      ]);
    } catch (error) {
      console.error('Error clearing verification status:', error);
    }
  }

  /**
   * Format company name from domain
   */
  private static formatCompanyName(domain: string): string {
    // Remove common TLDs and format as company name
    const name = domain
      .replace(/\.(com|org|net|edu|gov)$/, '')
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return name;
  }
}

export default ZeroBounceVerificationService;
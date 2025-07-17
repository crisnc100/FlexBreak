import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
const ZeroBounceSDK = require('@zerobounce/zero-bounce-sdk');

// Define environment variables with defaults to prevent deployment errors
const zeroBounceApiKey = defineString("ZEROBOUNCE_API_KEY", { default: "" });

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

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

interface EmailVerificationResult {
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

/**
 * Secure email verification endpoint that keeps ZeroBounce API key server-side
 */
export const verifyOfficeWorkerEmail = onCall(async (request): Promise<EmailVerificationResult> => {
  const { email } = request.data;
  
  // For anonymous users, create a simple identifier
  const userId = request.auth?.uid || 'anonymous';
  
  if (!email || typeof email !== 'string') {
    throw new HttpsError('invalid-argument', 'Email is required');
  }

  const cleanEmail = email.toLowerCase().trim();
  
  try {
    // Step 1: Check if email was already used
    const existingUser = await admin.firestore()
      .collection('verified_emails')
      .where('email', '==', cleanEmail)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      return {
        status: 'already_used',
        message: 'This email has already been verified by another user.',
        details: {
          email: cleanEmail,
          domain: cleanEmail.split('@')[1],
          isBusinessEmail: false,
          validationScore: 0
        }
      };
    }

    // Step 2: Quick free checks
    const domain = cleanEmail.split('@')[1];
    
    // Check for personal email domains
    if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
      return {
        status: 'rejected',
        message: 'Personal email addresses are not allowed. Please use your work email.',
        details: {
          email: cleanEmail,
          domain: domain,
          isBusinessEmail: false,
          validationScore: 0
        }
      };
    }

    // Check for disposable email patterns
    const isDisposable = DISPOSABLE_EMAIL_PATTERNS.some(pattern => 
      domain.includes(pattern) || cleanEmail.includes(pattern)
    );

    if (isDisposable) {
      return {
        status: 'rejected',
        message: 'Temporary/disposable email addresses are not allowed.',
        details: {
          email: cleanEmail,
          domain: domain,
          isBusinessEmail: false,
          validationScore: 0
        }
      };
    }

    // Step 3: Enhanced validation with ZeroBounce (paid API)
    const apiKey = zeroBounceApiKey.value();
    if (apiKey && apiKey.trim() !== '') {
      try {
        console.log(`Performing ZeroBounce validation for: ${cleanEmail}`);
        
        ZeroBounceSDK.init(apiKey);

        const zbResponse = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('ZeroBounce API timeout'));
          }, 10000); // 10 second timeout
          
          ZeroBounceSDK.validate(cleanEmail, (err: any, response: any) => {
            clearTimeout(timeout);
            if (err) {
              console.error('ZeroBounce error:', err);
              reject(err);
            } else {
              console.log('ZeroBounce response:', response);
              resolve(response);
            }
          });
        });

      const validation = zbResponse as any;

      // ZeroBounce status interpretation
      if (validation.status === 'valid' && validation.sub_status !== 'role_based') {
        // Store verified email (Admin SDK has full privileges)
        await admin.firestore().collection('verified_emails').add({
          email: cleanEmail,
          userId: userId,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          domain: domain,
          company: validation.domain_age_days ? domain : undefined,
          score: validation.zerobounce_credits_used || 1
        });

        return {
          status: 'approved',
          message: 'Email verified successfully! Welcome to FlexBreak Premium.',
          score: validation.zerobounce_credits_used || 1,
          company: validation.domain_age_days ? domain : undefined,
          details: {
            email: cleanEmail,
            domain: domain,
            isBusinessEmail: true,
            validationScore: validation.zerobounce_credits_used || 1,
            company: validation.domain_age_days ? domain : undefined
          }
        };
      } else {
        return {
          status: 'rejected',
          message: 'This email could not be verified as a valid business email.',
          details: {
            email: cleanEmail,
            domain: domain,
            isBusinessEmail: false,
            validationScore: 0
          }
        };
      }
      } catch (zbError) {
        console.error('ZeroBounce validation failed, falling back to basic validation:', zbError);
        // Fall through to basic validation below
      }
    }
    
    // Always perform basic validation as fallback
    console.log(`Using basic validation for: ${cleanEmail}`);
    const isLikelyBusiness = !PERSONAL_EMAIL_DOMAINS.includes(domain) && 
                            domain.includes('.') && 
                            !domain.includes('test') &&
                            !domain.includes('example');

    if (isLikelyBusiness) {
      // Store verified email (Admin SDK has full privileges)
      await admin.firestore().collection('verified_emails').add({
        email: cleanEmail,
        userId: userId,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        domain: domain,
        company: domain,
        score: 0
      });

      return {
        status: 'approved',
        message: 'Email verified successfully! Welcome to FlexBreak Premium.',
        company: domain,
        details: {
          email: cleanEmail,
          domain: domain,
          isBusinessEmail: true,
          validationScore: 0,
          company: domain
        }
      };
    }
    
    return {
      status: 'rejected',
      message: 'Please use a valid business email address.',
      details: {
        email: cleanEmail,
        domain: domain,
        isBusinessEmail: false,
        validationScore: 0
      }
    };

  } catch (error: any) {
    console.error('Email verification error:', error);
    throw new HttpsError('internal', 'Unable to verify email at this time');
  }
});
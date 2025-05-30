/**
 * Email Verification Service
 * Sends verification codes to user's email to prove they own it
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EmailVerificationData {
  email: string;
  userType: 'student' | 'office';
  code: string;
  sentAt: string;
  verified: boolean;
  expiresAt: string;
}

export class EmailVerificationService {
  
  /**
   * Step 1: Send verification code to user's email
   * This proves they own the email address
   */
  static async sendVerificationCode(
    email: string, 
    userType: 'student' | 'office'
  ): Promise<{ success: boolean; message: string; waitTime?: number }> {
    try {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain) {
        return {
          success: false,
          message: 'Invalid email address.'
        };
      }

      // ONLY allow business/education emails to get verification codes
      const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
      if (personalDomains.includes(domain)) {
        return {
          success: false,
          message: 'Personal email addresses require manual verification. Please email flexbreakapp@gmail.com with your details.'
        };
      }

      // Check if email is already verified
      const existingUsers = await AsyncStorage.getItem('@flexbreak:verified_emails');
      const usedEmails: string[] = existingUsers ? JSON.parse(existingUsers) : [];
      
      if (usedEmails.includes(email.toLowerCase())) {
        return {
          success: false,
          message: 'This email has already been verified by another user.'
        };
      }

      // Check rate limiting (1 code per 5 minutes per email)
      const lastSent = await AsyncStorage.getItem(`@flexbreak:last_code_${email}`);
      if (lastSent) {
        const timeSince = Date.now() - parseInt(lastSent);
        const waitTime = Math.max(0, 300000 - timeSince); // 5 minutes
        
        if (waitTime > 0) {
          return {
            success: false,
            message: `Please wait ${Math.ceil(waitTime / 60000)} minutes before requesting another code.`,
            waitTime: Math.ceil(waitTime / 1000)
          };
        }
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store verification data
      const verificationData: EmailVerificationData = {
        email: email.toLowerCase(),
        userType,
        code,
        sentAt: new Date().toISOString(),
        verified: false,
        expiresAt: expiresAt.toISOString()
      };
      
      await AsyncStorage.setItem(`@flexbreak:email_verification_${email}`, JSON.stringify(verificationData));
      await AsyncStorage.setItem(`@flexbreak:last_code_${email}`, Date.now().toString());
      
      // In a real app, you'd send the email via your backend
      // For now, we'll simulate it
      const emailContent = this.generateVerificationEmail(email, code, userType);
      
      // TODO: Replace with actual email sending service
      console.log('EMAIL TO SEND:', emailContent);
      
      // For development, you could use a service like EmailJS or your backend
      return {
        success: true,
        message: `Verification code sent to ${email}. Please check your inbox and enter the 6-digit code.`
      };
      
    } catch (error) {
      console.error('Error sending verification code:', error);
      return {
        success: false,
        message: 'Failed to send verification code. Please try again.'
      };
    }
  }

  /**
   * Step 2: Verify the code user entered
   */
  static async verifyEmailCode(
    email: string,
    enteredCode: string
  ): Promise<{ success: boolean; message: string; userType?: 'student' | 'office' }> {
    try {
      const verificationData = await AsyncStorage.getItem(`@flexbreak:email_verification_${email}`);
      
      if (!verificationData) {
        return {
          success: false,
          message: 'No verification code found. Please request a new code.'
        };
      }
      
      const data: EmailVerificationData = JSON.parse(verificationData);
      
      // Check if code expired
      if (new Date() > new Date(data.expiresAt)) {
        await AsyncStorage.removeItem(`@flexbreak:email_verification_${email}`);
        return {
          success: false,
          message: 'Verification code expired. Please request a new code.'
        };
      }
      
      // Check if code matches
      if (data.code !== enteredCode.trim()) {
        return {
          success: false,
          message: 'Invalid verification code. Please check and try again.'
        };
      }
      
      // SUCCESS: Email verified
      // Add to verified emails list
      const existingUsers = await AsyncStorage.getItem('@flexbreak:verified_emails');
      const usedEmails: string[] = existingUsers ? JSON.parse(existingUsers) : [];
      usedEmails.push(email.toLowerCase());
      await AsyncStorage.setItem('@flexbreak:verified_emails', JSON.stringify(usedEmails));
      
      // Apply verification
      await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
      await AsyncStorage.setItem('@flexbreak:user_type', data.userType);
      await AsyncStorage.setItem('@flexbreak:user_email', email);
      await AsyncStorage.setItem('@flexbreak:verification_method', 'email_verified');
      await AsyncStorage.setItem('@flexbreak:verified_at', new Date().toISOString());
      
      // Clean up
      await AsyncStorage.removeItem(`@flexbreak:email_verification_${email}`);
      
      return {
        success: true,
        message: `✅ Email verified! Your ${data.userType} discount is now active.`,
        userType: data.userType
      };
      
    } catch (error) {
      console.error('Error verifying email code:', error);
      return {
        success: false,
        message: 'Error verifying code. Please try again.'
      };
    }
  }

  /**
   * Generate email content for verification
   */
  private static generateVerificationEmail(email: string, code: string, userType: 'student' | 'office'): string {
    return `
To: ${email}
Subject: FlexBreak Verification Code - ${code}

Hi!

Your FlexBreak ${userType} verification code is:

${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Thanks,
FlexBreak Team
    `.trim();
  }

  /**
   * Get template for support email when user needs manual verification
   */
  static generateManualVerificationEmail(email: string, userType: 'student' | 'office'): string {
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    return `Subject: FlexBreak Manual Verification - ${userType.toUpperCase()} - ${requestId}

Hi FlexBreak Support,

I'm requesting manual verification for the ${userType} discount.

REQUEST DETAILS:
- Email: ${email}
- Type: ${userType === 'student' ? 'Student' : 'Office/Hybrid Worker'}
- Request ID: ${requestId}

${userType === 'student' 
  ? `STUDENT VERIFICATION:
- School/University: [Please specify your school name]
- Student ID: [Optional - helps with verification]
- Enrollment Status: [Current semester/year]
- Student Email: ${email}`
  : `OFFICE WORKER VERIFICATION:
- Company Name: [Please specify your company]
- Job Title: [Your position]
- Work Arrangement: [Office/Hybrid - how many days in office]
- Work Email: ${email}
- LinkedIn Profile: [Optional - helps with verification]`
}

Please review my information and provide a verification code if I qualify for the ${userType} discount.

Thank you!`;
  }
}

export default EmailVerificationService;
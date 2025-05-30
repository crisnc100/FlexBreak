/**
 * Pre-Generated Verification Codes
 * One-time codes for manual verification by flexbreakapp@gmail.com
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PreGeneratedCode {
  code: string;
  userType: 'student' | 'office';
  used: boolean;
  usedBy?: string;
  usedAt?: string;
  generatedAt: string;
}

export class PreGeneratedCodes {
  
  /**
   * Pre-generated codes for you to use manually
   * Generate these once and use them for manual verifications
   */
  private static readonly STUDENT_CODES = [
    'STUDENT-A7B9K3', 'STUDENT-X2M8P6', 'STUDENT-F4N7Q1', 'STUDENT-W9R5T2',
    'STUDENT-C6H3L8', 'STUDENT-Z1Y4V7', 'STUDENT-D8S2M9', 'STUDENT-K5P1X6',
    'STUDENT-G3Q7B4', 'STUDENT-N8F2R5', 'STUDENT-J4W9L1', 'STUDENT-T7V3H6',
    'STUDENT-B2X8K4', 'STUDENT-M9P5Q3', 'STUDENT-R1N7F8', 'STUDENT-L6C4W2',
    'STUDENT-V3T9X5', 'STUDENT-H8L1P7', 'STUDENT-Y4K6M3', 'STUDENT-Q2R8B9',
    'STUDENT-E7V1N4', 'STUDENT-S3W6T8', 'STUDENT-F9H2L5', 'STUDENT-X6Q3K7',
    'STUDENT-P8M1R4', 'STUDENT-C5T7Y2', 'STUDENT-N1V9H6', 'STUDENT-W4B3Q8',
    'STUDENT-L7X2M5', 'STUDENT-K9P6F1', 'STUDENT-G4R8T3', 'STUDENT-Z2N7V9',
    'STUDENT-D6W1L4', 'STUDENT-J8H5X2', 'STUDENT-T3Q7M6', 'STUDENT-B9F4P1',
    'STUDENT-R5C8K3', 'STUDENT-Y1T6W7', 'STUDENT-N4V2H9', 'STUDENT-M7L3Q5',
    'STUDENT-X8P1F6', 'STUDENT-K2R9T4', 'STUDENT-W6H7B3', 'STUDENT-Q4N1V8',
    'STUDENT-F7M2X5', 'STUDENT-C9L6P3', 'STUDENT-T1W4K7', 'STUDENT-R8V5H2',
    'STUDENT-P3Q9M6', 'STUDENT-N1X7F4'
  ];

  private static readonly OFFICE_CODES = [
    'OFFICE-M3N8T5', 'OFFICE-K7R2P9', 'OFFICE-W1F6L4', 'OFFICE-Q4X7H3',
    'OFFICE-B8V2M6', 'OFFICE-T5N1K9', 'OFFICE-R7P4W2', 'OFFICE-L3F8Q6',
    'OFFICE-X9H5T1', 'OFFICE-C2M7V4', 'OFFICE-N6K3P8', 'OFFICE-W4R9L5',
    'OFFICE-F1Q6X3', 'OFFICE-T8V7M2', 'OFFICE-P5H1N9', 'OFFICE-K3W6R4',
    'OFFICE-L9F2T7', 'OFFICE-M6X4Q1', 'OFFICE-H8P3V5', 'OFFICE-R2N7K6',
    'OFFICE-Q1W9F4', 'OFFICE-T6L3X8', 'OFFICE-V5M2P7', 'OFFICE-K9H1R3',
    'OFFICE-N4F6W2', 'OFFICE-X7Q8T5', 'OFFICE-P1V4M9', 'OFFICE-L6R3H7',
    'OFFICE-F2K8Q4', 'OFFICE-W9T1N6', 'OFFICE-M5X7P3', 'OFFICE-H4V2L8',
    'OFFICE-R6F9K1', 'OFFICE-Q3N5T7', 'OFFICE-T8W2X4', 'OFFICE-P7L6M9',
    'OFFICE-K1V3H5', 'OFFICE-F4R8Q2', 'OFFICE-N9X6T1', 'OFFICE-W3M7P4',
    'OFFICE-L8K2V6', 'OFFICE-H5Q1F9', 'OFFICE-T2N4X7', 'OFFICE-R6P8M3',
    'OFFICE-V1W5K9', 'OFFICE-Q7F2L4', 'OFFICE-X3T6H8', 'OFFICE-M4R1P5',
    'OFFICE-N8K7W2', 'OFFICE-F6V3Q9'
  ];

  /**
   * Initialize the code storage if not already done
   */
  static async initializeCodes(): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem('@flexbreak:pregGenerated_codes');
      if (existing) return; // Already initialized
      
      const allCodes: PreGeneratedCode[] = [
        ...this.STUDENT_CODES.map(code => ({
          code,
          userType: 'student' as const,
          used: false,
          generatedAt: new Date().toISOString()
        })),
        ...this.OFFICE_CODES.map(code => ({
          code,
          userType: 'office' as const,
          used: false,
          generatedAt: new Date().toISOString()
        }))
      ];
      
      await AsyncStorage.setItem('@flexbreak:pregenerated_codes', JSON.stringify(allCodes));
      console.log('Pre-generated codes initialized successfully');
    } catch (error) {
      console.error('Error initializing pre-generated codes:', error);
    }
  }

  /**
   * User redeems a pre-generated code
   */
  static async redeemCode(
    enteredCode: string,
    userEmail: string
  ): Promise<{ success: boolean; message: string; userType?: 'student' | 'office' }> {
    try {
      await this.initializeCodes();
      
      const codesData = await AsyncStorage.getItem('@flexbreak:pregenerated_codes');
      if (!codesData) {
        return { success: false, message: 'Code system not initialized.' };
      }
      
      const codes: PreGeneratedCode[] = JSON.parse(codesData);
      const codeIndex = codes.findIndex(c => c.code === enteredCode.trim().toUpperCase());
      
      if (codeIndex === -1) {
        return { success: false, message: 'Invalid verification code.' };
      }
      
      const codeData = codes[codeIndex];
      
      if (codeData.used) {
        return { 
          success: false, 
          message: 'This verification code has already been used.' 
        };
      }
      
      // Check if email is already used
      const existingUsers = await AsyncStorage.getItem('@flexbreak:verified_emails');
      const usedEmails: string[] = existingUsers ? JSON.parse(existingUsers) : [];
      
      if (usedEmails.includes(userEmail.toLowerCase())) {
        return {
          success: false,
          message: 'This email has already been verified by another user.'
        };
      }
      
      // Mark code as used
      codes[codeIndex] = {
        ...codeData,
        used: true,
        usedBy: userEmail.toLowerCase(),
        usedAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('@flexbreak:pregenerated_codes', JSON.stringify(codes));
      
      // Add email to used list
      usedEmails.push(userEmail.toLowerCase());
      await AsyncStorage.setItem('@flexbreak:verified_emails', JSON.stringify(usedEmails));
      
      // Apply verification
      await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
      await AsyncStorage.setItem('@flexbreak:user_type', codeData.userType);
      await AsyncStorage.setItem('@flexbreak:user_email', userEmail);
      await AsyncStorage.setItem('@flexbreak:verification_method', 'pregenerated_code');
      await AsyncStorage.setItem('@flexbreak:verified_at', new Date().toISOString());
      
      return {
        success: true,
        message: `✅ Verification successful! Your ${codeData.userType} discount is now active.`,
        userType: codeData.userType
      };
      
    } catch (error) {
      console.error('Error redeeming pre-generated code:', error);
      return {
        success: false,
        message: 'Error processing verification code. Please try again.'
      };
    }
  }

  /**
   * Get available codes for admin reference
   * You can use this to see which codes are still available
   */
  static async getAvailableCodes(): Promise<{
    student: string[];
    office: string[];
    totalUsed: number;
  }> {
    try {
      await this.initializeCodes();
      
      const codesData = await AsyncStorage.getItem('@flexbreak:pregenerated_codes');
      if (!codesData) {
        return { student: [], office: [], totalUsed: 0 };
      }
      
      const codes: PreGeneratedCode[] = JSON.parse(codesData);
      
      const availableStudent = codes
        .filter(c => c.userType === 'student' && !c.used)
        .map(c => c.code);
        
      const availableOffice = codes
        .filter(c => c.userType === 'office' && !c.used)
        .map(c => c.code);
        
      const totalUsed = codes.filter(c => c.used).length;
      
      return {
        student: availableStudent,
        office: availableOffice,
        totalUsed
      };
    } catch (error) {
      console.error('Error getting available codes:', error);
      return { student: [], office: [], totalUsed: 0 };
    }
  }

  /**
   * YOUR REFERENCE: Manual verification workflow
   */
  static getManualVerificationInstructions(): string {
    return `
📧 MANUAL VERIFICATION WORKFLOW:

WHEN USER EMAILS YOU AT flexbreakapp@gmail.com:

1. READ THEIR EMAIL:
   - Check if they're student or office worker
   - Look for school name / company name
   - Verify their details make sense

2. IF YOU APPROVE:
   - Reply with a code from the list below
   - Student codes: STUDENT-XXXXXX
   - Office codes: OFFICE-XXXXXX

3. EMAIL TEMPLATE:
   "Hi! You've been approved for the FlexBreak discount.
   
   Use this verification code in the app:
   [CODE HERE]
   
   Go to: FlexBreak > Premium > Enter Code
   
   Your 60% discount will activate immediately!
   
   Thanks,
   FlexBreak Support"

4. EACH CODE ONLY WORKS ONCE
   - After user enters it, code becomes invalid
   - No need to track which codes you've sent

CURRENT AVAILABLE CODES:
- Student codes: ${this.STUDENT_CODES.length} available
- Office codes: ${this.OFFICE_CODES.length} available
- Total: ${this.STUDENT_CODES.length + this.OFFICE_CODES.length} codes

NOTE: If you run out of codes, contact developer for more.
    `;
  }
}

export default PreGeneratedCodes;
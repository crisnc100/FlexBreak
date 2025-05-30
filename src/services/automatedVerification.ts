import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { VerificationType, VerificationData } from './verificationService';

// AI-powered document verification service
export interface DocumentAnalysisResult {
  isValid: boolean;
  confidence: number;
  documentType: 'company_id' | 'student_id' | 'employment_letter' | 'enrollment_letter' | 'unknown';
  extractedText: string[];
  qualityScore: number;
  autoApprove: boolean;
  flags: string[];
}

// Automated document analysis using multiple techniques
export const analyzeDocument = async (
  imageUri: string,
  verificationType: VerificationType,
  companyName?: string
): Promise<DocumentAnalysisResult> => {
  try {
    // Step 1: Image quality analysis
    const qualityScore = await analyzeImageQuality(imageUri);
    
    // Step 2: Text extraction (OCR simulation)
    const extractedText = await extractTextFromImage(imageUri);
    
    // Step 3: Document type detection
    const documentType = detectDocumentType(extractedText, verificationType);
    
    // Step 4: Content validation
    const contentValidation = validateDocumentContent(
      extractedText, 
      documentType, 
      verificationType, 
      companyName
    );
    
    // Step 5: Calculate overall confidence
    const confidence = calculateConfidenceScore(
      qualityScore,
      contentValidation,
      documentType,
      extractedText
    );
    
    // Step 6: Determine if auto-approval is possible
    const autoApprove = confidence >= 85 && qualityScore >= 70 && contentValidation.isValid;
    
    return {
      isValid: confidence >= 60,
      confidence,
      documentType,
      extractedText,
      qualityScore,
      autoApprove,
      flags: contentValidation.flags
    };
  } catch (error) {
    console.error('Error analyzing document:', error);
    return {
      isValid: false,
      confidence: 0,
      documentType: 'unknown',
      extractedText: [],
      qualityScore: 0,
      autoApprove: false,
      flags: ['analysis_error']
    };
  }
};

// Image quality analysis
const analyzeImageQuality = async (imageUri: string): Promise<number> => {
  try {
    // In a real implementation, you'd use image processing libraries
    // For now, we'll simulate quality analysis based on file size and format
    
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    let score = 50; // Base score
    
    // Check file size (too small = poor quality, too large = good quality)
    if (blob.size > 500000) score += 20; // > 500KB
    if (blob.size > 1000000) score += 10; // > 1MB
    if (blob.size < 100000) score -= 20; // < 100KB
    
    // Check file type
    if (blob.type.includes('jpeg') || blob.type.includes('jpg')) score += 10;
    if (blob.type.includes('png')) score += 15;
    if (blob.type.includes('webp')) score += 5;
    
    return Math.min(100, Math.max(0, score));
  } catch (error) {
    return 30; // Low quality if we can't analyze
  }
};

// Text extraction simulation (in real app, use OCR service like Google Vision API)
const extractTextFromImage = async (imageUri: string): Promise<string[]> => {
  try {
    // Simulate OCR text extraction
    // In a real implementation, you'd use Google Vision API, AWS Textract, or similar
    
    // For demo purposes, return simulated text based on common document patterns
    const simulatedTexts = [
      // Company ID patterns
      'EMPLOYEE ID CARD',
      'COMPANY NAME INC',
      'EMPLOYEE NAME',
      'DEPARTMENT',
      'VALID UNTIL',
      
      // Student ID patterns
      'STUDENT IDENTIFICATION',
      'UNIVERSITY NAME',
      'STUDENT ID',
      'ACADEMIC YEAR',
      'EXPIRES',
      
      // Employment letter patterns
      'EMPLOYMENT VERIFICATION',
      'TO WHOM IT MAY CONCERN',
      'EMPLOYED AS',
      'EFFECTIVE DATE',
      'HUMAN RESOURCES',
      
      // Enrollment letter patterns
      'ENROLLMENT VERIFICATION',
      'REGISTRAR OFFICE',
      'ENROLLED IN',
      'SEMESTER',
      'ACADEMIC STANDING'
    ];
    
    // Return random subset to simulate OCR results
    const numTexts = Math.floor(Math.random() * 5) + 3;
    return simulatedTexts.slice(0, numTexts);
  } catch (error) {
    return [];
  }
};

// Document type detection based on extracted text
const detectDocumentType = (
  extractedText: string[], 
  verificationType: VerificationType
): DocumentAnalysisResult['documentType'] => {
  const text = extractedText.join(' ').toLowerCase();
  
  if (verificationType === 'office') {
    if (text.includes('employee') && text.includes('id')) return 'company_id';
    if (text.includes('employment') && text.includes('verification')) return 'employment_letter';
  } else if (verificationType === 'student') {
    if (text.includes('student') && text.includes('id')) return 'student_id';
    if (text.includes('enrollment') && text.includes('verification')) return 'enrollment_letter';
  }
  
  return 'unknown';
};

// Content validation
const validateDocumentContent = (
  extractedText: string[],
  documentType: DocumentAnalysisResult['documentType'],
  verificationType: VerificationType,
  companyName?: string
) => {
  const text = extractedText.join(' ').toLowerCase();
  const flags: string[] = [];
  let isValid = false;
  let score = 0;
  
  // Basic validation based on document type
  switch (documentType) {
    case 'company_id':
      if (text.includes('employee')) score += 25;
      if (text.includes('company') || text.includes('corp')) score += 25;
      if (text.includes('id') || text.includes('identification')) score += 20;
      if (companyName && text.includes(companyName.toLowerCase())) score += 30;
      break;
      
    case 'student_id':
      if (text.includes('student')) score += 30;
      if (text.includes('university') || text.includes('college')) score += 25;
      if (text.includes('id') || text.includes('identification')) score += 20;
      if (text.includes('academic') || text.includes('semester')) score += 25;
      break;
      
    case 'employment_letter':
      if (text.includes('employment')) score += 30;
      if (text.includes('employed')) score += 25;
      if (text.includes('human resources') || text.includes('hr')) score += 20;
      if (companyName && text.includes(companyName.toLowerCase())) score += 25;
      break;
      
    case 'enrollment_letter':
      if (text.includes('enrollment') || text.includes('enrolled')) score += 30;
      if (text.includes('registrar')) score += 25;
      if (text.includes('academic')) score += 20;
      if (text.includes('semester') || text.includes('year')) score += 25;
      break;
      
    default:
      flags.push('unknown_document_type');
      score = 20;
  }
  
  // Quality checks
  if (extractedText.length < 3) {
    flags.push('insufficient_text');
    score -= 20;
  }
  
  if (extractedText.length > 20) {
    flags.push('too_much_text');
    score -= 10;
  }
  
  // Date validation (check for recent dates)
  const currentYear = new Date().getFullYear();
  const hasRecentDate = extractedText.some(text => 
    text.includes(currentYear.toString()) || 
    text.includes((currentYear - 1).toString())
  );
  
  if (hasRecentDate) {
    score += 15;
  } else {
    flags.push('no_recent_date');
    score -= 15;
  }
  
  isValid = score >= 60;
  
  return { isValid, score, flags };
};

// Calculate overall confidence score
const calculateConfidenceScore = (
  qualityScore: number,
  contentValidation: { score: number },
  documentType: DocumentAnalysisResult['documentType'],
  extractedText: string[]
): number => {
  let confidence = 0;
  
  // Weight the different factors
  confidence += qualityScore * 0.3; // 30% weight for image quality
  confidence += contentValidation.score * 0.5; // 50% weight for content validation
  
  // Bonus for known document types
  if (documentType !== 'unknown') {
    confidence += 10;
  }
  
  // Bonus for sufficient text extraction
  if (extractedText.length >= 5) {
    confidence += 10;
  }
  
  return Math.min(100, Math.max(0, confidence));
};

// Batch processing for multiple pending verifications
export const processPendingVerifications = async (): Promise<{
  processed: number;
  approved: number;
  rejected: number;
  stillPending: number;
}> => {
  try {
    // Get all pending verifications
    const pendingQuery = firebase.firestore()
      .collectionGroup('verification')
      .where('status', '==', 'pending')
      .limit(50); // Process in batches
    
    const snapshot = await pendingQuery.get();
    
    let processed = 0;
    let approved = 0;
    let rejected = 0;
    let stillPending = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data() as VerificationData;
      
      // Skip if no document URLs (email verification)
      if (!data.documentUrls || data.documentUrls.length === 0) {
        stillPending++;
        continue;
      }
      
      try {
        // Analyze the first document
        const analysis = await analyzeDocument(
          data.documentUrls[0],
          data.type!,
          data.companyName
        );
        
        processed++;
        
        if (analysis.autoApprove) {
          // Auto-approve high-confidence documents
          await doc.ref.update({
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            adminNotes: `Auto-approved by AI (confidence: ${analysis.confidence}%)`
          });
          approved++;
        } else if (analysis.confidence < 40) {
          // Auto-reject very low confidence documents
          await doc.ref.update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectionReason: 'Document quality or content insufficient for verification',
            adminNotes: `Auto-rejected by AI (confidence: ${analysis.confidence}%)`
          });
          rejected++;
        } else {
          // Keep for manual review but add AI insights
          await doc.ref.update({
            adminNotes: `AI analysis: ${analysis.confidence}% confidence, flags: ${analysis.flags.join(', ')}`
          });
          stillPending++;
        }
      } catch (error) {
        console.error('Error processing verification:', doc.id, error);
        stillPending++;
      }
    }
    
    return { processed, approved, rejected, stillPending };
  } catch (error) {
    console.error('Error processing pending verifications:', error);
    return { processed: 0, approved: 0, rejected: 0, stillPending: 0 };
  }
};

// Schedule automated processing (call this periodically)
export const scheduleAutomatedProcessing = () => {
  // Run every 30 minutes
  setInterval(async () => {
    console.log('Running automated verification processing...');
    const results = await processPendingVerifications();
    console.log('Automated processing results:', results);
  }, 30 * 60 * 1000);
};

// Get verification statistics for admin dashboard
export const getVerificationStats = async (): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  autoApprovalRate: number;
}> => {
  try {
    const [pendingSnap, approvedSnap, rejectedSnap] = await Promise.all([
      firebase.firestore().collectionGroup('verification').where('status', '==', 'pending').get(),
      firebase.firestore().collectionGroup('verification').where('status', '==', 'approved').get(),
      firebase.firestore().collectionGroup('verification').where('status', '==', 'rejected').get()
    ]);
    
    const pending = pendingSnap.size;
    const approved = approvedSnap.size;
    const rejected = rejectedSnap.size;
    const total = pending + approved + rejected;
    
    // Calculate auto-approval rate (documents approved by AI)
    const autoApproved = approvedSnap.docs.filter(doc => 
      doc.data().adminNotes?.includes('Auto-approved by AI')
    ).length;
    
    const autoApprovalRate = approved > 0 ? (autoApproved / approved) * 100 : 0;
    
    return {
      total,
      pending,
      approved,
      rejected,
      autoApprovalRate
    };
  } catch (error) {
    console.error('Error getting verification stats:', error);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      autoApprovalRate: 0
    };
  }
}; 
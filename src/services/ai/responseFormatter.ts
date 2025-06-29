/**
 * Formats AI responses for better display in the chat interface
 */
export const formatAIResponse = (response: string, isNotification: boolean = false): string => {
  // For notifications, keep it super simple
  if (isNotification) {
    // Remove any bullet points or formatting
    let simplified = response.replace(/[•▪–—]/g, '');
    // Remove line breaks
    simplified = simplified.replace(/\n+/g, ' ');
    // Clean up spaces
    simplified = simplified.replace(/\s+/g, ' ').trim();
    // Truncate if still too long
    if (simplified.length > 100) {
      simplified = simplified.substring(0, 97) + '...';
    }
    return simplified;
  }
  
  // Already well-formatted responses (with bullet points)
  if (response.includes('•') || response.includes('▪')) {
    return response;
  }
  
  // Convert numbered lists to bullet points
  let formatted = response.replace(/^\d+\.\s+/gm, '• ');
  
  // Convert dash lists to bullet points
  formatted = formatted.replace(/^[-*]\s+/gm, '• ');
  
  // Add line breaks before bullet points if missing
  formatted = formatted.replace(/([.!?])\s*•/g, '$1\n\n•');
  
  // Ensure proper spacing between paragraphs
  formatted = formatted.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
  
  // Clean up excessive line breaks
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  return formatted.trim();
};

/**
 * Formats response specifically for notification display
 */
export const formatNotificationResponse = (response: string): string => {
  return formatAIResponse(response, true);
};

/**
 * Extracts exercise steps from AI response
 */
export const extractExerciseSteps = (response: string): string[] => {
  const steps: string[] = [];
  
  // Match bullet points
  const bulletMatches = response.match(/•\s*([^•\n]+)/g);
  if (bulletMatches) {
    return bulletMatches.map(match => match.replace(/•\s*/, '').trim());
  }
  
  // Match numbered lists
  const numberedMatches = response.match(/\d+\.\s*([^\n]+)/g);
  if (numberedMatches) {
    return numberedMatches.map(match => match.replace(/\d+\.\s*/, '').trim());
  }
  
  return steps;
};
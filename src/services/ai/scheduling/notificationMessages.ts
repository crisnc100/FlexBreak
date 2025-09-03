// Types for notification generation
interface WellnessMemoryCompat {
  commonIssues: { [category: string]: number };
  lastCheckIn: number;
  totalInteractions: number;
}

interface ConversationInsight {
  category: string;
  solution?: string;
  effectiveness?: 'helped' | 'somewhat' | 'not_really';
  timestamp: number;
  timeOfDay: string;
}

// Helper to convert improvedMemory format to compatibility format
export const convertImprovedMemoryToCompat = (improvedMemory: any): WellnessMemoryCompat => {
  // Count issues from patterns
  const commonIssues: { [category: string]: number } = {};
  
  if (improvedMemory.wellness_data?.patterns) {
    improvedMemory.wellness_data.patterns.forEach((pattern: any) => {
      if (pattern.type) {
        commonIssues[pattern.type] = pattern.frequency || 1;
      }
    });
  }
  
  // Add physical issues to common issues
  if (improvedMemory.wellness_data?.physical_issues) {
    improvedMemory.wellness_data.physical_issues.forEach((issue: any) => {
      const category = issue.issue.toLowerCase().includes('back') ? 'back_pain' :
                      issue.issue.toLowerCase().includes('neck') ? 'neck_pain' :
                      issue.issue.toLowerCase().includes('stress') ? 'stress' :
                      issue.issue.toLowerCase().includes('tired') ? 'fatigue' : 'general';
      commonIssues[category] = (commonIssues[category] || 0) + issue.mentions;
    });
  }
  
  return {
    commonIssues,
    lastCheckIn: improvedMemory.usage?.lastCheckIn || 0,
    totalInteractions: improvedMemory.usage?.totalInteractions || 0
  };
}

interface NotificationMessage {
  title: string;
  body: string;
}

// Friendly greetings based on time of day
const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  
  // More natural time boundaries:
  // Morning: 5 AM - 11:59 AM
  // Afternoon: 12 PM - 5:59 PM  
  // Evening: 6 PM - 8:59 PM
  // Night: 9 PM - 4:59 AM (but we'll use evening for friendliness)
  
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 18) {
    return 'Good afternoon';
  } else if (hour >= 18 && hour < 21) {
    return 'Good evening';
  } else {
    // Late night (9 PM - 4:59 AM) - use evening as it's friendlier
    return 'Good evening';
  }
};

// Get the most common issue from recent insights
const getMostCommonIssue = (memory: WellnessMemoryCompat): string | null => {
  const issues = Object.entries(memory.commonIssues)
    .sort(([, a], [, b]) => b - a);
  
  if (issues.length === 0) return null;
  
  const [topIssue] = issues[0];
  
  // Convert issue key to friendly text
  const issueMap: { [key: string]: string } = {
    'back_pain': 'back',
    'neck_pain': 'neck',
    'stress': 'stress levels',
    'fatigue': 'energy',
    'focus': 'focus',
    'eye_strain': 'eyes'
  };
  
  return issueMap[topIssue] || null;
};

// Get days since last check-in for friendly reminders
const getDaysSinceLastCheckIn = (lastCheckIn: number): number => {
  return Math.floor((Date.now() - lastCheckIn) / (1000 * 60 * 60 * 24));
};

export const generatePersonalizedNotification = (
  userName: string | null,
  memory: WellnessMemoryCompat,
  recentInsights: ConversationInsight[]
): NotificationMessage => {
  const greeting = getTimeGreeting();
  const name = userName || 'there';
  const commonIssue = getMostCommonIssue(memory);
  const daysSinceLastCheckIn = getDaysSinceLastCheckIn(memory.lastCheckIn);
  
  // Array of personalized messages based on user history
  const messages: NotificationMessage[] = [];
  
  // If user has a common issue, reference it sometimes
  if (commonIssue && Math.random() > 0.5) {
    messages.push({
      title: `${greeting}, ${name}! 👋`,
      body: `How's your ${commonIssue} feeling today? Tap to chat or hold to use voice 🎙️`
    });
    
    messages.push({
      title: `Hey ${name}, checking in 💙`,
      body: `Hope your ${commonIssue} is better! Tell me how you're doing - tap or hold to reply`
    });
    
    if (commonIssue === 'back' || commonIssue === 'neck') {
      messages.push({
        title: `${greeting}, ${name} 🤗`,
        body: `Time for a quick posture check! How's your ${commonIssue}? Swipe down to respond`
      });
    }
  }
  
  // If it's been a while since last check-in
  if (daysSinceLastCheckIn > 7) {
    messages.push({
      title: `${name}, I've missed you! 👋`,
      body: `It's been ${daysSinceLastCheckIn} days - how are you feeling? Tap to catch up!`
    });
  }
  
  // General friendly messages
  messages.push({
    title: `${greeting}, ${name}! 😊`,
    body: `How are you feeling right now? Tap to chat or hold for voice reply 🎙️`
  });
  
  messages.push({
    title: `Hey ${name}, wellness check! 💪`,
    body: `What's your body telling you today? Swipe down for quick responses`
  });
  
  messages.push({
    title: `${name}, let's check in 🌟`,
    body: `How's everything going? Tell me what's on your mind - tap or hold to reply`
  });
  
  messages.push({
    title: `Quick check-in, ${name} 💙`,
    body: `How are you doing today? Share what you're feeling - tap to type or hold for voice`
  });
  
  // Time-specific messages
  if (greeting === 'Good afternoon') {
    messages.push({
      title: `Afternoon check-in, ${name} ☀️`,
      body: `How's your energy holding up? Let me know - tap or hold to respond`
    });
  }
  

  
  // Randomly select a message
  return messages[Math.floor(Math.random() * messages.length)];
};

// For users without history (first few check-ins)
export const generateDefaultNotification = (userName: string | null): NotificationMessage => {
  const greeting = getTimeGreeting();
  const name = userName || 'there';
  
  const messages: NotificationMessage[] = [
    {
      title: `${greeting}, ${name}! 👋`,
      body: `How are you feeling today? Tap to chat or hold to use voice 🎙️`
    },
    {
      title: `Hey ${name}, wellness check! 💪`,
      body: `What's your body telling you? Swipe down for quick responses`
    },
    {
      title: `${name}, let's check in 😊`,
      body: `How's everything going? Tell me what's on your mind - tap or hold to reply`
    },
    {
      title: `Quick check-in, ${name} 🌟`,
      body: `How are you doing? Share what you're feeling - tap to type or hold for voice`
    }
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
};
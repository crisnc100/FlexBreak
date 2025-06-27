import { WellnessMemory, ConversationInsight } from './wellnessMemory';

interface NotificationMessage {
  title: string;
  body: string;
}

// Friendly greetings based on time of day
const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Get the most common issue from recent insights
const getMostCommonIssue = (memory: WellnessMemory): string | null => {
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
  memory: WellnessMemory,
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
  
  // If user has been consistent
  if (memory.consistencyScore > 70) {
    messages.push({
      title: `${name}, you're doing great! 🌟`,
      body: `Your consistency is ${memory.consistencyScore}%! How are you feeling today?`
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
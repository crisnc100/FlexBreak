export const WELLNESS_COACH_PROMPT = `You are a caring wellness coach for FlexBreak app. 
Your role is to provide brief, practical advice for physical wellness and work-related stress.

Guidelines:
- Keep responses under 60 words (be concise but helpful)
- Focus on stretches, movement, posture, and motivation
- Be encouraging and specific
- Suggest actions that can be done at a desk or in a small space
- If someone asks a question (e.g., "should I nap or drink caffeine"), directly answer their question first
- If someone mentions pain, suggest gentle movements but remind them to consult a healthcare provider for persistent issues
- If you know the user's name, use it naturally in your response (but not in every message)
- If effectiveActions are provided in context, prioritize suggesting those actions as they've worked well for this user before

Response format:
1. Acknowledge their specific situation or question
2. Answer their question directly if they asked one
3. Provide one specific, actionable suggestion
4. End with brief encouragement`;

export const CONTEXT_TEMPLATE = {
  timeOfDay: {
    morning: 'User is starting their day',
    afternoon: 'User is in the middle of their workday',
    evening: 'User is winding down'
  },
  patterns: {
    recurring: 'This issue happens frequently at this time',
    new: 'This is a new concern',
    improving: 'This has been getting better'
  }
};

export const WELLNESS_PATTERNS = {
  // Physical issues
  back_pain: ['back', 'spine', 'lower back', 'upper back'],
  neck_pain: ['neck', 'shoulders', 'trapezius'],
  eye_strain: ['eyes', 'screen', 'blurry', 'headache'],
  fatigue: ['tired', 'exhausted', 'sleepy', 'fatigue'],
  
  // Mental/Work issues
  stress: ['stressed', 'anxious', 'overwhelmed', 'pressure'],
  focus: ['focus', 'concentrate', 'distracted', 'attention'],
  motivation: ['unmotivated', 'lazy', 'procrastinating', 'bored'],
  
  // Positive
  good: ['good', 'great', 'fine', 'okay', 'well']
};

export const QUICK_ACTIONS = {
  back_pain: {
    title: "Quick Back Relief",
    options: [
      { id: 'cat_cow', label: 'Cat-Cow Stretch', duration: '1 min' },
      { id: 'twist', label: 'Seated Twist', duration: '30 sec' },
      { id: 'walk', label: 'Quick Walk', duration: '2 min' }
    ]
  },
  stress: {
    title: "Stress Relief",
    options: [
      { id: 'breathe', label: 'Deep Breathing', duration: '1 min' },
      { id: 'shoulders', label: 'Shoulder Rolls', duration: '30 sec' },
      { id: 'mindful', label: 'Mindful Moment', duration: '2 min' }
    ]
  }
};

export const FALLBACK_RESPONSES = {
  back_pain: "Back pain is common with prolonged sitting. Try: Stand up, hands on lower back, gentle arch 3x. Cat-cow stretches for 30 seconds. Set hourly movement reminders!",
  
  stress: "Quick stress relief: Take 5 deep belly breaths. Roll shoulders back 10x. Look away from screen for 20 seconds. You've got this! 💪",
  
  fatigue: "Feeling tired? A quick energy boost: Stand up, do 10 arm circles, take 5 deep breaths, and if possible, get some fresh air or water.",
  
  focus: "Need to refocus? Try the 20-20-20 rule: Look at something 20 feet away for 20 seconds. Then do 20 gentle neck rolls. This resets your mind and eyes.",
  
  positive: "That's wonderful to hear! Keep the momentum going with a quick stretch to maintain that good feeling.",
  
  general: "Thanks for checking in! Remember, small movement breaks throughout the day make a big difference. Try a quick stretch or walk."
};
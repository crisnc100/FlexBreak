export const WELLNESS_COACH_PROMPT = `You are a caring wellness coach for FlexBreak app.

PERSONALIZATION RULES:
- If userName is provided, use it naturally (not in every message, but when it feels appropriate)
- If personalizedHistory is provided, reference it subtly:
  - "I remember you mentioned..." or "Since you often deal with..."
  - "Last time [solution] helped, want to try it again?"
  - Acknowledge patterns: "I notice you check in during [timeOfDay] when feeling [issue]"

FIRST TIME USER INSTRUCTIONS:
If this is a welcome/first interaction (user says "welcome", "hi", "hello", etc), include:
- Use their name if provided: "Hi [name]! I'm your AI Flex Coach"
- "I'll check in with you every [Wednesday/day] between 11am-4pm"
- "You can reply by text or tap the voice button!"
- For free users: "As a free user, we'll connect on Wednesdays. Want daily support? Consider upgrading!"
- For premium users: "I'll be here every day to support your wellness journey!"

Guidelines:
- Keep responses 40-70 words (be helpful but concise)
- Always provide ONE specific, actionable suggestion
- Reference personalizedHistory when relevant (common issues, effective solutions)
- Reference time of day in suggestions (morning energy, afternoon slump, evening wind-down)
- If user mentions recurring issues, acknowledge you remember the pattern
- For pain: Suggest gentle movements + remind about healthcare for persistent issues
- Include estimated time for activities (e.g., "2-minute walk" or "30-second stretch")

Response style:
- Warm and encouraging, like a supportive friend who remembers you
- Use simple language, avoid medical jargon
- Add light emoji occasionally (not every message)
- End with brief encouragement or check-in question

Context awareness:
- Use personalizedHistory to inform suggestions
- If something worked before (in effectiveSolutions), suggest it again
- Morning: Focus on energizing activities
- Afternoon: Combat fatigue and maintain focus
- Evening: Relaxation and recovery

Response format:
1. Acknowledge their specific situation (use history if relevant)
2. Provide one specific, actionable suggestion with time estimate
3. End with encouragement`;

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
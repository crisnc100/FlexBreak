import { Dimensions } from 'react-native';
import { ItemData, Round, DayScenario } from './types';

const { width, height } = Dimensions.get('window');

export const ITEM_BASE_SIZE = 70;
export const SCALE_WIDTH = width * 0.85;
export const SCALE_HEIGHT = 60; // Increased height for better visibility
export const MAX_TILT = 25;
export const MAX_ENERGY = 100; // Starting energy level
export const DROP_ZONE_PADDING = 80; // Even larger hit area for drops

// Color scheme for categories
export const CATEGORY_COLORS = {
  work: '#FF6B6B',
  family: '#4ECDC4',
  wellness: '#4CAF50',
  hobbies: '#FFB347',
  goals: '#9B59B6',
  social: '#3498DB',
};

// Work activities - real workplace situations with consequences
export const WORK_ITEMS: ItemData[] = [
  { 
    icon: 'alert-circle-outline', 
    label: 'Boss Emergency', 
    description: 'CEO needs this NOW!',
    weight: 4, 
    energyCost: 20, 
    category: 'work',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'career', change: 15, message: 'Boss impressed!' },
        { stat: 'stress', change: 20, message: 'Pressure!' }
      ],
      skipPenalty: [
        { stat: 'career', change: -25, message: 'Boss furious!' },
        { stat: 'stress', change: 10 }
      ]
    }
  },
  { 
    icon: 'trending-up-outline', 
    label: 'Promotion Task', 
    description: 'Career opportunity',
    weight: 3, 
    energyCost: 15, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'career', change: 20, message: 'Great progress!' },
        { stat: 'stress', change: 10 }
      ],
      skipPenalty: [
        { stat: 'career', change: -10, message: 'Opportunity missed' }
      ]
    }
  },
  { 
    icon: 'people-outline', 
    label: 'Team Crisis', 
    description: 'Colleagues need help',
    weight: 2, 
    energyCost: 12, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'career', change: 5, message: 'Team player!' },
        { stat: 'social', change: 10, message: 'Colleagues grateful' }
      ]
    }
  },
  { 
    icon: 'time-outline', 
    label: 'Overtime Request', 
    description: 'Extra hours = extra pay',
    weight: 3, 
    energyCost: 18, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'career', change: 8 },
        { stat: 'stress', change: 15 },
        { stat: 'family', change: -10, message: 'Missing dinner again' }
      ]
    }
  },
  { 
    icon: 'briefcase-outline', 
    label: 'Client Meeting', 
    description: 'Important client waiting',
    weight: 2, 
    energyCost: 10, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'career', change: 10, message: 'Client happy!' }
      ],
      skipPenalty: [
        { stat: 'career', change: -15, message: 'Lost client!' }
      ]
    }
  },
  { 
    icon: 'mail-outline', 
    label: 'Urgent Email', 
    description: 'Deadline approaching',
    weight: 1, 
    energyCost: 5, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'career', change: 3 },
        { stat: 'stress', change: 5 }
      ]
    }
  },
  { 
    icon: 'school-outline', 
    label: 'Training Course', 
    description: 'Skill development',
    weight: 2, 
    energyCost: 10, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'career', change: 12, message: 'Skills improved!' }
      ],
      delayed: [
        { stat: 'stress', change: -5, message: 'Feel more capable' }
      ]
    }
  },
  { 
    icon: 'warning-outline', 
    label: 'Crisis Call', 
    description: 'System is down!',
    weight: 3, 
    energyCost: 15, 
    category: 'work',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'career', change: 10, message: 'Crisis averted!' },
        { stat: 'stress', change: 25 }
      ],
      skipPenalty: [
        { stat: 'career', change: -20, message: 'Major failure!' }
      ]
    }
  },
  { 
    icon: 'document-text-outline', 
    label: 'Performance Review', 
    description: 'Annual evaluation',
    weight: 2, 
    energyCost: 8, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'career', change: 15, message: 'Good review!' },
        { stat: 'stress', change: 10 }
      ]
    }
  },
  { 
    icon: 'videocam-outline', 
    label: 'Video Conference', 
    description: 'Team sync meeting',
    weight: 2, 
    energyCost: 10, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'career', change: 5 },
        { stat: 'stress', change: 5 }
      ]
    }
  },
  { 
    icon: 'bar-chart-outline', 
    label: 'Report Due', 
    description: 'Monthly metrics',
    weight: 2, 
    energyCost: 12, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'career', change: 8 }
      ],
      skipPenalty: [
        { stat: 'career', change: -10, message: 'Report missed!' }
      ]
    }
  },
  { 
    icon: 'chatbubbles-outline', 
    label: 'Slack Messages', 
    description: '15 unread pings',
    weight: 1, 
    energyCost: 4, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'stress', change: 3 }
      ]
    }
  },
  { 
    icon: 'calendar-outline', 
    label: 'Schedule Meeting', 
    description: 'Coordinate calendars',
    weight: 1, 
    energyCost: 6, 
    category: 'work',
    effects: {
      immediate: [
        { stat: 'career', change: 3 }
      ]
    }
  },
  { 
    icon: 'bug-outline', 
    label: 'Bug Report', 
    description: 'Customer complaint',
    weight: 2, 
    energyCost: 14, 
    category: 'work',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'career', change: 10, message: 'Bug fixed!' },
        { stat: 'stress', change: 15 }
      ],
      skipPenalty: [
        { stat: 'career', change: -15, message: 'Customer angry!' }
      ]
    }
  },
];

// Life activities - meaningful personal moments with real impact
export const LIFE_ITEMS: ItemData[] = [
  // Family & Relationships
  { 
    icon: 'heart-outline', 
    label: "Partner's Birthday", 
    description: 'Once a year...',
    weight: 4, 
    energyCost: 15, 
    category: 'family',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'family', change: 25, message: 'Memorable celebration!' },
        { stat: 'stress', change: -10, message: 'Joyful moment' }
      ],
      skipPenalty: [
        { stat: 'family', change: -30, message: 'Deeply hurt!' },
        { stat: 'stress', change: 15 }
      ]
    }
  },
  { 
    icon: 'school-outline', 
    label: "Kid's School Play", 
    description: "They're counting on you",
    weight: 3, 
    energyCost: 12, 
    category: 'family',
    effects: {
      immediate: [
        { stat: 'family', change: 20, message: 'Child so happy!' }
      ],
      skipPenalty: [
        { stat: 'family', change: -20, message: 'Child disappointed' },
        { stat: 'stress', change: 10, message: 'Guilt' }
      ]
    }
  },
  { 
    icon: 'home-outline', 
    label: 'Family Dinner', 
    description: 'Quality time together',
    weight: 2, 
    energyCost: 8, 
    category: 'family',
    effects: {
      immediate: [
        { stat: 'family', change: 10, message: 'Good conversation' },
        { stat: 'stress', change: -5 }
      ]
    }
  },
  
  // Health & Wellness
  { 
    icon: 'medical-outline', 
    label: 'Doctor Visit', 
    description: 'Overdue checkup',
    weight: 2, 
    energyCost: 10, 
    category: 'wellness',
    effects: {
      immediate: [
        { stat: 'health', change: 15, message: 'Health checked!' }
      ],
      skipPenalty: [
        { stat: 'health', change: -10, message: 'Health neglected' },
        { stat: 'stress', change: 5 }
      ]
    }
  },
  { 
    icon: 'fitness-outline', 
    label: 'Gym Session', 
    description: 'Stay fit & healthy',
    weight: 2, 
    energyCost: 12, 
    energyRestore: 15, 
    category: 'wellness',
    effects: {
      immediate: [
        { stat: 'health', change: 10, message: 'Feeling strong!' },
        { stat: 'stress', change: -10 }
      ]
    }
  },
  { 
    icon: 'bed-outline', 
    label: 'Full Night Sleep', 
    description: '8 hours needed',
    weight: 3, 
    energyCost: 0, 
    energyRestore: 30, 
    category: 'wellness',
    effects: {
      immediate: [
        { stat: 'health', change: 5 },
        { stat: 'stress', change: -15, message: 'Well rested!' }
      ]
    }
  },
  
  // Social Connections
  { 
    icon: 'people-outline', 
    label: 'Friend in Crisis', 
    description: 'They really need you',
    weight: 3, 
    energyCost: 15, 
    category: 'social',
    effects: {
      immediate: [
        { stat: 'social', change: 20, message: 'True friendship!' },
        { stat: 'stress', change: 5 }
      ],
      skipPenalty: [
        { stat: 'social', change: -15, message: 'Friend hurt' }
      ]
    }
  },
  { 
    icon: 'gift-outline', 
    label: 'Wedding Event', 
    description: 'Close friend\'s big day',
    weight: 3, 
    energyCost: 20, 
    category: 'social',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'social', change: 25, message: 'Celebrated together!' }
      ],
      skipPenalty: [
        { stat: 'social', change: -25, message: 'Friendship damaged' }
      ]
    }
  },
  
  // Personal Growth
  { 
    icon: 'book-outline', 
    label: 'Study Session', 
    description: 'Invest in yourself',
    weight: 2, 
    energyCost: 10, 
    category: 'goals',
    effects: {
      immediate: [
        { stat: 'career', change: 5, message: 'Skills growing' }
      ],
      delayed: [
        { stat: 'stress', change: -5, message: 'More confident' }
      ]
    }
  },
  { 
    icon: 'trophy-outline', 
    label: 'Personal Goal', 
    description: 'Your dream project',
    weight: 3, 
    energyCost: 15, 
    category: 'goals',
    effects: {
      immediate: [
        { stat: 'stress', change: -10, message: 'Fulfilling!' }
      ],
      delayed: [
        { stat: 'career', change: 3, message: 'New skills' }
      ]
    }
  },
  
  // Mental Health
  { 
    icon: 'leaf-outline', 
    label: 'Therapy Session', 
    description: 'Mental health matters',
    weight: 2, 
    energyCost: 8, 
    energyRestore: 10, 
    category: 'wellness',
    effects: {
      immediate: [
        { stat: 'health', change: 10 },
        { stat: 'stress', change: -20, message: 'Clarity gained' }
      ]
    }
  },
];

// Essential items - neutral activities everyone needs, can go to either side with NO penalty
export const ESSENTIAL_ITEMS: ItemData[] = [
  { 
    icon: 'water-outline', 
    label: 'Hydration', 
    description: 'Stay hydrated',
    weight: 1, 
    energyCost: 0, // No cost - essential!
    energyRestore: 2,
    category: 'wellness',
    isFlexible: true,
  },
  { 
    icon: 'restaurant-outline', 
    label: 'Quick Lunch', 
    description: 'Fuel your body',
    weight: 2, 
    energyCost: 2,
    energyRestore: 5,
    category: 'wellness',
    isFlexible: true,
  },
  { 
    icon: 'walk-outline', 
    label: 'Bathroom Break', 
    description: 'Nature calls',
    weight: 1, 
    energyCost: 0, // No cost - essential!
    energyRestore: 1,
    category: 'wellness',
    isFlexible: true,
  },
  { 
    icon: 'eye-outline', 
    label: 'Eye Break', 
    description: '20-20-20 rule',
    weight: 1, 
    energyCost: 0,
    energyRestore: 2,
    category: 'wellness',
    isFlexible: true,
  },
  { 
    icon: 'nutrition-outline', 
    label: 'Quick Snack', 
    description: 'Energy boost',
    weight: 1, 
    energyCost: 1,
    energyRestore: 3,
    category: 'wellness',
    isFlexible: true,
  },
  { 
    icon: 'phone-portrait-outline', 
    label: 'Important Call', 
    description: 'Can\'t ignore',
    weight: 2, 
    energyCost: 5,
    category: 'social',
    isFlexible: true,
  },
];

// Flexible items - can go to either work or life side but with different consequences
export const FLEXIBLE_ITEMS: ItemData[] = [
  { 
    icon: 'phone-portrait-outline', 
    label: 'Phone Call', 
    description: 'Who\'s calling?',
    weight: 2, 
    energyCost: 5,
    category: 'social',
    isFlexible: true,
    flexibleEnergyCost: { work: 3, life: 6 }, // Quick at work, longer at home
    effects: {
      immediate: [
        { stat: 'social', change: 5 }
      ]
    }
  },
  { 
    icon: 'laptop-outline', 
    label: 'Laptop Time', 
    description: 'Work or play?',
    weight: 3, 
    energyCost: 10,
    category: 'goals',
    isFlexible: true,
    flexibleEnergyCost: { work: 12, life: 8 }, // Stressful at work, relaxing at home
    effects: {
      immediate: [
        { stat: 'stress', change: 5 } // If at work
      ]
    }
  },
  { 
    icon: 'cafe-outline', 
    label: 'Coffee Break', 
    description: 'Quick or social?',
    weight: 2, 
    energyCost: 3,
    energyRestore: 4,
    category: 'social',
    isFlexible: true,
    flexibleEnergyCost: { work: 2, life: 4 } // Quick at work, social at home
  },
  { 
    icon: 'book-outline', 
    label: 'Reading Time', 
    description: 'Work or pleasure?',
    weight: 2, 
    energyCost: 8,
    category: 'goals',
    isFlexible: true,
    flexibleEnergyCost: { work: 10, life: 6 }, // Work reading is harder
    effects: {
      immediate: [
        { stat: 'career', change: 5 } // If at work
      ]
    }
  },
  { 
    icon: 'musical-notes-outline', 
    label: 'Music Break', 
    description: 'Background or focus?',
    weight: 1, 
    energyCost: 2,
    energyRestore: 2,
    category: 'wellness',
    isFlexible: true,
    flexibleEnergyCost: { work: 1, life: 2 }
  },
];

// Rest items - restore energy when placed
export const REST_ITEMS: ItemData[] = [
  { icon: 'bed-outline', label: 'Power Nap', weight: 2, energyCost: 0, energyRestore: 20, category: 'wellness' },
  { icon: 'pause-outline', label: 'Break Time', weight: 1, energyCost: 0, energyRestore: 10, category: 'wellness' },
  { icon: 'refresh-outline', label: 'Recharge', weight: 2, energyCost: 0, energyRestore: 15, category: 'wellness' },
];

// Daily scenarios that add context and strategy to each round
export const DAY_SCENARIOS: DayScenario[] = [
  {
    id: 'monday_rush',
    name: 'Monday Rush',
    description: 'Emails everywhere!',
    storyText: '47 unread emails. Boss wants urgent meeting. Coffee not working yet.',
    energyModifier: 0.8, // Start with 80% energy
    workItemChance: 0.65, // 65% work items - Monday is work heavy
    essentialItemChance: 0.3, // 30% essential items
    tips: ['Work first', 'Eat lunch', 'Stay hydrated'],
    statModifiers: { stress: 40, career: 45 }
  },
  {
    id: 'deadline_day',
    name: 'Deadline Day',
    description: 'Project due at 5PM!',
    storyText: 'Big presentation today. Partner wants dinner. Mom keeps calling.',
    energyModifier: 0.7, // Start with 70% energy (already stressed)
    workItemChance: 0.75, // 75% work items - deadline pressure
    essentialItemChance: 0.4, // 40% essential items (need more breaks)
    tips: ['Take breaks', 'Quick meals', 'Deep breaths'],
    statModifiers: { stress: 60, career: 40, family: 40 }
  },
  {
    id: 'balanced_tuesday',
    name: 'Easy Tuesday',
    description: 'Normal day ahead',
    storyText: 'Schedule looks good. Slept well. What will you focus on?',
    energyModifier: 1.0, // Full energy
    workItemChance: 0.5, // 50% work items
    essentialItemChance: 0.2, // 20% essential items
    tips: ['Keep balance', 'Mix it up', 'Stay steady'],
    statModifiers: { stress: 30, health: 55 }
  },
  {
    id: 'social_friday',
    name: 'Friday Vibes',
    description: 'Friends want happy hour!',
    storyText: 'Happy hour at 6. Report not done. Boss checking in.',
    energyModifier: 0.9, // 90% energy
    workItemChance: 0.4, // 40% work items
    essentialItemChance: 0.2, // 20% essential items
    tips: ['Finish early', 'See friends', 'Have fun'],
    statModifiers: { social: 45, career: 45 }
  },
  {
    id: 'family_weekend',
    name: 'Family Saturday',
    description: 'Kids want the park!',
    storyText: 'Family wants brunch. Work emails buzzing. Choose wisely.',
    energyModifier: 1.0, // Full energy
    workItemChance: 0.3, // 30% work items
    essentialItemChance: 0.25, // 25% essential items
    tips: ['Family first', 'Ignore work', 'Be present'],
    statModifiers: { family: 60, stress: 25 }
  },
  {
    id: 'wellness_wednesday',
    name: 'Wellness Day',
    description: 'Time for self-care',
    storyText: 'Back hurts. Eating takeout again. Gym membership unused.',
    energyModifier: 0.85, // 85% energy
    workItemChance: 0.45, // 45% work items
    essentialItemChance: 0.35, // 35% essential items (focus on wellness)
    tips: ['Health first', 'Move more', 'Eat better'],
    statModifiers: { health: 40, stress: 35 }
  },
  {
    id: 'emergency_thursday',
    name: 'Crisis Mode',
    description: 'Everything on fire!',
    storyText: 'Server crashed. Client angry. Anniversary dinner at 7.',
    energyModifier: 0.75, // 75% energy (stress)
    workItemChance: 0.7, // 70% work items - crisis mode
    essentialItemChance: 0.3, // 30% essential items
    stressEvents: ['Client emergency!', 'Server down!', 'Boss needs this NOW!'],
    tips: ['Stay calm', 'Breathe', 'One at a time'],
    statModifiers: { stress: 50, career: 35, family: 35 }
  }
];

// Game rounds - progressive difficulty with scenarios
export const ROUNDS: Round[] = [
  { 
    number: 1, 
    duration: 30, 
    spawnRate: 2000, // Spawn every 2 seconds
    fallSpeed: 4500, // Gentle speed
    itemCount: 15, // 15 items to manage
    startingBalanceRange: { min: -20, max: 20 }, // Slight imbalance
    maxSkips: 999, // Unlimited skips in round 1
    restItemChance: 0.2, // 20% chance of rest items
    scenario: DAY_SCENARIOS[2], // Balanced Tuesday - good for learning
  },
  { 
    number: 2, 
    duration: 30, 
    spawnRate: 1800, // Spawn every 1.8 seconds
    fallSpeed: 4000, // Moderate speed
    itemCount: 20, // 20 items
    startingBalanceRange: { min: -30, max: 30 }, // More imbalance
    maxSkips: 5, // Limited skips
    restItemChance: 0.15, // 15% chance of rest items
    flexibleItemChance: 0.2, // 20% chance of flexible items
    scenario: DAY_SCENARIOS[0], // Monday Rush
  },
  { 
    number: 3, 
    duration: 30, 
    spawnRate: 1500, // Spawn every 1.5 seconds
    fallSpeed: 3500, // Faster speed
    itemCount: 25, // 25 items
    startingBalanceRange: { min: -40, max: 40 }, // Higher imbalance
    maxSkips: 3, // Very limited skips
    restItemChance: 0.1, // 10% chance of rest items
    flexibleItemChance: 0.25, // 25% chance of flexible items
    scenario: DAY_SCENARIOS[1], // Deadline Day - intense!
  },
];

// Tutorial round - gentle introduction
export const TUTORIAL_ROUND: Round = {
  number: 0, 
  duration: 30, // More time to learn
  spawnRate: 3500, // Slower spawning
  fallSpeed: 6000, // Slower falling
  itemCount: 8, // More items to practice with
  startingBalanceRange: { min: -20, max: 20 }, // Slight imbalance
  maxSkips: 999, // Unlimited in tutorial
  restItemChance: 0.3, // Good chance for rest items
  flexibleItemChance: 0.2, // Show some neutral items
};

export const GAME_DIMENSIONS = { width, height };
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

// Essential items - MUST be handled, can't be skipped, go to either side
export const ESSENTIAL_ITEMS: ItemData[] = [
  { 
    icon: 'call-outline', 
    label: 'Emergency Call', 
    description: 'Family emergency!',
    weight: 3, 
    energyCost: 0, // No cost for emergencies
    category: 'family',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'family', change: 5, message: 'Handled emergency' },
        { stat: 'stress', change: 10 }
      ],
      skipPenalty: [
        { stat: 'family', change: -30, message: 'Ignored emergency!' },
        { stat: 'stress', change: 20 }
      ]
    }
  },
  { 
    icon: 'medical-outline', 
    label: 'Medicine Time', 
    description: 'Daily medication',
    weight: 2, 
    energyCost: 0,
    category: 'wellness',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'health', change: 5, message: 'Took medicine' }
      ],
      skipPenalty: [
        { stat: 'health', change: -20, message: 'Missed medication!' }
      ]
    }
  },
  { 
    icon: 'car-outline', 
    label: 'Pick up Kids', 
    description: 'School closes at 3PM',
    weight: 3, 
    energyCost: 8,
    category: 'family',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'family', change: 10, message: 'Kids safe' }
      ],
      skipPenalty: [
        { stat: 'family', change: -40, message: 'Kids stranded!' },
        { stat: 'stress', change: 30 }
      ]
    }
  },
  { 
    icon: 'restaurant-outline', 
    label: 'Eat Something', 
    description: 'Haven\'t eaten all day',
    weight: 2, 
    energyCost: 0,
    energyRestore: 10,
    category: 'wellness',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'health', change: 5, message: 'Finally ate' }
      ],
      skipPenalty: [
        { stat: 'health', change: -15, message: 'Starving!' },
        { stat: 'stress', change: 10 }
      ]
    }
  },
  { 
    icon: 'alarm-outline', 
    label: 'Urgent Deadline', 
    description: 'Contract expires!',
    weight: 3, 
    energyCost: 5,
    category: 'work',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'career', change: 10, message: 'Met deadline' }
      ],
      skipPenalty: [
        { stat: 'career', change: -30, message: 'Lost contract!' }
      ]
    }
  },
  { 
    icon: 'water-outline', 
    label: 'Dehydration Alert', 
    description: 'Feeling dizzy',
    weight: 1, 
    energyCost: 0,
    energyRestore: 5,
    category: 'wellness',
    isCritical: true,
    effects: {
      immediate: [
        { stat: 'health', change: 5, message: 'Hydrated' }
      ],
      skipPenalty: [
        { stat: 'health', change: -10, message: 'Dehydrated!' }
      ]
    }
  },
];

// Flexible items - can go to either work or life side but with different consequences
export const FLEXIBLE_ITEMS: ItemData[] = [
  { 
    icon: 'cafe-outline', 
    label: 'Lunch Break', 
    description: 'Quick desk lunch or proper meal?',
    weight: 2, 
    energyCost: 5,
    category: 'wellness',
    isFlexible: true,
    flexibleEnergyCost: { work: 3, life: 8 }, // Quick at desk, proper break away
    effects: {
      work: {
        immediate: [
          { stat: 'career', change: 3, message: 'Working lunch' },
          { stat: 'health', change: -5, message: 'Rushed meal' }
        ]
      },
      life: {
        immediate: [
          { stat: 'health', change: 10, message: 'Proper meal' },
          { stat: 'stress', change: -10, message: 'Relaxed' }
        ]
      }
    }
  },
  { 
    icon: 'laptop-outline', 
    label: 'Email Check', 
    description: 'Quick scan or deep dive?',
    weight: 2, 
    energyCost: 8,
    category: 'work',
    isFlexible: true,
    flexibleEnergyCost: { work: 10, life: 5 }, // Stressful at work, quick at home
    effects: {
      work: {
        immediate: [
          { stat: 'career', change: 5, message: 'Inbox cleared' },
          { stat: 'stress', change: 8 }
        ]
      },
      life: {
        immediate: [
          { stat: 'career', change: 2, message: 'Quick check' },
          { stat: 'stress', change: 3 }
        ]
      }
    }
  },
  { 
    icon: 'people-outline', 
    label: 'Team Chat', 
    description: 'Work discussion or social chat?',
    weight: 2, 
    energyCost: 6,
    category: 'social',
    isFlexible: true,
    flexibleEnergyCost: { work: 8, life: 4 },
    effects: {
      work: {
        immediate: [
          { stat: 'career', change: 5, message: 'Good teamwork' },
          { stat: 'social', change: 3 }
        ]
      },
      life: {
        immediate: [
          { stat: 'social', change: 10, message: 'Connected with team' },
          { stat: 'stress', change: -5 }
        ]
      }
    }
  },
  { 
    icon: 'walk-outline', 
    label: 'Quick Walk', 
    description: 'Rushed or relaxing?',
    weight: 1, 
    energyCost: 4,
    energyRestore: 3,
    category: 'wellness',
    isFlexible: true,
    flexibleEnergyCost: { work: 2, life: 5 },
    effects: {
      work: {
        immediate: [
          { stat: 'health', change: 3, message: 'Quick stretch' }
        ]
      },
      life: {
        immediate: [
          { stat: 'health', change: 8, message: 'Refreshing walk' },
          { stat: 'stress', change: -8 }
        ]
      }
    }
  },
  { 
    icon: 'phone-portrait-outline', 
    label: 'Personal Call', 
    description: 'Quick or quality time?',
    weight: 2, 
    energyCost: 6,
    category: 'social',
    isFlexible: true,
    flexibleEnergyCost: { work: 4, life: 8 },
    effects: {
      work: {
        immediate: [
          { stat: 'social', change: 3, message: 'Quick hello' },
          { stat: 'stress', change: 5, message: 'Felt rushed' }
        ]
      },
      life: {
        immediate: [
          { stat: 'social', change: 10, message: 'Good conversation' },
          { stat: 'family', change: 5 }
        ]
      }
    }
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
  },
  {
    id: 'sick_day',
    name: 'Feeling Unwell',
    description: 'Should you push through?',
    storyText: 'Woke up with headache. Important meeting today. Fever starting.',
    energyModifier: 0.6, // 60% energy (sick)
    workItemChance: 0.35, // 35% work items - should rest
    essentialItemChance: 0.4, // 40% essential items (medicine, rest)
    tips: ['Health first', 'Rest needed', 'Call in sick?'],
    statModifiers: { health: 30, stress: 40 }
  },
  {
    id: 'vacation_prep',
    name: 'Pre-Vacation Rush',
    description: 'Leaving tomorrow!',
    storyText: 'Flight at 6AM. Still packing. Boss wants everything done.',
    energyModifier: 0.8, // 80% energy
    workItemChance: 0.6, // 60% work items - need to finish
    essentialItemChance: 0.2, // 20% essential items
    tips: ['Delegate tasks', 'Pack light', 'Set OOO'],
    statModifiers: { stress: 45, social: 60 }
  },
  {
    id: 'performance_review',
    name: 'Review Week',
    description: 'Make it count!',
    storyText: 'Annual review Friday. Need to impress. Family feels neglected.',
    energyModifier: 0.85, // 85% energy
    workItemChance: 0.7, // 70% work items - career focus
    essentialItemChance: 0.15, // 15% essential items
    tips: ['Show results', 'Stay late?', 'Document wins'],
    statModifiers: { career: 50, family: 35, stress: 45 }
  },
  {
    id: 'birthday_chaos',
    name: 'Birthday Surprise',
    description: 'It\'s your special day!',
    storyText: 'Forgot own birthday. Friends planned party. Deadline tomorrow.',
    energyModifier: 0.95, // 95% energy
    workItemChance: 0.4, // 40% work items
    essentialItemChance: 0.2, // 20% essential items
    tips: ['Enjoy today', 'Work can wait', 'Celebrate!'],
    statModifiers: { social: 70, family: 65, stress: 30 }
  },
  {
    id: 'remote_struggle',
    name: 'WFH Blues',
    description: 'Cabin fever setting in',
    storyText: 'Kids home sick. WiFi acting up. Haven\'t left house in days.',
    energyModifier: 0.75, // 75% energy
    workItemChance: 0.5, // 50% work items
    essentialItemChance: 0.25, // 25% essential items
    tips: ['Take walks', 'Set boundaries', 'Stay connected'],
    statModifiers: { stress: 40, social: 30, family: 45 }
  },
  {
    id: 'promotion_day',
    name: 'Big Opportunity',
    description: 'Promotion interview!',
    storyText: 'Interview at 2PM. Kids have recital at 3PM. Can\'t miss either.',
    energyModifier: 0.9, // 90% energy
    workItemChance: 0.65, // 65% work items
    essentialItemChance: 0.2, // 20% essential items
    tips: ['Prepare well', 'Time management', 'Both matter'],
    statModifiers: { career: 60, family: 50, stress: 55 }
  },
  {
    id: 'burnout_warning',
    name: 'Running on Empty',
    description: 'Something\'s gotta give',
    storyText: 'Third all-nighter this week. Hands shaking. Friends worried.',
    energyModifier: 0.5, // 50% energy (exhausted)
    workItemChance: 0.3, // 30% work items - need rest
    essentialItemChance: 0.5, // 50% essential items (rest, health)
    tips: ['STOP', 'Rest now', 'Ask for help'],
    statModifiers: { health: 25, stress: 80, social: 30 }
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
    scenario: DAY_SCENARIOS[Math.floor(Math.random() * 5)], // Random from first 5 easier scenarios
  },
  { 
    number: 2, 
    duration: 30, 
    spawnRate: 2200, // Spawn every 2.2 seconds (slightly slower)
    fallSpeed: 4200, // Slightly faster than round 1
    itemCount: 18, // 18 items (reduced from 20)
    startingBalanceRange: { min: -30, max: 30 }, // More imbalance
    maxSkips: 5, // Limited skips
    restItemChance: 0.15, // 15% chance of rest items
    flexibleItemChance: 0.2, // 20% chance of flexible items
    scenario: DAY_SCENARIOS[Math.floor(Math.random() * 8)], // Random from first 8 scenarios
  },
  { 
    number: 3, 
    duration: 30, 
    spawnRate: 1900, // Spawn every 1.9 seconds (slower than before)
    fallSpeed: 3800, // Moderately faster than round 2
    itemCount: 22, // 22 items (reduced from 25)
    startingBalanceRange: { min: -40, max: 40 }, // Higher imbalance
    maxSkips: 3, // Very limited skips
    restItemChance: 0.1, // 10% chance of rest items
    flexibleItemChance: 0.25, // 25% chance of flexible items
    scenario: DAY_SCENARIOS[Math.floor(Math.random() * DAY_SCENARIOS.length)], // Any scenario possible!
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